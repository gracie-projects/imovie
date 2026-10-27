import mongoose from 'mongoose';
import Review from '../models/reviewModel.js';
import Movie from '../models/movieModel.js';
import ApiError from '../utils/ApiError.js';
import { getPagination, paginated } from '../utils/pagination.js';
import { recalculateMovieRating } from '../services/ratingService.js';

export async function listMovieReviews(req, res) {
  const movieId = new mongoose.Types.ObjectId(String(req.params.movieId));
  const filter = { movie: movieId, status: 'approved' };
  const pageInfo = getPagination(req.query, { defaultLimit: 10, maxLimit: 50 });
  const [items, total, distribution, myReview] = await Promise.all([
    Review.find(filter).sort({ createdAt: -1 }).skip(pageInfo.skip).limit(pageInfo.limit).populate('user', 'username').lean(),
    Review.countDocuments(filter),
    Review.aggregate([{ $match: filter }, { $group: { _id: '$rating', count: { $sum: 1 } } }]),
    req.user ? Review.findOne({ movie: movieId, user: req.user._id }).lean() : null,
  ]);
  res.json({
    success: true,
    ...paginated(items, total, pageInfo),
    distribution: Object.fromEntries([1, 2, 3, 4, 5].map((r) => [r, distribution.find((d) => d._id === r)?.count || 0])),
    myReview,
  });
}

export async function createReview(req, res) {
  const { movieId, rating, comment = '' } = req.body;
  const movie = await Movie.findById(movieId).select('status');
  if (!movie) throw ApiError.notFound('Movie not found');
  if (movie.status === 'coming-soon') throw ApiError.badRequest('You can review this movie once it is released');
  const exists = await Review.exists({ movie: movie._id, user: req.user._id });
  if (exists) throw ApiError.conflict('You have already reviewed this movie. Edit your existing review instead.');
  const review = await Review.create({ movie: movie._id, user: req.user._id, rating, comment });
  await recalculateMovieRating(movie._id);
  res.status(201).json({ success: true, review: await review.populate('user', 'username') });
}

export async function updateReview(req, res) {
  const review = await Review.findOne({ _id: req.params.id, user: req.user._id });
  if (!review) throw ApiError.notFound('Review not found');
  if (req.body.rating !== undefined) review.rating = req.body.rating;
  if (req.body.comment !== undefined) review.comment = req.body.comment;
  // A rejected review stays hidden after editing until an administrator approves it again.
  await review.save();
  await recalculateMovieRating(review.movie);
  res.json({ success: true, review: await review.populate('user', 'username') });
}

export async function deleteReview(req, res) {
  const filter = req.user.role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, user: req.user._id };
  const review = await Review.findOneAndDelete(filter);
  if (!review) throw ApiError.notFound('Review not found');
  await recalculateMovieRating(review.movie);
  res.json({ success: true, message: 'Review deleted' });
}
