import express from 'express';
import {
    createSalaryRevision,
    getAllSalaryRevisions,
    getEmployeeSalaryRevisions,
    getSalaryRevisionById,
    revertSalaryRevision,
    getSalaryRevisionStats,
    settleArrears,
    previewArrears,
    getCTCForMonthAPI
} from '../controllers/SalaryRevision.Controller.js';
import { verifyToken, isAdmin } from '../middleware/Auth.Middleware.js';

const router = express.Router();

// All salary revision routes are admin-only
router.use(verifyToken, isAdmin);

// ── Utility (call before create for a dry-run preview) ────────────────────────
router.post('/preview-arrears', previewArrears);           // Dry-run arrears preview
router.get('/ctc-for-month', getCTCForMonthAPI);           // CTC active for given month/year

// ── CRUD ──────────────────────────────────────────────────────────────────────
router.post('/', createSalaryRevision);                         // Create revision
router.get('/', getAllSalaryRevisions);                          // List all (with filters)
router.get('/stats', getSalaryRevisionStats);                    // Dashboard stats
router.get('/employee/:employeeId', getEmployeeSalaryRevisions); // Per-employee history
router.get('/:id', getSalaryRevisionById);                       // Single record
router.patch('/:id/revert', revertSalaryRevision);               // Revert a revision
router.patch('/:id/settle-arrears', settleArrears);              // Mark arrears as settled

export default router;
