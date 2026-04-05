import express from 'express';
import { verifyToken, isAdmin } from '../middleware/Auth.Middleware.js';
import { getMonthlyPayoutSummary } from '../controllers/Payroll.Controller.js';

const router = express.Router();

// Admin only: Get monthly payout summary for all employees
router.get('/summary', verifyToken, isAdmin, getMonthlyPayoutSummary);

export default router;
