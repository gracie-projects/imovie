import { getPaymentProvider } from '../services/payment/index.js';
import { createPaymentOrder, completeDemoPayment } from '../services/paymentService.js';

export function paymentConfig(_req, res) {
  const provider = getPaymentProvider();
  res.json({ success: true, provider: provider.name, isDemo: provider.isDemo });
}

export async function createOrder(req, res) {
  const payment = await createPaymentOrder({ bookingId: req.body.bookingId, userId: req.user._id });
  res.status(201).json({
    success: true,
    order: {
      paymentId: payment._id,
      orderId: payment.providerOrderId,
      amount: payment.amount,
      currency: payment.currency,
      provider: payment.provider,
      isDemo: payment.isDemo,
    },
  });
}

export async function completeDemo(req, res) {
  const { outcome, method } = req.body;
  const result = await completeDemoPayment({ paymentId: req.params.id, userId: req.user._id, outcome, method });
  const succeeded = result.payment.status === 'succeeded';
  res.json({
    success: true,
    paymentStatus: result.payment.status,
    booking: result.booking,
    alreadyProcessed: Boolean(result.alreadyProcessed),
    message: succeeded ? 'Demo payment successful. Your booking is confirmed.' : 'Demo payment failed. Your seats have been released.',
  });
}
