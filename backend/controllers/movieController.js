import mongoose from 'mongoose';
import Movie, { GENRES, CERTIFICATIONS, MOVIE_STATUSES } from '../models/movieModel.js';
import Show from '../models/showModel.js';
import Booking from '../models/bookingModel.js';
import Favorite from '../models/favoriteModel.js';
import Review from '../models/reviewModel.js';
import SeatLock from '../models/seatLockModel.js';
import ApiError from '../utils/ApiError.js';
import { getPagination, paginated, escapeRegex } from '../utils/pagination.js';

const SORTS = {
  newest: { releaseDate: -1, _id: 1 },
  oldest: { releaseDate: 1, _id: 1 },
  rating: { avgRating: -1, reviewCount: -1, _id: 1 },
  title: { movieName: 1, _id: 1 },
  duration: { durationMins: 1, _id: 1 },
};

export const MOVIE_FIELDS = [
  'movieName', 'description', 'genres', 'language', 'durationMins', 'releaseDate', 'posterUrl',
  'backdropUrl', 'trailerUrl', 'certification', 'cast', 'director', 'status', 'featured',
];

const pick = (body, fields) =>
  Object.fromEntries(fields.filter((f) => body[f] !== undefined).map((f) => [f, body[f]]));

export async function listMovies(req, res) {
  const { q, genre, language, status, featured, sort = 'newest' } = req.query;
  const filter = {};
  if (q) {
    const rx = new RegExp(escapeRegex(String(q).trim()), 'i');
    filter.$or = [{ movieName: rx }, { cast: rx }, { director: rx }];
  }
  if (genre) filter.genres = String(genre);
  if (language) filter.language = String(language);
  if (status && status !== 'all') filter.status = String(status);
  else if (!status) filter.status = { $ne: 'archived' };
  if (featured === 'true') filter.featured = true;

  const pageInfo = getPagination(req.query, { defaultLimit: 12, maxLimit: 60 });
  const [items, total] = await Promise.all([
    Movie.find(filter).sort(SORTS[sort] || SORTS.newest).skip(pageInfo.skip).limit(pageInfo.limit).lean(),
    Movie.countDocuments(filter),
  ]);
  res.json({ success: true, ...paginated(items, total, pageInfo) });
}

export async function movieFilters(_req, res) {
  const languages = await Movie.distinct('language', { status: { $ne: 'archived' } });
  res.json({
    success: true,
    genres: GENRES,
    languages: languages.sort(),
    certifications: CERTIFICATIONS,
    statuses: MOVIE_STATUSES,
  });
}

export async function getMovie(req, res) {
  const { id } = req.params;
  const movie = mongoose.isValidObjectId(id)
    ? await Movie.findById(id).lean()
    : await Movie.findOne({ slug: String(id) }).lean();
  if (!movie) throw ApiError.notFound('Movie not found');
  res.json({ success: true, movie });
}

export async function createMovie(req, res) {
  const movie = await Movie.create(pick(req.body, MOVIE_FIELDS));
  res.status(201).json({ success: true, movie });
}

export async function updateMovie(req, res) {
  const movie = await Movie.findById(req.params.id);
  if (!movie) throw ApiError.notFound('Movie not found');
  movie.set(pick(req.body, MOVIE_FIELDS));
  await movie.save();
  res.json({ success: true, movie });
}

export async function deleteMovie(req, res) {
  const movie = await Movie.findById(req.params.id);
  if (!movie) throw ApiError.notFound('Movie not found');

  const activeBookings = await Booking.countDocuments({ movie: movie._id, status: { $in: ['confirmed', 'pending'] } });
  if (activeBookings) {
    throw ApiError.conflict(
      `This movie has ${activeBookings} active booking(s) and cannot be deleted. Set its status to "archived" instead.`
    );
  }

  const shows = await Show.find({ movie: movie._id }).select('_id').lean();
  const showIds = shows.map((s) => s._id);
  await Promise.all([
    SeatLock.deleteMany({ show: { $in: showIds } }),
    Show.deleteMany({ movie: movie._id }),
    Favorite.deleteMany({ movie: movie._id }),
    Review.deleteMany({ movie: movie._id }),
  ]);
  await movie.deleteOne();
  res.json({ success: true, message: 'Movie deleted' });
}
