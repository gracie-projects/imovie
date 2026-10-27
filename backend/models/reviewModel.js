import mongoose from 'mongoose';

export const REVIEW_STATUSES = ['approved', 'rejected'];

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000, default: '' },
    // Reviews are published immediately; administrators can reject (hide) them.
    status: { type: String, enum: REVIEW_STATUSES, default: 'approved' },
    moderationNote: { type: String, maxlength: 200, default: '' },
    moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

// One review per user per movie; users edit their existing review instead.
reviewSchema.index({ user: 1, movie: 1 }, { unique: true });
reviewSchema.index({ movie: 1, status: 1, createdAt: -1 });

export default mongoose.model('Review', reviewSchema);
