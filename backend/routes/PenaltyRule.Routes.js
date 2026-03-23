import express from 'express';
import { 
    getPenaltyRuleByShift, 
    savePenaltyRule, 
    deletePenaltyRule 
} from '../controllers/PenaltyRule.Controller.js';
import { verifyToken } from '../middleware/Auth.Middleware.js';

const router = express.Router();

router.get('/:shiftId', verifyToken, getPenaltyRuleByShift);
router.post('/save', verifyToken, savePenaltyRule);
router.delete('/:shiftId', verifyToken, deletePenaltyRule);

export default router;
