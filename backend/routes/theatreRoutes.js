import { Router } from 'express';
import { body } from 'express-validator';
import * as theatres from '../controllers/theatreController.js';
import { requireAuth, requireAdmin, optionalAuth } from '../middlewares/auth.js';
import { validate, validateObjectId } from '../middlewares/validate.js';

const router = Router();

const theatreRules = (isUpdate) => {
  const req = (chain) => (isUpdate ? chain.optional() : chain);
  const section = (key) => [
    req(body(`seatLayout.${key}.rows`)).isInt({ min: 0, max: 26 }).withMessage(`${key}: rows must be 0 to 26`).toInt(),
    req(body(`seatLayout.${key}.seatsPerRow`)).isInt({ min: 1, max: 30 }).withMessage(`${key}: seats per row must be 1 to 30`).toInt(),
    req(body(`seatLayout.${key}.price`)).isFloat({ min: 0, max: 10000 }).withMessage(`${key}: price must be 0 to 10000`).toFloat(),
  ];
  return [
    req(body('theatreName')).isString().trim().isLength({ min: 2, max: 100 }).withMessage('Theatre name is required'),
    req(body('city')).isString().trim().isLength({ min: 2, max: 60 }).withMessage('City is required'),
    req(body('address')).isString().trim().isLength({ min: 5, max: 200 }).withMessage('Address is required'),
    req(body('screens')).isArray({ min: 1, max: 12 }).withMessage('Add 1 to 12 screens'),
    body('screens.*').optional().isString().trim().isLength({ min: 1, max: 40 }),
    body('amenities').optional().isArray({ max: 15 }),
    body('amenities.*').optional().isString().trim().isLength({ max: 40 }),
    body('isActive').optional().isBoolean().toBoolean(),
    req(body('seatLayout')).isObject().withMessage('Seat layout is required'),
    // On update these are optional; the controller still validates the complete layout when one is sent.
    ...['lower', 'middle', 'balcony'].flatMap(section),
  ];
};

router.get('/', optionalAuth, theatres.listTheatres);
router.get('/cities', theatres.listCities);
router.get('/:id', optionalAuth, validateObjectId('id'), theatres.getTheatre);

router.post('/', requireAuth, requireAdmin, validate(theatreRules(false)), theatres.createTheatre);
router.put('/:id', requireAuth, requireAdmin, validateObjectId('id'), validate(theatreRules(true)), theatres.updateTheatre);
router.delete('/:id', requireAuth, requireAdmin, validateObjectId('id'), theatres.deleteTheatre);

export default router;
