import { Router } from 'express';
import { body } from 'express-validator';
import * as reviews from '../controllers/reviewController.js';
import { requireAuth, optionalAuth } from '../middlewares/auth.js';
import { validate, validateObjectId } from '../middlewares/validate.js';

const router = Router();

const ratingRule = body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5').toInt();
const commentRule = body('comment').optional().isString().trim().isLength({ max: 1000 }).withMessage('Review must be at most 1000 characters');

router.get('/movie/:movieId', optionalAuth, validateObjectId('movieId'), reviews.listMovieReviews);
router.post(
  '/',
  requireAuth,
  validate([body('movieId').isMongoId().withMessage('A valid movie is required'), ratingRule, commentRule]),
  reviews.createReview
);
router.put('/:id', requireAuth, validateObjectId('id'), validate([ratingRule.optional(), commentRule]), reviews.updateReview);
router.delete('/:id', requireAuth, validateObjectId('id'), reviews.deleteReview);

export default router;
