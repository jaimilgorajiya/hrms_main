import express from 'express';
import { 
    initiateOffboarding, 
    getOffboardings, 
    getOffboardingDetails, 
    updateOffboarding, 
    finalizeOffboarding,
    generateDocument,
    sendDocument,
    downloadDummyDocument
} from '../controllers/Offboarding.Controller.js';
import { verifyToken, isAdmin } from '../middleware/Auth.Middleware.js';

const router = express.Router();

// In protected routes (add middleware as needed)
router.post('/initiate', verifyToken, initiateOffboarding);
router.get('/', verifyToken, getOffboardings);
router.get('/:id', verifyToken, getOffboardingDetails);
router.put('/:id', verifyToken, updateOffboarding);
router.post('/finalize/:id', verifyToken, isAdmin, finalizeOffboarding);

router.post('/:id/generate-document', verifyToken, generateDocument);
router.post('/:id/send-document', verifyToken, sendDocument);

// Public route for dummy download (or protected if cookies are reliable)
router.get('/download-dummy/:key', downloadDummyDocument);

export default router;
