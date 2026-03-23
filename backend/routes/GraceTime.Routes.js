import express from 'express';
import { getGraceTimes, addGraceTime, updateGraceTime, deleteGraceTime } from '../controllers/GraceTime.Controller.js';
import { verifyToken } from '../middleware/Auth.Middleware.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', getGraceTimes);
router.post('/', addGraceTime);
router.put('/:id', updateGraceTime);
router.delete('/:id', deleteGraceTime);

export default router;
