import rateLimit from 'express-rate-limit';
import env from '../config/env.js';

const common = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // Automated tests make many requests from one address; limits are exercised manually.
  skip: () => env.isTest,
  handler: (_req, res, _next, options) =>
    res.status(options.statusCode).json({ success: false, message: options.message }),
};

export const apiLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  message: 'Too many requests. Please slow down and try again shortly.',
});

/** Brute-force protection for login and registration. */
export const authLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: 'Too many login or registration attempts. Please try again in 15 minutes.',
});

/** Seat holds, booking creation and payments. */
export const bookingLimiter = rateLimit({
  ...common,
  windowMs: 10 * 60 * 1000,
  limit: 60,
  message: 'Too many booking attempts. Please wait a few minutes and try again.',
});
