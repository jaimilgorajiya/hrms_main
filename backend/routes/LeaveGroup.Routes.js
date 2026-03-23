import express from 'express';
import {
    getLeaveGroups, getLeaveGroupById, addLeaveGroup,
    updateLeaveGroup, deleteLeaveGroup, toggleLeaveGroupStatus, bulkDeleteLeaveGroups
} from '../controllers/LeaveGroup.Controller.js';
import { verifyToken } from '../middleware/Auth.Middleware.js';

const router = express.Router();
router.use(verifyToken);

router.get('/', getLeaveGroups);
router.get('/:id', getLeaveGroupById);
router.post('/', addLeaveGroup);
router.put('/:id', updateLeaveGroup);
router.delete('/:id', deleteLeaveGroup);
router.post('/bulk-delete', bulkDeleteLeaveGroups);
router.post('/:id/toggle-status', toggleLeaveGroupStatus);

export default router;
