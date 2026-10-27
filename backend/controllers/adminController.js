import User from '../models/userModel.js';
import Movie from '../models/movieModel.js';
import Theatre from '../models/theatreModel.js';
import Show from '../models/showModel.js';
import Booking from '../models/bookingModel.js';
import Payment from '../models/paymentModel.js';
import Review from '../models/reviewModel.js';
import ApiError from '../utils/ApiError.js';
import { getPagination, paginated, escapeRegex } from '../utils/pagination.js';
import { recalculateMovieRating } from '../services/ratingService.js';
import { expireStaleHolds } from '../services/bookingService.js';

export async function dashboard(_req, res) {
  await expireStaleHolds();
  const now = new Date();
  const [movies, theatres, shows, upcomingShows, users, bookingsByStatus, revenue, recentBookings, topMovies, pendingReviews] =
    await Promise.all([
      Movie.countDocuments(),
      Theatre.countDocuments(),
      Show.countDocuments(),
      Show.countDocuments({ startsAt: { $gt: now }, isActive: true }),
      User.countDocuments({ isDemoAccount: false }),
      Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      // Only successful, non-refunded payments count. Demo payments are reported separately.
      Payment.aggregate([
        { $match: { status: 'succeeded' } },
        { $group: { _id: '$isDemo', amount: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Booking.find().sort({ createdAt: -1 }).limit(8).populate('user', 'username email').lean(),
      Booking.aggregate([
        { $match: { status: 'confirmed' } },
        { $group: { _id: '$snapshot.movieName', tickets: { $sum: '$ticketCount' }, bookings: { $sum: 1 } } },
        { $sort: { tickets: -1 } },
        { $limit: 5 },
      ]),
      Review.countDocuments({ status: 'rejected' }),
    ]);

  const statusCounts = Object.fromEntries(bookingsByStatus.map((b) => [b._id, b.count]));
  const real = revenue.find((r) => r._id === false);
  const demo = revenue.find((r) => r._id === true);
  res.json({
    success: true,
    stats: {
      movies,
      theatres,
      shows,
      upcomingShows,
      users,
      bookings: Object.values(statusCounts).reduce((a, b) => a + b, 0),
      confirmedBookings: statusCounts.confirmed || 0,
      bookingsByStatus: statusCounts,
      verifiedRevenue: real?.amount || 0,
      verifiedPayments: real?.count || 0,
      demoVolume: demo?.amount || 0,
      demoPayments: demo?.count || 0,
      hiddenReviews: pendingReviews,
    },
    recentBookings,
    topMovies: topMovies.map((m) => ({ movieName: m._id, tickets: m.tickets, bookings: m.bookings })),
  });
}

export async function listUsers(req, res) {
  const { q, role } = req.query;
  const filter = { isDemoAccount: false };
  if (role) filter.role = String(role);
  if (q) {
    const rx = new RegExp(escapeRegex(String(q).trim()), 'i');
    filter.$or = [{ username: rx }, { email: rx }];
  }
  const pageInfo = getPagination(req.query, { defaultLimit: 15 });
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(pageInfo.skip).limit(pageInfo.limit),
    User.countDocuments(filter),
  ]);
  res.json({ success: true, ...paginated(items, total, pageInfo) });
}

export async function listBookings(req, res) {
  await expireStaleHolds();
  const { q, status } = req.query;
  const filter = {};
  if (status) filter.status = String(status);
  if (q) {
    const rx = new RegExp(escapeRegex(String(q).trim()), 'i');
    const users = await User.find({ $or: [{ email: rx }, { username: rx }] }).select('_id').limit(50).lean();
    filter.$or = [{ bookingReference: rx }, { 'snapshot.movieName': rx }, { user: { $in: users.map((u) => u._id) } }];
  }
  const pageInfo = getPagination(req.query, { defaultLimit: 15 });
  const [items, total] = await Promise.all([
    Booking.find(filter).sort({ createdAt: -1 }).skip(pageInfo.skip).limit(pageInfo.limit).populate('user', 'username email').lean(),
    Booking.countDocuments(filter),
  ]);
  res.json({ success: true, ...paginated(items, total, pageInfo) });
}

export async function listReviews(req, res) {
  const { status, q } = req.query;
  const filter = {};
  if (status) filter.status = String(status);
  if (q) filter.comment = new RegExp(escapeRegex(String(q).trim()), 'i');
  const pageInfo = getPagination(req.query, { defaultLimit: 15 });
  const [items, total] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(pageInfo.skip)
      .limit(pageInfo.limit)
      .populate('user', 'username email')
      .populate('movie', 'movieName')
      .lean(),
    Review.countDocuments(filter),
  ]);
  res.json({ success: true, ...paginated(items, total, pageInfo) });
}

export async function moderateReview(req, res) {
  const { status, note = '' } = req.body;
  const review = await Review.findByIdAndUpdate(
    req.params.id,
    { $set: { status, moderationNote: note, moderatedBy: req.user._id } },
    { new: true }
  );
  if (!review) throw ApiError.notFound('Review not found');
  await recalculateMovieRating(review.movie);
  res.json({ success: true, review });
}
