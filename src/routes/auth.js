import express from 'express';
import * as authController from '../controllers/authController.js';
import { redirectIfAuth } from '../middleware/auth.js';

const router = express.Router();

// Mostrar formulario de login
router.get('/login', redirectIfAuth, authController.showLoginForm);

// Procesar login
router.post('/login', authController.processLogin);

// Logout
router.get('/logout', authController.logout);

export default router;