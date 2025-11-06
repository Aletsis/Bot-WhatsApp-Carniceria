import express from 'express';
import { verifyWebhookHandler, messageWebhookHandler } from '../controllers/webhookController.js';
import { verifyWebhookSignature } from '../middleware/webhookVerification.js';
const router = express.Router();

// GET /webhook - Verificación inicial del webhook con Meta (sin firma)
router.get('/', verifyWebhookHandler);

// POST /webhook - Recepción de mensajes (CON verificación de firma HMAC SHA256)
router.post('/', verifyWebhookSignature, messageWebhookHandler);

export default router;