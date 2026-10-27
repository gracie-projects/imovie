import mongoose from 'mongoose';

/**
 * One document per occupied seat of a show. The unique (show, seatId) index is what
 * makes double-booking impossible: two requests can never both insert the same seat.
 *
 *  - status "held":   a temporary hold that is only valid while expiresAt is in the future
 *  - status "booked": the seat belongs to a confirmed booking (no expiry)
 *
 * Availability is always decided by comparing expiresAt with the current time; the TTL index
 * below only tidies up stale holds and is never relied on for correctness.
 */
const seatLockSchema = new mongoose.Schema(
  {
    show: { type: mongoose.Schema.Types.ObjectId, ref: 'Show', required: true },
    seatId: { type: String, required: true },
    status: { type: String, enum: ['held', 'booked'], required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // The hold id. When a booking is created from a hold it re-uses this id as its _id.
    booking: { type: mongoose.Schema.Types.ObjectId, required: true },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

seatLockSchema.index({ show: 1, seatId: 1 }, { unique: true });
seatLockSchema.index({ booking: 1 });
// Remove abandoned holds a minute after they expire (documents with expiresAt = null are kept).
seatLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 60 });

export default mongoose.model('SeatLock', seatLockSchema);
