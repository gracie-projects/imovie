import mongoose from 'mongoose';
import env from '../config/env.js';
import SeatLock from '../models/seatLockModel.js';
import Show from '../models/showModel.js';
import Booking from '../models/bookingModel.js';
import Payment from '../models/paymentModel.js';
import ApiError from '../utils/ApiError.js';
import { buildSeatMap, seatIndex } from '../utils/seatLayout.js';
import { calculatePrice } from '../utils/pricing.js';

const SEAT_ID = /^[A-Z][1-9][0-9]?$/;

/** Loads a show that can still be booked, or throws a clear error. */
export async function getBookableShow(showId) {
  if (!mongoose.isValidObjectId(showId)) throw ApiError.badRequest('Invalid show id');
  const show = await Show.findById(showId).populate('movie').populate('theatre');
  if (!show || !show.movie || !show.theatre) throw ApiError.notFound('Show not found');
  if (!show.isActive || !show.theatre.isActive) throw ApiError.conflict('This show is no longer available for booking');
  if (show.startsAt <= new Date()) throw ApiError.conflict('This show has already started');
  return show;
}

/**
 * Checks the requested seat ids against the show's layout and returns per-seat pricing.
 * Prices come from the server-side layout snapshot only, never from the client.
 */
export function priceSeats(show, seats) {
  if (!Array.isArray(seats) || seats.length === 0) throw ApiError.badRequest('Select at least one seat');
  const unique = [...new Set(seats.map((s) => String(s).trim().toUpperCase()))];
  if (unique.length !== seats.length) throw ApiError.badRequest('Duplicate seats in request');
  if (unique.length > env.MAX_SEATS_PER_BOOKING)
    throw ApiError.badRequest(`You can book at most ${env.MAX_SEATS_PER_BOOKING} seats at a time`);

  const index = seatIndex(show.seatLayout.toObject ? show.seatLayout.toObject() : show.seatLayout);
  const invalid = unique.filter((s) => !SEAT_ID.test(s) || !index.has(s));
  if (invalid.length) throw ApiError.badRequest(`Invalid seat(s) for this show: ${invalid.join(', ')}`);

  const seatDetails = unique.map((seatId) => ({ seatId, ...index.get(seatId) }));
  return { seats: unique, seatDetails, price: calculatePrice(seatDetails.map((s) => s.price)) };
}

/** Current occupancy of a show. A hold only counts while it has not expired. */
export async function getSeatStatus(showId, userId) {
  const now = new Date();
  const locks = await SeatLock.find({
    show: showId,
    $or: [{ status: 'booked' }, { status: 'held', expiresAt: { $gt: now } }],
  })
    .select('seatId status user')
    .lean();

  const booked = [];
  const held = [];
  const heldByMe = [];
  for (const lock of locks) {
    if (lock.status === 'booked') booked.push(lock.seatId);
    else if (userId && lock.user.equals(userId)) heldByMe.push(lock.seatId);
    else held.push(lock.seatId);
  }
  return { booked, held, heldByMe };
}

export function describeLayout(show) {
  const layout = show.seatLayout.toObject ? show.seatLayout.toObject() : show.seatLayout;
  return buildSeatMap(layout);
}

/**
 * Drops any earlier unpaid selection this user made for the same show, so that going back to the
 * seat map and choosing again never leaves orphaned holds behind.
 */
async function releaseUserHoldsForShow(showId, userId) {
  const pending = await Booking.find({ show: showId, user: userId, status: 'pending' }).select('_id').lean();
  const ids = pending.map((b) => b._id);
  if (ids.length) {
    await Booking.updateMany(
      { _id: { $in: ids }, status: 'pending' },
      { $set: { status: 'cancelled', cancelledAt: new Date(), cancellationReason: 'Replaced by a new seat selection' } }
    );
    await Payment.updateMany(
      { booking: { $in: ids }, status: 'created' },
      { $set: { status: 'failed', failureReason: 'Booking was replaced by a new seat selection' } }
    );
  }
  await SeatLock.deleteMany({ show: showId, user: userId, status: 'held' });
}

/**
 * Atomically places a temporary hold on every requested seat, or on none of them.
 *
 * 1. Insert one SeatLock per seat. The unique (show, seatId) index rejects seats that are
 *    already locked by anyone, even when two requests arrive at the same instant.
 * 2. For seats that were rejected, try to take over the lock only if it is an *expired* hold
 *    (a single conditional findOneAndUpdate, so only one request can win it).
 * 3. If any seat is still unavailable, delete the locks acquired in this attempt and respond 409.
 */
export async function holdSeats({ showId, seats, userId }) {
  const show = await getBookableShow(showId);
  const priced = priceSeats(show, seats);

  await releaseUserHoldsForShow(show._id, userId);

  const holdId = new mongoose.Types.ObjectId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + env.SEAT_HOLD_MINUTES * 60 * 1000);
  const lockFields = { show: show._id, status: 'held', user: userId, booking: holdId, expiresAt };

  try {
    await SeatLock.insertMany(
      priced.seats.map((seatId) => ({ ...lockFields, seatId })),
      { ordered: false }
    );
  } catch (err) {
    const duplicateOnly = err.code === 11000 || (err.writeErrors || []).every((e) => (e.code ?? e.err?.code) === 11000);
    if (!duplicateOnly) {
      await SeatLock.deleteMany({ booking: holdId });
      throw err;
    }
  }

  const acquired = new Set(
    (await SeatLock.find({ booking: holdId }).select('seatId').lean()).map((lock) => lock.seatId)
  );

  const unavailable = [];
  for (const seatId of priced.seats) {
    if (acquired.has(seatId)) continue;
    const takenOver = await SeatLock.findOneAndUpdate(
      { show: show._id, seatId, status: 'held', expiresAt: { $lte: now } },
      { $set: lockFields },
      { new: true }
    );
    if (takenOver) acquired.add(seatId);
    else unavailable.push(seatId);
  }

  if (unavailable.length) {
    await SeatLock.deleteMany({ booking: holdId });
    throw ApiError.conflict(
      `Sorry, ${unavailable.length === 1 ? 'seat' : 'seats'} ${unavailable.join(', ')} ${
        unavailable.length === 1 ? 'was' : 'were'
      } just taken by someone else. Please choose different seats.`,
      { unavailableSeats: unavailable }
    );
  }

  return { holdId, expiresAt, show, ...priced };
}

export async function releaseHold({ holdId, userId }) {
  const booking = await Booking.findOne({ _id: holdId, user: userId }).select('status').lean();
  if (booking && booking.status !== 'pending') return 0;
  if (booking) {
    await Booking.updateOne(
      { _id: holdId, status: 'pending' },
      { $set: { status: 'cancelled', cancelledAt: new Date(), cancellationReason: 'Seat selection released' } }
    );
  }
  const { deletedCount } = await SeatLock.deleteMany({ booking: holdId, user: userId, status: 'held' });
  return deletedCount;
}
