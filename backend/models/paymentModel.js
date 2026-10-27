import mongoose from 'mongoose';

/**
 * A payment attempt for a booking. Only the server changes `status`, after the payment
 * provider (currently the demo provider) reports the outcome. No card data is ever stored.
 */
const paymentSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: String, required: true, default: 'demo' },
    isDemo: { type: Boolean, required: true, default: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['created', 'succeeded', 'failed', 'refunded'], default: 'created' },
    providerOrderId: { type: String, required: true, unique: true },
    providerPaymentId: { type: String, default: '' },
    method: { type: String, enum: ['upi', 'card', 'netbanking', 'wallet', ''], default: '' },
    failureReason: { type: String, default: '' },
    paidAt: Date,
    refundedAt: Date,
  },
  { timestamps: true }
);

paymentSchema.index({ booking: 1, createdAt: -1 });
paymentSchema.index({ status: 1, isDemo: 1 });

export default mongoose.model('Payment', paymentSchema);
