import express from 'express';
import { verifyToken, isAdmin } from '../middleware/Auth.Middleware.js';
import { 
    getOnboardingEmployees, 
    updateOnboardingSettings,
    updateIndividualSetting
} from '../controllers/OnboardingDocSetting.Controller.js';

const router = express.Router();

router.get('/employees', verifyToken, isAdmin, getOnboardingEmployees);
router.post('/bulk-update', verifyToken, isAdmin, updateOnboardingSettings);
router.post('/update', verifyToken, isAdmin, updateIndividualSetting);

export default router;
