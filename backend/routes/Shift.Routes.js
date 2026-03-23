import express from 'express';
import { 
    getAllShifts, 
    getShiftById, 
    addShift, 
    updateShift, 
    deleteShift,
    toggleShiftStatus,
    getShiftEmployees
} from '../controllers/Shift.Controller.js';
import { verifyToken } from '../middleware/Auth.Middleware.js';

const router = express.Router();

router.get('/', verifyToken, getAllShifts);
router.get('/:id', verifyToken, getShiftById);
router.get('/:id/employees', verifyToken, getShiftEmployees);
router.post('/add', verifyToken, addShift);
router.put('/update/:id', verifyToken, updateShift);
router.delete('/delete/:id', verifyToken, deleteShift);
router.patch('/toggle-status/:id', verifyToken, toggleShiftStatus);

export default router;
