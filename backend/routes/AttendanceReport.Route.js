import express from 'express';
import { triggerDailyReport, getAttendanceReport } from '../controllers/AttendanceReport.Controller.js';
import { verifyToken, isAdmin } from '../middleware/Auth.Middleware.js'; 

const router = express.Router();

router.post('/trigger-report', verifyToken, triggerDailyReport);
router.get('/attendance', verifyToken, isAdmin, getAttendanceReport);

export default router;
