import express from 'express';
import * as authController from '../controllers/authController.js';
import { redirectIfAuth } from '../middleware/auth.js';

const router = express.Router();

// Rutas HTML (legacy) - Solo cuando se accede desde /auth
router.get('/login', redirectIfAuth, authController.showLoginForm);
router.get('/logout', authController.logout);

// Rutas de login con detección automática de tipo
router.post('/login', (req, res) => {
  // Si tiene Content-Type: application/json, usar la API
  if (req.headers['content-type']?.includes('application/json')) {
    return authController.loginAPI(req, res);
  }
  // Si no, usar el método tradicional de formulario
  return authController.processLogin(req, res);
});

// Rutas de logout con detección automática
router.post('/logout', (req, res) => {
  if (req.headers['content-type']?.includes('application/json') || 
      req.headers.accept?.includes('application/json')) {
    return authController.logoutAPI(req, res);
  }
  return authController.logout(req, res);
});

export default router;