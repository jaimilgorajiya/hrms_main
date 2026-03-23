import express from 'express';
import { verifyToken, isAdmin } from '../middleware/Auth.Middleware.js';
import upload from '../middleware/Upload.Middleware.js';
import { 
    getPayrollSetting, 
    updatePayrollSetting, 
    removeSignature,
    previewPayslip
} from '../controllers/PayrollSetting.Controller.js';

const router = express.Router();

router.get('/', verifyToken, isAdmin, getPayrollSetting);
router.get('/preview-payslip', verifyToken, isAdmin, previewPayslip);
router.put('/', verifyToken, isAdmin, upload.fields([
    { name: 'form16Signature', maxCount: 1 },
    { name: 'salaryStampSignature', maxCount: 1 }
]), updatePayrollSetting);
router.delete('/signature/:type', verifyToken, isAdmin, removeSignature);

export default router;
