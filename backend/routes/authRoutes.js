import { Router } from 'express';
import { body } from 'express-validator';
import * as auth from '../controllers/authController.js';
import { requireAuth, optionalAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { authLimiter } from '../middlewares/rateLimiters.js';
import { issueCsrfToken } from '../middlewares/csrf.js';
import { GENRES } from '../models/movieModel.js';

const router = Router();

const passwordRule = (field) =>
  body(field)
    .isString()
    .isLength({ min: 8, max: 72 })
    .withMessage('Password must be 8 to 72 characters long')
    .matches(/[A-Za-z]/)
    .withMessage('Password must contain at least one letter')
    .matches(/\d/)
    .withMessage('Password must contain at least one number');

router.get('/csrf-token', issueCsrfToken);

router.post(
  '/register',
  authLimiter,
  validate([
    body('username').isString().trim().isLength({ min: 2, max: 40 }).withMessage('Name must be 2 to 40 characters'),
    body('email').isString().trim().isEmail().withMessage('Please provide a valid email address').normalizeEmail({ gmail_remove_dots: false }),
    passwordRule('password'),
  ]),
  auth.register
);

router.post(
  '/login',
  authLimiter,
  validate([
    body('email').isString().trim().isEmail().withMessage('Please provide a valid email address').normalizeEmail({ gmail_remove_dots: false }),
    body('password').isString().notEmpty().withMessage('Password is required'),
  ]),
  auth.login
);

router.post('/logout', auth.logout);
router.get('/me', requireAuth, auth.me);
router.get('/session', optionalAuth, auth.session);

router.put(
  '/profile',
  requireAuth,
  validate([
    body('username').optional().isString().trim().isLength({ min: 2, max: 40 }).withMessage('Name must be 2 to 40 characters'),
    body('phone').optional().isString().trim().matches(/^[0-9+\-\s]{0,20}$/).withMessage('Please provide a valid phone number'),
    body('city').optional().isString().trim().isLength({ max: 60 }),
    body('favoriteGenres').optional().isArray({ max: GENRES.length }),
    body('favoriteGenres.*').optional().isIn(GENRES).withMessage('Unknown genre'),
  ]),
  auth.updateProfile
);

router.put(
  '/password',
  requireAuth,
  authLimiter,
  validate([body('currentPassword').isString().notEmpty().withMessage('Current password is required'), passwordRule('newPassword')]),
  auth.changePassword
);

export default router;
