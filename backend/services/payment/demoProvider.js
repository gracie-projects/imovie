import { randomCode } from '../../utils/reference.js';

/**
 * DEMO payment provider. No money moves and no card details are collected or stored.
 *
 * It mimics the shape of a real gateway (create an order, capture it, refund it) so that a
 * real provider such as Razorpay or Stripe can be added later with the same interface, where
 * `capture` would verify the gateway's signature or webhook instead of trusting any input.
 */
const demoProvider = {
  name: 'demo',
  isDemo: true,

  async createOrder({ amount, currency }) {
    return { orderId: `demo_order_${randomCode(14)}`, amount, currency };
  },

  /**
   * In demo mode the person at the keyboard chooses whether the simulated bank approves
   * or declines, so both flows can be demonstrated. The outcome only ever affects payments
   * flagged isDemo, which are excluded from revenue figures.
   */
  async capture({ outcome }) {
    if (outcome === 'success') return { success: true, paymentId: `demo_pay_${randomCode(14)}` };
    return { success: false, failureReason: 'Payment declined by the bank (simulated)' };
  },

  async refund(payment) {
    return { refundId: `demo_rfnd_${randomCode(12)}`, amount: payment.amount };
  },
};

export default demoProvider;
