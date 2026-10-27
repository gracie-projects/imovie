import { Router } from 'express';
import * as favorites from '../controllers/favoriteController.js';
import { requireAuth } from '../middlewares/auth.js';
import { validateObjectId } from '../middlewares/validate.js';

const router = Router();

router.use(requireAuth);
router.get('/', favorites.listFavorites);
router.post('/:movieId', validateObjectId('movieId'), favorites.addFavorite);
router.delete('/:movieId', validateObjectId('movieId'), favorites.removeFavorite);

export default router;
