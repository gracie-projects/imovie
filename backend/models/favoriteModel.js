import mongoose from 'mongoose';

const favoriteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

favoriteSchema.index({ user: 1, movie: 1 }, { unique: true });

export default mongoose.model('Favorite', favoriteSchema);
