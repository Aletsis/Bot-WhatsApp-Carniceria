import * as userService from '../services/userService.js';
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
 * Middleware para verificar roles específicos
 * 
 * Roles disponibles (de mayor a menor privilegio):
 * - admin: Acceso total (gestión de usuarios, configuraciones, pedidos)
 * - supervisor: Gestión de pedidos y clientes, NO puede configurar ni crear usuarios
 * - editor: Crear/editar pedidos y clientes
 * - viewer: Solo lectura
 * 
 * @param {string|string[]} allowedRoles - Roles permitidos
 */
export function requireRole(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      logger.warn('🚫 Acceso sin autenticación a ruta protegida');
      return res.status(401).json({ 
        success: false, 
        error: 'No autenticado' 
      });
    }

    const userRole = req.session.user.Rol || req.session.user.role;
    
    if (!roles.includes(userRole)) {
      logger.warn('🚫 Usuario %s (rol: %s) intentó acceder a ruta que requiere: %s', 
        req.session.user.Username, userRole, roles.join(', '));
      return res.status(403).json({ 
        success: false, 
        error: 'No tienes permisos para esta acción' 
      });
    }

    next();
  };
}

/**
 * Middleware para verificar si el usuario tiene al menos uno de los roles especificados
 * Útil para endpoints que requieren supervisor O admin
 * 
 * @param {string[]} allowedRoles - Array de roles permitidos
 */
export function requireAnyRole(allowedRoles) {
  return requireRole(allowedRoles);
}

/**
 * Verifica si un usuario puede gestionar otros usuarios
 * Solo admins pueden crear/editar/eliminar usuarios
 * 
 * @returns {Function} Middleware
 */
export function requireUserManagement() {
  return requireRole('admin');
}

/**
 * Verifica si un usuario puede gestionar configuraciones
 * Solo admins pueden modificar configuraciones del sistema
 * 
 * @returns {Function} Middleware
 */
export function requireConfigManagement() {
  return requireRole('admin');
}

/**
 * Verifica si un usuario puede gestionar pedidos
 * Admins, supervisores y editores pueden gestionar pedidos
 * 
 * @returns {Function} Middleware
 */
export function requireOrderManagement() {
  return requireRole(['admin', 'supervisor', 'editor']);
}

/**
 * Autentica un usuario usando la base de datos
 * @param {string} username - Nombre de usuario
 * @param {string} password - Contraseña en texto plano
 * @param {string} ip - Dirección IP del cliente
 * @returns {Promise<Object|null>} Usuario autenticado o null
 */
export async function authenticateUser(username, password, ip = null) {
  try {
    const user = await userService.authenticateUser(username, password);
    
    if (!user) {
      return null;
    }

    // Registrar acceso exitoso
    if (ip) {
      await userService.logAccess(user.UsuarioID, ip, true, 'Login exitoso');
    }

    return user;
  } catch (err) {
    logger.error('❌ Error en autenticación: %s', err.message);
    throw err;
  }
}

/**
 * Genera un hash de contraseña (usar para crear nuevos usuarios)
 * @param {string} password - Contraseña en texto plano
 * @returns {Promise<string>} Hash de la contraseña
 */
export async function hashPassword(password) {
  return await userService.hashPassword(password);
}