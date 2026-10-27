import { Router } from 'express';
import { body } from 'express-validator';
import * as shows from '../controllers/showController.js';
import { requireAuth, requireAdmin, optionalAuth } from '../middlewares/auth.js';
import { validate, validateObjectId } from '../middlewares/validate.js';
import { SHOW_FORMATS } from '../models/showModel.js';

const router = Router();

const priceRules = ['lower', 'middle', 'balcony'].map((key) =>
  body(`prices.${key}`)
    .optional({ values: 'falsy' })
    .isFloat({ min: 0, max: 10000 })
    .withMessage(`${key} price must be 0 to 10000`)
    .toFloat()
);

const showRules = (isUpdate) => {
  const req = (chain) => (isUpdate ? chain.optional() : chain);
  return [
    ...(isUpdate
      ? []
      : [
          body('movie').isMongoId().withMessage('Select a movie'),
          body('theatre').isMongoId().withMessage('Select a theatre'),
        ]),
    req(body('startsAt')).isISO8601().withMessage('Show date and time are required'),
    body('screen').optional().isString().trim().isLength({ min: 1, max: 40 }),
    body('format').optional().isIn(SHOW_FORMATS).withMessage('Unknown format'),
    body('language').optional().isString().trim().isLength({ max: 40 }),
    body('isActive').optional().isBoolean().toBoolean(),
    body('prices').optional().isObject(),
    ...priceRules,
  ];
};

router.get('/', optionalAuth, shows.listShows);
router.get('/formats', shows.showFormats);
router.get('/:id', validateObjectId('id'), shows.getShow);
router.get('/:id/seats', optionalAuth, validateObjectId('id'), shows.getShowSeats);

router.post('/', requireAuth, requireAdmin, validate(showRules(false)), shows.createShow);
router.put('/:id', requireAuth, requireAdmin, validateObjectId('id'), validate(showRules(true)), shows.updateShow);
router.delete('/:id', requireAuth, requireAdmin, validateObjectId('id'), shows.deleteShow);

export default router;
