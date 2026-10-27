import Booking from '../models/bookingModel.js';
import Payment from '../models/paymentModel.js';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import { getPagination, paginated } from '../utils/pagination.js';
import { holdSeats as holdSeatsService, releaseHold as releaseHoldService } from '../services/seatService.js';
import { createBookingFromHold, cancelBooking as cancelBookingService, expireStaleHolds } from '../services/bookingService.js';

export async function holdSeats(req, res) {
  const { showId, seats } = req.body;
  const hold = await holdSeatsService({ showId, seats, userId: req.user._id });
  res.status(201).json({
    success: true,
    hold: {
      holdId: hold.holdId,
      showId: hold.show._id,
      seats: hold.seats,
      seatDetails: hold.seatDetails,
      price: hold.price,
      expiresAt: hold.expiresAt,
    },
  });
}

export async function releaseHold(req, res) {
  const released = await releaseHoldService({ holdId: req.params.holdId, userId: req.user._id });
  res.json({ success: true, released });
}

export async function createBooking(req, res) {
  const booking = await createBookingFromHold({ holdId: req.body.holdId, userId: req.user._id });
  res.status(201).json({ success: true, booking });
}

export async function myBookings(req, res) {
  // Tidy up before listing so abandoned checkouts show as expired rather than pending.
  await expireStaleHolds();
  const now = new Date();
  const { type = 'all' } = req.query;
  const filter = { user: req.user._id };
  if (type === 'upcoming') {
    Object.assign(filter, { status: { $in: ['confirmed', 'pending'] }, showStartsAt: { $gte: now } });
  } else if (type === 'past') {
    filter.$or = [{ showStartsAt: { $lt: now } }, { status: { $in: ['cancelled', 'expired', 'failed'] } }];
  }
  const sort = type === 'upcoming' ? { showStartsAt: 1 } : { showStartsAt: -1 };
  const pageInfo = getPagination(req.query, { defaultLimit: 10, maxLimit: 50 });
  const [items, total] = await Promise.all([
    Booking.find(filter).sort(sort).skip(pageInfo.skip).limit(pageInfo.limit).lean(),
    Booking.countDocuments(filter),
  ]);
  res.json({ success: true, ...paginated(items, total, pageInfo) });
}

/** Owners and administrators only. Other users get 404 so booking ids cannot be probed. */
export async function getBooking(req, res) {
  const filter = req.user.role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, user: req.user._id };
  const booking = await Booking.findOne(filter).populate('user', 'username email').lean();
  if (!booking) throw ApiError.notFound('Booking not found');

  if (booking.status === 'pending' && booking.holdExpiresAt <= new Date()) {
    await expireStaleHolds();
    booking.status = 'expired';
  }
  const payments = await Payment.find({ booking: booking._id })
    .sort({ createdAt: -1 })
    .select('provider isDemo amount status providerOrderId providerPaymentId method failureReason paidAt refundedAt createdAt')
    .lean();
  const cancellableUntil = new Date(booking.showStartsAt.getTime() - env.CANCELLATION_CUTOFF_HOURS * 3600 * 1000);
  res.json({
    success: true,
    booking,
    payments,
    cancellation: {
      cutoffHours: env.CANCELLATION_CUTOFF_HOURS,
      cancellableUntil,
      canCancel: booking.status === 'pending' || (booking.status === 'confirmed' && new Date() < cancellableUntil),
    },
  });
}

export async function cancelBooking(req, res) {
  const booking = await cancelBookingService({ bookingId: req.params.id, user: req.user, reason: req.body?.reason });
  res.json({ success: true, booking, message: 'Booking cancelled' });
}
