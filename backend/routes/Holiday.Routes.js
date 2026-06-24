import express from 'express';
import {
    getHolidays,
    getMyHolidays,
    addHoliday,
    updateHoliday,
    deleteHoliday,
    bulkDeleteHolidays,
    toggleHolidayStatus,
} from '../controllers/Holiday.Controller.js';
import { verifyToken, isAdmin } from '../middleware/Auth.Middleware.js';

const router = express.Router();

// Employee route (any logged-in user)
router.get('/my', verifyToken, getMyHolidays);

// Admin-only routes
router.get('/', verifyToken, isAdmin, getHolidays);
router.post('/', verifyToken, isAdmin, addHoliday);
router.put('/:id', verifyToken, isAdmin, updateHoliday);
router.delete('/:id', verifyToken, isAdmin, deleteHoliday);
router.post('/bulk-delete', verifyToken, isAdmin, bulkDeleteHolidays);
router.post('/:id/toggle-status', verifyToken, isAdmin, toggleHolidayStatus);

export default router;
