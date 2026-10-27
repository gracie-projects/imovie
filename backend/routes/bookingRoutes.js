import { Router } from 'express';
import { body } from 'express-validator';
import * as bookings from '../controllers/bookingController.js';
import { requireAuth } from '../middlewares/auth.js';
import { validate, validateObjectId } from '../middlewares/validate.js';
import { bookingLimiter } from '../middlewares/rateLimiters.js';

const router = Router();

router.use(requireAuth);

router.post(
  '/hold-seats',
  bookingLimiter,
  validate([
    body('showId').isMongoId().withMessage('A valid show is required'),
    body('seats').isArray({ min: 1, max: 50 }).withMessage('Select at least one seat'),
    body('seats.*').isString().trim().isLength({ min: 2, max: 3 }).withMessage('Invalid seat id'),
  ]),
  bookings.holdSeats
);
router.delete('/hold/:holdId', validateObjectId('holdId'), bookings.releaseHold);

router.post('/', bookingLimiter, validate([body('holdId').isMongoId().withMessage('A valid hold id is required')]), bookings.createBooking);
router.get('/my', bookings.myBookings);
router.get('/:id', validateObjectId('id'), bookings.getBooking);
router.patch(
  '/:id/cancel',
  validateObjectId('id'),
  validate([body('reason').optional().isString().trim().isLength({ max: 200 })]),
  bookings.cancelBooking
);

export default router;
