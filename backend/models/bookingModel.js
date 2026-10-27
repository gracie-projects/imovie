import mongoose from 'mongoose';

export const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled', 'expired', 'failed'];
export const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];

const seatDetailSchema = new mongoose.Schema(
  {
    seatId: { type: String, required: true },
    section: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    bookingReference: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    show: { type: mongoose.Schema.Types.ObjectId, ref: 'Show', required: true },
    movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
    theatre: { type: mongoose.Schema.Types.ObjectId, ref: 'Theatre', required: true },
    seats: { type: [String], required: true },
    seatDetails: { type: [seatDetailSchema], required: true },
    ticketCount: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 },
    convenienceFee: { type: Number, required: true, min: 0 },
    taxes: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: BOOKING_STATUSES, default: 'pending' },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'pending' },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
    paymentReference: { type: String, default: '' },
    isDemoPayment: { type: Boolean, default: true },
    showStartsAt: { type: Date, required: true },
    holdExpiresAt: { type: Date, required: true },
    confirmedAt: Date,
    cancelledAt: Date,
    cancellationReason: { type: String, maxlength: 200 },
    // Copy of the display data, so a ticket stays readable even if a movie or theatre is edited later.
    snapshot: {
      movieName: String,
      posterUrl: String,
      certification: String,
      durationMins: Number,
      theatreName: String,
      city: String,
      address: String,
      screen: String,
      format: String,
      language: String,
    },
  },
  { timestamps: true }
);

bookingSchema.index({ user: 1, showStartsAt: -1 });
bookingSchema.index({ status: 1, holdExpiresAt: 1 });
bookingSchema.index({ show: 1, status: 1 });
bookingSchema.index({ createdAt: -1 });

export default mongoose.model('Booking', bookingSchema);
