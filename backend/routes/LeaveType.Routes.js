import express from 'express';
import { getLeaveTypes, addLeaveType, updateLeaveType, deleteLeaveType, toggleStatus, bulkDeleteLeaveTypes } from '../controllers/LeaveType.Controller.js';
import { verifyToken } from '../middleware/Auth.Middleware.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', getLeaveTypes);
router.post('/', addLeaveType);
router.put('/:id', updateLeaveType);
router.delete('/:id', deleteLeaveType);
router.post('/bulk-delete', bulkDeleteLeaveTypes);
router.post('/:id/toggle-status', toggleStatus);

export default router;
