import Booking from '../models/bookingModel.js';
import Payment from '../models/paymentModel.js';
import ApiError from '../utils/ApiError.js';
import { getPaymentProvider } from './payment/index.js';
import { confirmBooking, failBooking } from './bookingService.js';

const MIN_SECONDS_LEFT_TO_PAY = 15;

/** Starts a payment attempt for the user's pending booking. The amount comes from the booking. */
export async function createPaymentOrder({ bookingId, userId }) {
  const booking = await Booking.findOne({ _id: bookingId, user: userId });
  if (!booking) throw ApiError.notFound('Booking not found');
  if (booking.status === 'confirmed') throw ApiError.conflict('This booking is already paid');
  if (booking.status !== 'pending') throw ApiError.conflict(`This booking is ${booking.status}. Please select seats again.`);
  if (booking.holdExpiresAt.getTime() - Date.now() < MIN_SECONDS_LEFT_TO_PAY * 1000) {
    throw ApiError.gone('Your seat hold has expired. Please select seats again.');
  }

  const provider = getPaymentProvider();
  // Only one open attempt per booking.
  await Payment.updateMany(
    { booking: booking._id, status: 'created' },
    { $set: { status: 'failed', failureReason: 'Superseded by a new payment attempt' } }
  );
  const order = await provider.createOrder({ amount: booking.totalAmount, currency: booking.currency });
  return Payment.create({
    booking: booking._id,
    user: userId,
    provider: provider.name,
    isDemo: provider.isDemo,
    amount: booking.totalAmount,
    currency: booking.currency,
    providerOrderId: order.orderId,
  });
}

/**
 * Completes a demo payment. The client only says which simulated outcome to use; the server
 * decides everything else (amount, which booking, whether the seats are still held).
 * Processing is idempotent: a payment can leave the "created" state only once.
 */
export async function completeDemoPayment({ paymentId, userId, outcome, method }) {
  const payment = await Payment.findOne({ _id: paymentId, user: userId });
  if (!payment) throw ApiError.notFound('Payment not found');
  if (!payment.isDemo) throw ApiError.badRequest('This payment is not a demo payment');

  if (payment.status !== 'created') {
    const booking = await Booking.findById(payment.booking);
    return { payment, booking, alreadyProcessed: true };
  }

  const provider = getPaymentProvider(payment.provider);
  const result = await provider.capture({ order: payment, outcome });

  // Atomically claim the attempt so concurrent submissions cannot both process it.
  const claimed = await Payment.findOneAndUpdate(
    { _id: payment._id, status: 'created' },
    {
      $set: result.success
        ? { status: 'succeeded', providerPaymentId: result.paymentId, method, paidAt: new Date() }
        : { status: 'failed', method, failureReason: result.failureReason },
    },
    { new: true }
  );
  if (!claimed) {
    return { payment: await Payment.findById(payment._id), booking: await Booking.findById(payment.booking), alreadyProcessed: true };
  }

  if (!result.success) {
    await failBooking(claimed.booking, result.failureReason);
    return { payment: claimed, booking: await Booking.findById(claimed.booking) };
  }

  const confirmation = await confirmBooking(claimed.booking, claimed);
  if (!confirmation.ok) {
    // The money was captured but the seats could not be secured: refund immediately.
    await provider.refund(claimed);
    claimed.status = 'refunded';
    claimed.refundedAt = new Date();
    claimed.failureReason = confirmation.reason;
    await claimed.save();
    await failBooking(claimed.booking, confirmation.reason);
    await Booking.updateOne(
      { _id: claimed.booking, status: { $ne: 'confirmed' } },
      { $set: { paymentStatus: 'refunded' } }
    );
    throw ApiError.conflict(`${confirmation.reason} The demo payment has been refunded. Please select seats again.`);
  }
  return { payment: claimed, booking: confirmation.booking };
}
