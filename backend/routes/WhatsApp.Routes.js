import express from 'express';
import { verifyWebhook, handleWebhook, sendTestMessage } from '../controllers/WhatsApp.Controller.js';

const router = express.Router();

// Meta WhatsApp Cloud API Webhook Endpoints
router.get('/webhook', verifyWebhook);
router.post('/webhook', handleWebhook);

// Admin Test Endpoint
router.post('/send-test', sendTestMessage);

export default router;
