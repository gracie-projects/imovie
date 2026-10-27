import mongoose from 'mongoose';
import Show, { SHOW_FORMATS } from '../models/showModel.js';
import Movie from '../models/movieModel.js';
import Theatre from '../models/theatreModel.js';
import Booking from '../models/bookingModel.js';
import SeatLock from '../models/seatLockModel.js';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import { getPagination, paginated } from '../utils/pagination.js';
import { totalSeats, SECTION_ORDER } from '../utils/seatLayout.js';
import { getSeatStatus, describeLayout } from '../services/seatService.js';

const MOVIE_PUBLIC = 'movieName slug posterUrl certification durationMins language genres status';
const THEATRE_PUBLIC = 'theatreName city address amenities isActive';
const CLEANING_BUFFER_MINS = 20;

/** Number of seats that are booked or currently held, per show. */
async function occupiedCounts(showIds) {
  const rows = await SeatLock.aggregate([
    {
      $match: {
        show: { $in: showIds },
        $or: [{ status: 'booked' }, { status: 'held', expiresAt: { $gt: new Date() } }],
      },
    },
    { $group: { _id: '$show', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [r._id.toString(), r.count]));
}

function withAvailability(show, occupied) {
  const capacity = totalSeats(show.seatLayout);
  const prices = SECTION_ORDER.filter((k) => show.seatLayout[k].rows > 0).map((k) => show.seatLayout[k].price);
  return {
    ...show,
    seatsTotal: capacity,
    seatsAvailable: capacity - (occupied.get(show._id.toString()) || 0),
    priceFrom: Math.min(...prices),
  };
}

export async function listShows(req, res) {
  const { movie, theatre, from, to, includePast, includeInactive } = req.query;
  const isAdmin = req.user?.role === 'admin';
  const filter = {};
  if (movie) {
    if (!mongoose.isValidObjectId(movie)) throw ApiError.badRequest('Invalid movie id');
    filter.movie = movie;
  }
  if (theatre) {
    if (!mongoose.isValidObjectId(theatre)) throw ApiError.badRequest('Invalid theatre id');
    filter.theatre = theatre;
  }
  if (!(isAdmin && includeInactive === 'true')) filter.isActive = true;

  const range = {};
  if (from) range.$gte = new Date(String(from));
  if (to) range.$lt = new Date(String(to));
  if (!(isAdmin && includePast === 'true')) range.$gt = new Date();
  if (Object.values(range).some((d) => Number.isNaN(d.getTime()))) throw ApiError.badRequest('Invalid date range');
  if (Object.keys(range).length) filter.startsAt = range;

  const pageInfo = getPagination(req.query, { defaultLimit: 100, maxLimit: 200 });
  const [shows, total] = await Promise.all([
    Show.find(filter)
      .sort({ startsAt: 1 })
      .skip(pageInfo.skip)
      .limit(pageInfo.limit)
      .populate('movie', MOVIE_PUBLIC)
      .populate('theatre', THEATRE_PUBLIC)
      .lean(),
    Show.countDocuments(filter),
  ]);

  // Hide shows whose theatre is inactive from the public listing.
  const visible = isAdmin ? shows : shows.filter((s) => s.movie && s.theatre?.isActive);
  const occupied = await occupiedCounts(visible.map((s) => s._id));
  res.json({ success: true, ...paginated(visible.map((s) => withAvailability(s, occupied)), total, pageInfo) });
}

export async function getShow(req, res) {
  const show = await Show.findById(req.params.id)
    .populate('movie', MOVIE_PUBLIC)
    .populate('theatre', THEATRE_PUBLIC)
    .lean();
  if (!show || !show.movie || !show.theatre) throw ApiError.notFound('Show not found');
  const occupied = await occupiedCounts([show._id]);
  res.json({ success: true, show: withAvailability(show, occupied) });
}

export async function getShowSeats(req, res) {
  const show = await Show.findById(req.params.id)
    .populate('movie', MOVIE_PUBLIC)
    .populate('theatre', THEATRE_PUBLIC);
  if (!show || !show.movie || !show.theatre) throw ApiError.notFound('Show not found');
  const status = await getSeatStatus(show._id, req.user?._id);
  const bookable = show.isActive && show.theatre.isActive && show.startsAt > new Date();
  res.json({
    success: true,
    show: {
      _id: show._id,
      startsAt: show.startsAt,
      screen: show.screen,
      format: show.format,
      language: show.language,
      movie: show.movie,
      theatre: show.theatre,
      bookable,
    },
    sections: describeLayout(show),
    ...status,
    rules: { maxSeatsPerBooking: env.MAX_SEATS_PER_BOOKING, holdMinutes: env.SEAT_HOLD_MINUTES },
    serverTime: new Date(),
  });
}

/** Builds the show's own layout snapshot from the theatre layout plus optional price overrides. */
function snapshotLayout(theatre, prices = {}) {
  const layout = theatre.seatLayout.toObject();
  for (const key of SECTION_ORDER) {
    if (prices[key] !== undefined && prices[key] !== null && prices[key] !== '') layout[key].price = Number(prices[key]);
  }
  return layout;
}

async function assertNoClash({ theatreId, screen, startsAt, durationMins, excludeId }) {
  const windowStart = new Date(startsAt.getTime() - 6 * 3600 * 1000);
  const windowEnd = new Date(startsAt.getTime() + (durationMins + CLEANING_BUFFER_MINS) * 60 * 1000);
  const nearby = await Show.find({
    theatre: theatreId,
    screen,
    startsAt: { $gte: windowStart, $lt: windowEnd },
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  }).populate('movie', 'durationMins movieName');
  const end = windowEnd.getTime();
  for (const other of nearby) {
    const otherStart = other.startsAt.getTime();
    const otherEnd = otherStart + ((other.movie?.durationMins || 180) + CLEANING_BUFFER_MINS) * 60 * 1000;
    if (otherStart < end && startsAt.getTime() < otherEnd) {
      throw ApiError.conflict(
        `${screen} is already in use at that time (${other.movie?.movieName || 'another show'} at ${other.startsAt.toISOString()})`
      );
    }
  }
}

export async function createShow(req, res) {
  const { movie: movieId, theatre: theatreId, screen = 'Screen 1', startsAt, format = '2D', language, prices } = req.body;
  const [movie, theatre] = await Promise.all([Movie.findById(movieId), Theatre.findById(theatreId)]);
  if (!movie) throw ApiError.badRequest('Selected movie does not exist');
  if (!theatre) throw ApiError.badRequest('Selected theatre does not exist');
  if (!theatre.screens.includes(screen)) throw ApiError.badRequest(`${theatre.theatreName} has no screen named "${screen}"`);
  const start = new Date(startsAt);
  if (start <= new Date()) throw ApiError.badRequest('Show time must be in the future');

  await assertNoClash({ theatreId: theatre._id, screen, startsAt: start, durationMins: movie.durationMins });

  const show = await Show.create({
    movie: movie._id,
    theatre: theatre._id,
    screen,
    startsAt: start,
    format,
    language: language || movie.language,
    seatLayout: snapshotLayout(theatre, prices),
  });
  res.status(201).json({ success: true, show });
}

export async function updateShow(req, res) {
  const show = await Show.findById(req.params.id).populate('movie', 'durationMins').populate('theatre');
  if (!show) throw ApiError.notFound('Show not found');
  const { screen, startsAt, format, language, isActive, prices } = req.body;

  const activeBookings = await Booking.countDocuments({ show: show._id, status: { $in: ['confirmed', 'pending'] } });
  const timeChanged = startsAt !== undefined && new Date(startsAt).getTime() !== show.startsAt.getTime();
  const screenChanged = screen !== undefined && screen !== show.screen;
  if (activeBookings && (timeChanged || screenChanged)) {
    throw ApiError.conflict('This show already has bookings, so its time and screen cannot be changed. Deactivate it instead.');
  }
  if (screenChanged && !show.theatre.screens.includes(screen)) throw ApiError.badRequest(`Unknown screen "${screen}"`);
  if (timeChanged && new Date(startsAt) <= new Date()) throw ApiError.badRequest('Show time must be in the future');

  if (timeChanged || screenChanged) {
    await assertNoClash({
      theatreId: show.theatre._id,
      screen: screen ?? show.screen,
      startsAt: timeChanged ? new Date(startsAt) : show.startsAt,
      durationMins: show.movie?.durationMins || 180,
      excludeId: show._id,
    });
  }

  if (timeChanged) show.startsAt = new Date(startsAt);
  if (screenChanged) show.screen = screen;
  if (format !== undefined) show.format = format;
  if (language !== undefined) show.language = language;
  if (isActive !== undefined) show.isActive = isActive;
  if (prices) {
    // New prices apply to future bookings only; existing bookings keep the amount they paid.
    for (const key of SECTION_ORDER) {
      if (prices[key] !== undefined && prices[key] !== null && prices[key] !== '') show.seatLayout[key].price = Number(prices[key]);
    }
  }
  await show.save();
  res.json({ success: true, show });
}

export async function deleteShow(req, res) {
  const show = await Show.findById(req.params.id);
  if (!show) throw ApiError.notFound('Show not found');
  const activeBookings = await Booking.countDocuments({ show: show._id, status: { $in: ['confirmed', 'pending'] } });
  if (activeBookings) {
    throw ApiError.conflict(`This show has ${activeBookings} active booking(s). Deactivate it instead of deleting.`);
  }
  await SeatLock.deleteMany({ show: show._id });
  await show.deleteOne();
  res.json({ success: true, message: 'Show deleted' });
}

export const showFormats = (_req, res) => res.json({ success: true, formats: SHOW_FORMATS });
