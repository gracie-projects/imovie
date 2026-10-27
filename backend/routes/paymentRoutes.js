import { Router } from 'express';
import { body } from 'express-validator';
import * as payments from '../controllers/paymentController.js';
import { requireAuth } from '../middlewares/auth.js';
import { validate, validateObjectId } from '../middlewares/validate.js';
import { bookingLimiter } from '../middlewares/rateLimiters.js';

const router = Router();

router.get('/config', payments.paymentConfig);

router.post(
  '/order',
  requireAuth,
  bookingLimiter,
  validate([body('bookingId').isMongoId().withMessage('A valid booking is required')]),
  payments.createOrder
);

// Stands in for a real gateway's verified callback. Only demo payments can be completed here.
router.post(
  '/:id/demo-complete',
  requireAuth,
  bookingLimiter,
  validateObjectId('id'),
  validate([
    body('outcome').isIn(['success', 'failure']).withMessage('Outcome must be success or failure'),
    body('method').optional().isIn(['upi', 'card', 'netbanking', 'wallet']).withMessage('Unknown payment method'),
  ]),
  payments.completeDemo
);

export default router;
