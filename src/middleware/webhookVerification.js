/**
 * Middleware de Verificación de Firma de Webhook de Meta/WhatsApp
 * 
 * Valida que los webhooks provengan realmente de Meta usando HMAC SHA256.
 * Esto previene ataques donde un atacante intenta enviar webhooks falsos.
 * 
 * Documentación oficial:
 * https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
 */

import crypto from 'crypto';
import logger from '../logger.js';

/**
 * Middleware para verificar la firma de los webhooks de Meta
 * 
 * Meta envía un header `x-hub-signature-256` con el formato:
 * sha256=<hash_hmac_sha256_del_payload>
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
export function verifyWebhookSignature(req, res, next) {
  const APP_SECRET = process.env.APP_SECRET;
  
  // ⚠️ Si APP_SECRET no está configurado, loggear warning pero permitir request
  // (para desarrollo local sin configuración completa)
  if (!APP_SECRET) {
    logger.warn('⚠️ APP_SECRET no configurado - Verificación de firma de webhook deshabilitada');
    logger.warn('   Para producción, configura APP_SECRET en .env');
    return next();
  }
  
  // Obtener la firma enviada por Meta
  const signature = req.get('x-hub-signature-256');
  
  if (!signature) {
    logger.error('🚨 WEBHOOK SIN FIRMA - Request bloqueado');
    logger.error('   IP: %s', req.ip);
    logger.error('   User-Agent: %s', req.get('user-agent'));
    
    return res.status(401).json({ 
      success: false, 
      error: 'No signature header present' 
    });
  }
  
  // Obtener el body raw (debe ser string para calcular hash)
  const payload = req.rawBody || JSON.stringify(req.body);
  
  // Calcular el hash HMAC SHA256 esperado
  const expectedHash = crypto
    .createHmac('sha256', APP_SECRET)
    .update(payload)
    .digest('hex');
  
  // La firma viene con prefijo "sha256="
  const expectedSignature = `sha256=${expectedHash}`;
  
  // Comparar firmas usando timingSafeEqual para prevenir timing attacks
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  
  // Verificar que tengan la misma longitud antes de comparar
  if (signatureBuffer.length !== expectedBuffer.length) {
    logger.error('🚨 FIRMA INVÁLIDA - Longitud incorrecta');
    logger.error('   Esperada: %d bytes, Recibida: %d bytes', expectedBuffer.length, signatureBuffer.length);
    logger.error('   IP: %s', req.ip);
    
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid signature' 
    });
  }
  
  // Comparación segura contra timing attacks
  try {
    if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
      logger.error('🚨 FIRMA INVÁLIDA - Signature mismatch');
      logger.error('   Esperada: %s', expectedSignature);
      logger.error('   Recibida: %s', signature);
      logger.error('   IP: %s', req.ip);
      logger.error('   User-Agent: %s', req.get('user-agent'));
      
      // 🚨 ALERTA: Posible intento de webhook falso
      logger.error('   ⚠️ POSIBLE ATAQUE: Intento de webhook no autorizado detectado');
      
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid signature' 
      });
    }
  } catch (err) {
    logger.error('🚨 Error verificando firma:', err.message);
    return res.status(401).json({ 
      success: false, 
      error: 'Signature verification failed' 
    });
  }
  
  // ✅ Firma válida - webhook auténtico de Meta
  logger.debug('✅ Firma de webhook verificada correctamente');
  next();
}

/**
 * Middleware para capturar el body raw necesario para verificación de firma
 * 
 * Express JSON parser modifica el body, necesitamos guardarlo antes.
 * Este middleware debe aplicarse ANTES del express.json()
 * 
 * @param {Request} req 
 * @param {Response} res 
 * @param {Buffer} buf - Buffer del body raw
 */
export function captureRawBody(req, res, buf, encoding) {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || 'utf8');
  }
}

/**
 * Verifica la configuración de seguridad del webhook al iniciar el servidor
 * 
 * @returns {boolean} true si está configurado correctamente
 */
export function validateWebhookSecurityConfig() {
  const APP_SECRET = process.env.APP_SECRET;
  const NODE_ENV = process.env.NODE_ENV || 'development';
  
  if (!APP_SECRET) {
    if (NODE_ENV === 'production') {
      logger.error('🚨 CONFIGURACIÓN CRÍTICA FALTANTE: APP_SECRET no está configurado');
      logger.error('   La verificación de firma de webhook está DESHABILITADA');
      logger.error('   Esto es un riesgo de seguridad CRÍTICO en producción');
      logger.error('   Configura APP_SECRET en .env inmediatamente');
      return false;
    } else {
      logger.warn('⚠️ APP_SECRET no configurado (modo desarrollo)');
      logger.warn('   Verificación de firma de webhook deshabilitada');
      logger.warn('   Para habilitar, agrega APP_SECRET a .env');
      return false;
    }
  }
  
  // Verificar que APP_SECRET tenga longitud suficiente (mínimo 32 caracteres)
  if (APP_SECRET.length < 32) {
    logger.warn('⚠️ APP_SECRET es muy corto (%d caracteres)', APP_SECRET.length);
    logger.warn('   Se recomienda mínimo 32 caracteres para seguridad');
  }
  
  logger.info('✅ Verificación de firma de webhook habilitada');
  logger.info('   APP_SECRET configurado (%d caracteres)', APP_SECRET.length);
  return true;
}

export default verifyWebhookSignature;
