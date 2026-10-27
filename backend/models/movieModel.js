import mongoose from 'mongoose';

export const GENRES = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Drama', 'Family', 'Fantasy',
  'Horror', 'Musical', 'Mystery', 'Romance', 'Sci-Fi', 'Sports', 'Thriller',
];
export const CERTIFICATIONS = ['U', 'U/A 7+', 'U/A 13+', 'U/A 16+', 'A'];
export const MOVIE_STATUSES = ['now-showing', 'coming-soon', 'archived'];

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const movieSchema = new mongoose.Schema(
  {
    movieName: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 120 },
    slug: { type: String, unique: true, index: true },
    description: { type: String, required: [true, 'Description is required'], trim: true, maxlength: 2000 },
    genres: {
      type: [{ type: String, enum: GENRES }],
      validate: [(v) => v.length > 0, 'At least one genre is required'],
    },
    language: { type: String, required: true, trim: true, maxlength: 40 },
    durationMins: { type: Number, required: true, min: 30, max: 300 },
    releaseDate: { type: Date, required: true },
    posterUrl: { type: String, trim: true, maxlength: 500, default: '' },
    backdropUrl: { type: String, trim: true, maxlength: 500, default: '' },
    trailerUrl: { type: String, trim: true, maxlength: 500, default: '' },
    certification: { type: String, enum: CERTIFICATIONS, default: 'U/A 13+' },
    cast: { type: [String], default: [] },
    director: { type: String, trim: true, maxlength: 80, default: '' },
    status: { type: String, enum: MOVIE_STATUSES, default: 'now-showing' },
    featured: { type: Boolean, default: false },
    // Derived from approved reviews by services/ratingService.js
    avgRating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

movieSchema.index({ status: 1, releaseDate: -1 });
movieSchema.index({ genres: 1 });
movieSchema.index({ language: 1 });

movieSchema.pre('validate', function setSlug() {
  if (this.isModified('movieName') || !this.slug) {
    this.slug = `${slugify(this.movieName || 'movie')}-${new Date(this.releaseDate || Date.now()).getFullYear()}`;
  }
});

export default mongoose.model('Movie', movieSchema);
