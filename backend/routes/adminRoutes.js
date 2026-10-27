import { Router } from 'express';
import { body } from 'express-validator';
import * as admin from '../controllers/adminController.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';
import { validate, validateObjectId } from '../middlewares/validate.js';
import { REVIEW_STATUSES } from '../models/reviewModel.js';

const router = Router();

// Every admin route is protected on the server, regardless of what the frontend shows.
router.use(requireAuth, requireAdmin);

router.get('/dashboard', admin.dashboard);
router.get('/users', admin.listUsers);
router.get('/bookings', admin.listBookings);
router.get('/reviews', admin.listReviews);
router.patch(
  '/reviews/:id/moderate',
  validateObjectId('id'),
  validate([
    body('status').isIn(REVIEW_STATUSES).withMessage(`Status must be one of: ${REVIEW_STATUSES.join(', ')}`),
    body('note').optional().isString().trim().isLength({ max: 200 }),
  ]),
  admin.moderateReview
);

export default router;
