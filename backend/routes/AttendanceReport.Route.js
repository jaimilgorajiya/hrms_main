import express from 'express';
import { triggerDailyReport } from '../controllers/AttendanceReport.Controller.js';
import { verifyToken } from '../middleware/Auth.Middleware.js'; 

const router = express.Router();

router.post('/trigger-report', verifyToken, triggerDailyReport);

export default router;
