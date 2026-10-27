import Theatre from '../models/theatreModel.js';
import Show from '../models/showModel.js';
import Booking from '../models/bookingModel.js';
import SeatLock from '../models/seatLockModel.js';
import ApiError from '../utils/ApiError.js';
import { getPagination, paginated, escapeRegex } from '../utils/pagination.js';
import { validateLayout, buildSeatMap } from '../utils/seatLayout.js';

const THEATRE_FIELDS = ['theatreName', 'city', 'address', 'screens', 'amenities', 'seatLayout', 'isActive'];

const pick = (body) =>
  Object.fromEntries(THEATRE_FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, body[f]]));

function assertLayout(layout) {
  if (layout === undefined) return;
  const errors = validateLayout(layout);
  if (errors.length) throw ApiError.badRequest(errors[0], errors.map((message) => ({ field: 'seatLayout', message })));
}

export async function listTheatres(req, res) {
  const { q, city, includeInactive } = req.query;
  const filter = {};
  if (!(includeInactive === 'true' && req.user?.role === 'admin')) filter.isActive = true;
  if (city) filter.city = String(city);
  if (q) {
    const rx = new RegExp(escapeRegex(String(q).trim()), 'i');
    filter.$or = [{ theatreName: rx }, { city: rx }, { address: rx }];
  }
  const pageInfo = getPagination(req.query, { defaultLimit: 20, maxLimit: 100 });
  const [items, total] = await Promise.all([
    Theatre.find(filter).sort({ city: 1, theatreName: 1 }).skip(pageInfo.skip).limit(pageInfo.limit),
    Theatre.countDocuments(filter),
  ]);
  res.json({ success: true, ...paginated(items, total, pageInfo) });
}

export async function listCities(_req, res) {
  const cities = await Theatre.distinct('city', { isActive: true });
  res.json({ success: true, cities: cities.sort() });
}

export async function getTheatre(req, res) {
  const theatre = await Theatre.findById(req.params.id);
  if (!theatre || (!theatre.isActive && req.user?.role !== 'admin')) throw ApiError.notFound('Theatre not found');
  res.json({ success: true, theatre, seatMap: buildSeatMap(theatre.seatLayout.toObject()) });
}

export async function createTheatre(req, res) {
  const data = pick(req.body);
  assertLayout(data.seatLayout);
  const theatre = await Theatre.create(data);
  res.status(201).json({ success: true, theatre });
}

export async function updateTheatre(req, res) {
  const theatre = await Theatre.findById(req.params.id);
  if (!theatre) throw ApiError.notFound('Theatre not found');
  const data = pick(req.body);
  assertLayout(data.seatLayout);
  theatre.set(data);
  await theatre.save();
  // Existing shows keep their own layout snapshot; only new shows use the updated layout.
  res.json({ success: true, theatre });
}

export async function deleteTheatre(req, res) {
  const theatre = await Theatre.findById(req.params.id);
  if (!theatre) throw ApiError.notFound('Theatre not found');
  const activeBookings = await Booking.countDocuments({ theatre: theatre._id, status: { $in: ['confirmed', 'pending'] } });
  if (activeBookings) {
    throw ApiError.conflict(
      `This theatre has ${activeBookings} active booking(s) and cannot be deleted. Mark it inactive instead.`
    );
  }
  const showIds = (await Show.find({ theatre: theatre._id }).select('_id').lean()).map((s) => s._id);
  await Promise.all([SeatLock.deleteMany({ show: { $in: showIds } }), Show.deleteMany({ theatre: theatre._id })]);
  await theatre.deleteOne();
  res.json({ success: true, message: 'Theatre deleted' });
}
