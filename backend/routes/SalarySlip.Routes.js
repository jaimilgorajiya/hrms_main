import express from 'express';
import {
    createSalarySlip,
    getSalarySlips,
    getSalarySlipById,
    deleteSalarySlip
} from '../controllers/SalarySlip.Controller.js';
import { verifyToken, isAdmin } from '../middleware/Auth.Middleware.js';

const router = express.Router();

// All routes protected — admin only
router.use(verifyToken, isAdmin);

router.post('/',       createSalarySlip);    // POST   /api/salary-slip
router.get('/',        getSalarySlips);       // GET    /api/salary-slip
router.get('/:id',     getSalarySlipById);    // GET    /api/salary-slip/:id
router.delete('/:id',  deleteSalarySlip);     // DELETE /api/salary-slip/:id

export default router;
