import express from 'express';
import { 
    upsertEmployeeCTC, 
    getEmployeeCTC, 
    getAllEmployeeCTCs, 
    getAvailableComponentTypes 
} from '../controllers/EmployeeCTC.Controller.js';
import { verifyToken, isAdmin } from '../middleware/Auth.Middleware.js';

const router = express.Router();

// All routes are protected by admin verification
router.use(verifyToken, isAdmin);

router.get('/all', getAllEmployeeCTCs);
router.get('/components', getAvailableComponentTypes);
router.get('/:id', getEmployeeCTC);
router.post('/upsert', upsertEmployeeCTC);

export default router;
