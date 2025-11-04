// src/utils/validators.js
import logger from '../logger.js';

/**
 * Sanitiza input del usuario removiendo caracteres peligrosos
 * @param {string} input - Texto a sanitizar
 * @returns {string} Texto sanitizado
 */
export function sanitizeInput(input) {
  if (!input || typeof input !== 'string') return '';
  
  // Remover caracteres peligrosos y trim
  return input
    .trim()
    .replace(/[<>]/g, '') // Remover < >
    .replace(/[\x00-\x1F\x7F]/g, ''); // Remover caracteres de control
}

/**
 * Valida formato de número telefónico
 * @param {string} phone - Número a validar
 * @returns {boolean}
 */
export function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  
  // Permitir números de 10 a 15 dígitos
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
}

/**
 * Valida nombre de cliente
 * @param {string} name - Nombre a validar
 * @returns {boolean}
 */
export function validateName(name) {
  if (!name || typeof name !== 'string') return false;
  
  const sanitized = sanitizeInput(name);
  return sanitized.length >= 2 && sanitized.length <= 200;
}

/**
 * Valida dirección
 * @param {string} address - Dirección a validar
 * @returns {boolean}
 */
export function validateAddress(address) {
  if (!address || typeof address !== 'string') return false;
  
  const sanitized = sanitizeInput(address);
  return sanitized.length >= 10 && sanitized.length <= 500;
}

/**
 * Valida y sanitiza texto de pedido
 * @param {string} orderText - Texto del pedido
 * @returns {object} { isValid, sanitized, error }
 */
export function validateOrderText(orderText) {
  if (!orderText || typeof orderText !== 'string') {
    return { isValid: false, sanitized: '', error: 'Texto de pedido vacío' };
  }
  
  const sanitized = sanitizeInput(orderText);
  
  if (sanitized.length < 3) {
    return { isValid: false, sanitized, error: 'El pedido es demasiado corto' };
  }
  
  if (sanitized.length > 5000) {
    return { isValid: false, sanitized, error: 'El pedido es demasiado largo' };
  }
  
  return { isValid: true, sanitized, error: null };
}

/**
 * Valida que un string no esté vacío después de sanitizar
 * @param {string} text - Texto a validar
 * @param {number} minLength - Longitud mínima (default: 1)
 * @param {number} maxLength - Longitud máxima (default: 1000)
 * @returns {object} { isValid, sanitized, error }
 */
export function validateText(text, minLength = 1, maxLength = 1000) {
  if (!text || typeof text !== 'string') {
    return { isValid: false, sanitized: '', error: 'Texto vacío o inválido' };
  }
  
  const sanitized = sanitizeInput(text);
  
  if (sanitized.length < minLength) {
    return { 
      isValid: false, 
      sanitized, 
      error: `El texto debe tener al menos ${minLength} caracteres` 
    };
  }
  
  if (sanitized.length > maxLength) {
    return { 
      isValid: false, 
      sanitized, 
      error: `El texto no puede exceder ${maxLength} caracteres` 
    };
  }
  
  return { isValid: true, sanitized, error: null };
}

/**
 * Valida estructura de datos de sesión
 * @param {object} updates - Objeto con actualizaciones de sesión
 * @returns {object} Objeto validado y sanitizado
 */
export function validateSessionUpdates(updates) {
  const validated = {};
  
  if (updates.Estado) {
    const validStates = ['START', 'MENU', 'ASK_NAME', 'ASK_ADDRESS', 'TAKING_ORDER', 'AWAITING_CONFIRM'];
    if (validStates.includes(updates.Estado)) {
      validated.Estado = updates.Estado;
    } else {
      logger.warn('⚠️  Estado inválido intentado: %s', updates.Estado);
    }
  }
  
  if (updates.NombreTemporal !== undefined) {
    validated.NombreTemporal = updates.NombreTemporal 
      ? sanitizeInput(updates.NombreTemporal).substring(0, 200)
      : null;
  }
  
  if (updates.Buffer !== undefined) {
    validated.Buffer = updates.Buffer;
  }
  
  return validated;
}

export default {
  sanitizeInput,
  validatePhone,
  validateName,
  validateAddress,
  validateOrderText,
  validateText,
  validateSessionUpdates
};