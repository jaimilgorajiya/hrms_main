import express from 'express';
import { 
    verifyWebhook, 
    handleWebhook, 
    sendTestMessage,
    verifyPunchToken,
    submitPunchVerification
} from '../controllers/WhatsApp.Controller.js';

const router = express.Router();

// Meta WhatsApp Cloud API Webhook Endpoints
router.get('/webhook', verifyWebhook);
router.post('/webhook', handleWebhook);

// 1-Tap Secure Anti-Spoof Hardware GPS Verification Endpoints
router.get('/verify-token', verifyPunchToken);
router.post('/verify-punch', submitPunchVerification);

// Admin Test Endpoint
router.post('/send-test', sendTestMessage);

export default router;
