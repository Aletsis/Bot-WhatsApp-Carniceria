import express from 'express';
import { verifyWebhookHandler, messageWebhookHandler } from '../controllers/webhookController.js';
const router = express.Router();


router.get('/', verifyWebhookHandler);
router.post('/', messageWebhookHandler);


export default router;