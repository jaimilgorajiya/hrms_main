import express from 'express';
import { verifyToken, isAdmin } from '../middleware/Auth.Middleware.js';
import { getRetirementSetting, updateRetirementSetting } from '../controllers/RetirementSetting.Controller.js';
import {
    getRetirementList,
    getRetirementStats,
    initiateExit,
    extendRetirement,
    markCompleted,
    runNotifications
} from '../controllers/Retirement.Controller.js';

const router = express.Router();

// Settings
router.get('/settings', verifyToken, isAdmin, getRetirementSetting);
router.put('/settings', verifyToken, isAdmin, updateRetirementSetting);

// Records
router.get('/', verifyToken, isAdmin, getRetirementList);
router.get('/stats', verifyToken, isAdmin, getRetirementStats);
router.put('/:id/initiate-exit', verifyToken, isAdmin, initiateExit);
router.put('/:id/extend', verifyToken, isAdmin, extendRetirement);
router.put('/:id/complete', verifyToken, isAdmin, markCompleted);
router.post('/run-notifications', verifyToken, isAdmin, runNotifications);

export default router;
