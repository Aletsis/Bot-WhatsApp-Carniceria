import bcrypt from 'bcrypt';
import logger from '../logger.js';

/**
 * Verifica si el usuario está autenticado
 */
export function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  
  logger.warn('🚫 Intento de acceso no autorizado a: %s', req.originalUrl);
  
  // Si es una petición AJAX/API, responder con JSON
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(401).json({ 
      success: false, 
      error: 'No autenticado',
      redirect: '/login' 
    });
  }
  
  // Si es navegación normal, redirigir al login
  res.redirect('/login');
}

/**
 * Redirige a dashboard si ya está autenticado
 */
export function redirectIfAuth(req, res, next) {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  next();
}

/**
 * Usuarios del sistema (en producción usar base de datos)
 * Contraseñas hasheadas con bcrypt
 */
const USERS = [
  {
    username: 'admin',
    // Contraseña: admin123
    passwordHash: '$2b$10$S4rilO7yYF0KWuG0NPSRTujWWsjrOSh75oCpotGJ5cM8A0AYrTSyW',
    role: 'admin'
  }
];

/**
 * Autentica un usuario
 * @param {string} username - Nombre de usuario
 * @param {string} password - Contraseña en texto plano
 * @returns {Promise<Object|null>} Usuario autenticado o null
 */
export async function authenticateUser(username, password) {
  const user = USERS.find(u => u.username === username);
  
  if (!user) {
    logger.warn('🚫 Usuario no encontrado: %s', username);
    return null;
  }
  
  const isValid = await bcrypt.compare(password, user.passwordHash);
  
  if (!isValid) {
    logger.warn('🚫 Contraseña incorrecta para usuario: %s', username);
    return null;
  }
  
  logger.info('✅ Usuario autenticado: %s', username);
  return {
    username: user.username,
    role: user.role
  };
}

/**
 * Genera un hash de contraseña (usar para crear nuevos usuarios)
 * @param {string} password - Contraseña en texto plano
 * @returns {Promise<string>} Hash de la contraseña
 */
export async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}