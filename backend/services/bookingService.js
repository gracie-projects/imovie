import mongoose from 'mongoose';
import env from '../config/env.js';
import Booking from '../models/bookingModel.js';
import Payment from '../models/paymentModel.js';
import SeatLock from '../models/seatLockModel.js';
import Show from '../models/showModel.js';
import ApiError from '../utils/ApiError.js';
import { generateBookingReference } from '../utils/reference.js';
import { priceSeats } from './seatService.js';
import { getPaymentProvider } from './payment/index.js';

/**
 * Turns a valid, unexpired seat hold into a booking that is awaiting payment.
 * The booking re-uses the hold id as its _id, so retrying the request is idempotent.
 */
export async function createBookingFromHold({ holdId, userId }) {
  if (!mongoose.isValidObjectId(holdId)) throw ApiError.badRequest('Invalid hold id');

  const existing = await Booking.findOne({ _id: holdId, user: userId });
  if (existing) return existing;

  const now = new Date();
  const locks = await SeatLock.find({ booking: holdId, user: userId, status: 'held' }).lean();
  if (!locks.length) throw ApiError.gone('Your seat hold was not found or has expired. Please select seats again.');
  if (locks.some((lock) => lock.expiresAt <= now)) {
    await SeatLock.deleteMany({ booking: holdId, status: 'held' });
    throw ApiError.gone('Your seat hold has expired. Please select seats again.');
  }

  const show = await Show.findById(locks[0].show).populate('movie').populate('theatre');
  if (!show || !show.movie || !show.theatre) throw ApiError.notFound('Show not found');
  if (show.startsAt <= now) throw ApiError.conflict('This show has already started');

  // Re-price on the server from the show's layout snapshot.
  const { seats, seatDetails, price } = priceSeats(
    show,
    locks.map((lock) => lock.seatId)
  );
  const holdExpiresAt = new Date(Math.min(...locks.map((lock) => lock.expiresAt.getTime())));

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await Booking.create({
        _id: holdId,
        bookingReference: generateBookingReference(),
        user: userId,
        show: show._id,
        movie: show.movie._id,
        theatre: show.theatre._id,
        seats: seats.sort(compareSeats),
        seatDetails: seatDetails.sort((a, b) => compareSeats(a.seatId, b.seatId)),
        ticketCount: seats.length,
        subtotal: price.subtotal,
        convenienceFee: price.convenienceFee,
        taxes: price.taxes,
        totalAmount: price.total,
        isDemoPayment: getPaymentProvider().isDemo,
        showStartsAt: show.startsAt,
        holdExpiresAt,
        snapshot: {
          movieName: show.movie.movieName,
          posterUrl: show.movie.posterUrl,
          certification: show.movie.certification,
          durationMins: show.movie.durationMins,
          theatreName: show.theatre.theatreName,
          city: show.theatre.city,
          address: show.theatre.address,
          screen: show.screen,
          format: show.format,
          language: show.language || show.movie.language,
        },
      });
    } catch (err) {
      if (err.code !== 11000) throw err;
      // Same _id: a parallel retry already created this booking.
      if (err.keyPattern?._id) return Booking.findOne({ _id: holdId, user: userId });
      // Otherwise the random reference collided; try a new one.
    }
  }
  throw new ApiError(500, 'Could not generate a booking reference');
}

export function compareSeats(a, b) {
  return a[0] === b[0] ? Number(a.slice(1)) - Number(b.slice(1)) : a.localeCompare(b);
}

/**
 * Called only after the payment provider reports a successful payment.
 *
 * Step 1 atomically moves the booking from "pending" to "confirmed" provided its hold is still valid.
 * Step 2 converts exactly this booking's unexpired holds into permanent "booked" locks.
 * If step 2 does not cover every seat (a hold expired and another user took the seat in between),
 * the compensating step releases the seats and marks the booking expired so the payment is refunded.
 */
export async function confirmBooking(bookingId, payment) {
  const now = new Date();
  const booking = await Booking.findOneAndUpdate(
    { _id: bookingId, status: 'pending', holdExpiresAt: { $gt: now } },
    {
      $set: {
        status: 'confirmed',
        paymentStatus: 'paid',
        payment: payment._id,
        paymentReference: payment.providerPaymentId,
        isDemoPayment: payment.isDemo,
        confirmedAt: now,
      },
    },
    { new: true }
  );
  if (!booking) return { ok: false, reason: 'The seat hold expired before the payment completed.' };

  const { modifiedCount } = await SeatLock.updateMany(
    { booking: booking._id, status: 'held', expiresAt: { $gt: now } },
    { $set: { status: 'booked', expiresAt: null } }
  );

  if (modifiedCount !== booking.seats.length) {
    await SeatLock.deleteMany({ booking: booking._id });
    await Booking.updateOne(
      { _id: booking._id },
      {
        $set: {
          status: 'expired',
          paymentStatus: 'refunded',
          cancellationReason: 'Seat hold expired during payment; amount refunded',
        },
        $unset: { confirmedAt: 1 },
      }
    );
    return { ok: false, reason: 'Some seats were released before the payment completed.' };
  }
  return { ok: true, booking };
}

/** Payment failed or was abandoned: free the seats right away. */
export async function failBooking(bookingId, reason) {
  await Booking.updateOne(
    { _id: bookingId, status: 'pending' },
    { $set: { status: 'failed', paymentStatus: 'failed', cancellationReason: reason } }
  );
  await SeatLock.deleteMany({ booking: bookingId, status: 'held' });
}

/**
 * Users may cancel a confirmed booking until CANCELLATION_CUTOFF_HOURS before the show,
 * or abandon a pending one at any time. Administrators may cancel at any time.
 */
export async function cancelBooking({ bookingId, user, reason }) {
  const isAdmin = user.role === 'admin';
  const filter = isAdmin ? { _id: bookingId } : { _id: bookingId, user: user._id };
  const booking = await Booking.findOne(filter);
  if (!booking) throw ApiError.notFound('Booking not found');

  if (booking.status === 'pending') {
    await Booking.updateOne(
      { _id: booking._id, status: 'pending' },
      { $set: { status: 'cancelled', cancelledAt: new Date(), cancellationReason: reason || 'Cancelled before payment' } }
    );
    await SeatLock.deleteMany({ booking: booking._id });
    await Payment.updateMany(
      { booking: booking._id, status: 'created' },
      { $set: { status: 'failed', failureReason: 'Booking cancelled before payment' } }
    );
    return Booking.findById(booking._id);
  }

  if (booking.status !== 'confirmed') throw ApiError.conflict(`A ${booking.status} booking cannot be cancelled`);

  const cutoff = new Date(booking.showStartsAt.getTime() - env.CANCELLATION_CUTOFF_HOURS * 3600 * 1000);
  if (!isAdmin && new Date() > cutoff) {
    throw ApiError.conflict(
      `Bookings can only be cancelled up to ${env.CANCELLATION_CUTOFF_HOURS} hours before the show starts`
    );
  }

  const cancelled = await Booking.findOneAndUpdate(
    { _id: booking._id, status: 'confirmed' },
    {
      $set: {
        status: 'cancelled',
        paymentStatus: 'refunded',
        cancelledAt: new Date(),
        cancellationReason: reason || (isAdmin ? 'Cancelled by administrator' : 'Cancelled by customer'),
      },
    },
    { new: true }
  );
  if (!cancelled) throw ApiError.conflict('This booking was already updated. Please refresh.');

  await SeatLock.deleteMany({ booking: booking._id });

  if (cancelled.payment) {
    const payment = await Payment.findById(cancelled.payment);
    if (payment && payment.status === 'succeeded') {
      await getPaymentProvider(payment.provider).refund(payment);
      payment.status = 'refunded';
      payment.refundedAt = new Date();
      await payment.save();
    }
  }
  return cancelled;
}

/**
 * Marks unpaid bookings whose hold has run out as expired and deletes stale holds.
 * This is housekeeping only: availability checks already ignore expired holds.
 */
export async function expireStaleHolds() {
  const now = new Date();
  const stale = await Booking.find({ status: 'pending', holdExpiresAt: { $lte: now } }).select('_id').lean();
  const ids = stale.map((b) => b._id);
  if (ids.length) {
    await Booking.updateMany(
      { _id: { $in: ids }, status: 'pending' },
      { $set: { status: 'expired', cancellationReason: 'Seat hold expired before payment' } }
    );
    await Payment.updateMany(
      { booking: { $in: ids }, status: 'created' },
      { $set: { status: 'failed', failureReason: 'Seat hold expired' } }
    );
  }
  const { deletedCount } = await SeatLock.deleteMany({ status: 'held', expiresAt: { $lte: now } });
  return { expiredBookings: ids.length, releasedSeats: deletedCount };
}
