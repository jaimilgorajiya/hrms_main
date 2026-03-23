import express from 'express';
import { verifyToken, isAdmin } from '../middleware/Auth.Middleware.js';
import { getPromotions, addPromotion, updatePromotion } from '../controllers/Promotion.Controller.js';

const router = express.Router();

router.get('/', verifyToken, isAdmin, getPromotions);
router.post('/add', verifyToken, isAdmin, addPromotion);
router.put('/:id', verifyToken, isAdmin, updatePromotion);

export default router;
