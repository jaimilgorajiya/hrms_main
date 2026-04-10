import express from 'express';
import { verifyToken, isAdmin } from '../middleware/Auth.Middleware.js';
import { getMonthlyPayoutSummary, initiatePayout, getPayoutHistory, generateSalarySlip, publishSalarySlip, getMyPayslips, downloadPayslip, deletePayout } from '../controllers/Payroll.Controller.js';

const router = express.Router();

// Admin only: Get monthly payout summary for all employees
router.get('/summary', verifyToken, isAdmin, getMonthlyPayoutSummary);
router.post('/initiate', verifyToken, isAdmin, initiatePayout);
router.delete('/:id', verifyToken, isAdmin, deletePayout);
router.get('/history', verifyToken, isAdmin, getPayoutHistory);
router.post('/generate-slip', verifyToken, isAdmin, generateSalarySlip);
router.post('/publish-slip', verifyToken, isAdmin, publishSalarySlip);

// Employee access
router.get('/my-slips', verifyToken, getMyPayslips);
router.get('/download-slip/:id', verifyToken, downloadPayslip);

export default router;

