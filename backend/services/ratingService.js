import Movie from '../models/movieModel.js';
import Review from '../models/reviewModel.js';

/** Recomputes a movie's average rating and review count from its approved reviews. */
export async function recalculateMovieRating(movieId) {
  const [stats] = await Review.aggregate([
    { $match: { movie: movieId, status: 'approved' } },
    { $group: { _id: '$movie', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await Movie.updateOne(
    { _id: movieId },
    { $set: { avgRating: stats ? Math.round(stats.avg * 10) / 10 : 0, reviewCount: stats?.count || 0 } }
  );
}
