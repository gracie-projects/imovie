import Favorite from '../models/favoriteModel.js';
import Movie from '../models/movieModel.js';
import ApiError from '../utils/ApiError.js';

export async function listFavorites(req, res) {
  const favorites = await Favorite.find({ user: req.user._id }).sort({ createdAt: -1 }).populate('movie').lean();
  res.json({ success: true, items: favorites.filter((f) => f.movie) });
}

export async function addFavorite(req, res) {
  const movie = await Movie.exists({ _id: req.params.movieId });
  if (!movie) throw ApiError.notFound('Movie not found');
  // Upsert keeps the operation idempotent; the unique index prevents duplicates under concurrency.
  await Favorite.updateOne(
    { user: req.user._id, movie: req.params.movieId },
    { $setOnInsert: { user: req.user._id, movie: req.params.movieId } },
    { upsert: true }
  );
  res.status(201).json({ success: true, movieId: req.params.movieId, favorited: true });
}

export async function removeFavorite(req, res) {
  await Favorite.deleteOne({ user: req.user._id, movie: req.params.movieId });
  res.json({ success: true, movieId: req.params.movieId, favorited: false });
}
