import { Router } from 'express';
import { body } from 'express-validator';
import * as movies from '../controllers/movieController.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';
import { validate, validateObjectId } from '../middlewares/validate.js';
import { GENRES, CERTIFICATIONS, MOVIE_STATUSES } from '../models/movieModel.js';

const router = Router();

const urlRule = (field) =>
  body(field)
    .optional({ values: 'falsy' })
    .isString()
    .trim()
    .custom((v) => v.startsWith('/') || /^https?:\/\//i.test(v))
    .withMessage(`${field} must be an http(s) URL or a site-relative path`);

const movieRules = (isUpdate) => {
  const req = (chain) => (isUpdate ? chain.optional() : chain);
  return [
    req(body('movieName')).isString().trim().isLength({ min: 1, max: 120 }).withMessage('Title is required (max 120 characters)'),
    req(body('description')).isString().trim().isLength({ min: 10, max: 2000 }).withMessage('Description must be 10 to 2000 characters'),
    req(body('genres')).isArray({ min: 1, max: 6 }).withMessage('Choose 1 to 6 genres'),
    body('genres.*').optional().isIn(GENRES).withMessage('Unknown genre'),
    req(body('language')).isString().trim().isLength({ min: 2, max: 40 }).withMessage('Language is required'),
    req(body('durationMins')).isInt({ min: 30, max: 300 }).withMessage('Duration must be 30 to 300 minutes').toInt(),
    req(body('releaseDate')).isISO8601().withMessage('Release date must be a valid date').toDate(),
    body('certification').optional().isIn(CERTIFICATIONS).withMessage('Unknown certification'),
    body('status').optional().isIn(MOVIE_STATUSES).withMessage('Unknown status'),
    body('featured').optional().isBoolean().toBoolean(),
    body('cast').optional().isArray({ max: 20 }),
    body('cast.*').optional().isString().trim().isLength({ max: 60 }),
    body('director').optional().isString().trim().isLength({ max: 80 }),
    urlRule('posterUrl'),
    urlRule('backdropUrl'),
    urlRule('trailerUrl'),
  ];
};

router.get('/', movies.listMovies);
router.get('/filters', movies.movieFilters);
router.get('/:id', movies.getMovie);

router.post('/', requireAuth, requireAdmin, validate(movieRules(false)), movies.createMovie);
router.put('/:id', requireAuth, requireAdmin, validateObjectId('id'), validate(movieRules(true)), movies.updateMovie);
router.delete('/:id', requireAuth, requireAdmin, validateObjectId('id'), movies.deleteMovie);

export default router;
