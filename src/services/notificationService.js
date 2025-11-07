/**
 * Servicio de Notificaciones de Errores a Administradores
 * 
 * Características:
 * - Envía notificaciones vía WhatsApp a administradores
 * - Throttling automático (evita spam)
 * - Registro en BD para auditoría
 * - Configuración desde BD
 * - Manejo de errores sin interrumpir flujo principal
 * 
 * TIPOS DE NOTIFICACIONES:
 * 
 * 1. NOTIFICACIONES DE SISTEMA (Solo Admin):
 *    - PRINTING_ERROR: Error de impresión individual
 *    - PRINTING_RECURRING: 3+ errores de impresión en ventana de tiempo
 *    - WHATSAPP_API_ERROR: Error al enviar mensaje por WhatsApp API
 *    - DATABASE_ERROR: Error de conexión a base de datos
 *    - WEBHOOK_INVALID: Webhook con firma inválida
 * 
 * 2. NOTIFICACIONES OPERATIVAS (Admin + Supervisor):
 *    - ORDER_NOT_PRINTED: Pedido sin imprimir por X minutos
 *    - PRINTING_DELAYED: Pedido con demoras en impresión
 * 
 * @module notificationService
 */

import sql from 'mssql';
import { getPool } from './dbService.js';
import * as configService from './configService.js';
import logger from '../logger.js';

// ============================================
// CONSTANTES DE TIPOS DE NOTIFICACIONES
// ============================================

/**
 * Notificaciones de sistema - Solo para administradores
 * Incluye errores técnicos y problemas del sistema
 */
const SYSTEM_NOTIFICATIONS = [
  'PRINTING_ERROR',
  'PRINTING_RECURRING', 
  'WHATSAPP_API_ERROR',
  'DATABASE_ERROR',
  'WEBHOOK_INVALID'
];

/**
 * Notificaciones operativas - Para administradores y supervisores
 * Incluye alertas relacionadas con operaciones diarias
 */
const OPERATIONAL_NOTIFICATIONS = [
  'ORDER_NOT_PRINTED',
  'PRINTING_DELAYED'
];

/**
 * Todos los tipos de notificaciones válidos
 */
const ALL_NOTIFICATION_TYPES = [...SYSTEM_NOTIFICATIONS, ...OPERATIONAL_NOTIFICATIONS];

// Cache en memoria para throttling
// Estructura: { [tipoError]: { ultimaNotificacion: timestamp, contador: number } }
const notificationCache = new Map();

// Cache para configuraciones (1 minuto)
let configCache = {
  enabled: null,
  throttleMinutes: null,
  printingThreshold: null,
  lastUpdate: null
};

const CONFIG_CACHE_TTL = 60000; // 1 minuto

/**
 * Carga las configuraciones de notificaciones desde BD
 * @returns {Promise<Object>} Configuraciones
 */
async function loadConfig() {
  const now = Date.now();
  
  // Si el cache es válido, usarlo
  if (configCache.lastUpdate && (now - configCache.lastUpdate) < CONFIG_CACHE_TTL) {
    return configCache;
  }
  
  try {
    const enabled = await configService.getConfig('ERROR_NOTIFICATIONS_ENABLED');
    const throttleMinutes = await configService.getConfig('NOTIFICATION_THROTTLE_MINUTES');
    const printingThreshold = await configService.getConfig('PRINTING_ERROR_THRESHOLD');
    
    configCache = {
      enabled: enabled?.valor === 'true',
      throttleMinutes: parseInt(throttleMinutes?.valor || '15'),
      printingThreshold: parseInt(printingThreshold?.valor || '3'),
      lastUpdate: now
    };
    
    return configCache;
  } catch (error) {
    logger.error('[Notifications] Error cargando configuraciones:', error.message);
    
    // Fallback a valores por defecto
    return {
      enabled: true,
      throttleMinutes: 15,
      printingThreshold: 3,
      lastUpdate: now
    };
  }
}

/**
 * Obtiene los números de WhatsApp según el tipo de notificación
 * @param {string} notificationType - Tipo de notificación 
 * @returns {Promise<Array<Object>>} Array de usuarios con sus datos
 */
async function getRecipientPhoneNumbers(notificationType) {
  try {
    const pool = await getPool();
    
    // Determinar roles permitidos según el tipo de notificación
    let allowedRoles;
    if (SYSTEM_NOTIFICATIONS.includes(notificationType)) {
      // Solo administradores para notificaciones de sistema
      allowedRoles = ['admin'];
    } else if (OPERATIONAL_NOTIFICATIONS.includes(notificationType)) {
      // Administradores y supervisores para notificaciones operativas
      allowedRoles = ['admin', 'supervisor'];
    } else {
      logger.warn('[Notifications] Tipo de notificación desconocido: %s', notificationType);
      allowedRoles = ['admin']; // Fallback a solo admin
    }
    
    // Construir la condición WHERE dinámicamente
    const rolePlaceholders = allowedRoles.map((_, index) => `@rol${index}`).join(', ');
    
    const request = pool.request();
    allowedRoles.forEach((rol, index) => {
      request.input(`rol${index}`, sql.NVarChar, rol);
    });
    
    const result = await request.query(`
      SELECT 
        UsuarioID,
        Username,
        Rol,
        NumeroWhatsApp
      FROM dbo.Usuarios
      WHERE Rol IN (${rolePlaceholders})
        AND Activo = 1
        AND NumeroWhatsApp IS NOT NULL
        AND LEN(RTRIM(NumeroWhatsApp)) > 0
      ORDER BY 
        CASE Rol 
          WHEN 'admin' THEN 1 
          WHEN 'supervisor' THEN 2 
          ELSE 3 
        END,
        UsuarioID
    `);
    
    const recipients = result.recordset.map(user => ({
      usuarioID: user.UsuarioID,
      username: user.Username,
      rol: user.Rol,
      phone: user.NumeroWhatsApp
    }));
    
    if (recipients.length === 0) {
      logger.warn('[Notifications] ⚠️  No hay usuarios (%s) con WhatsApp para tipo: %s', 
        allowedRoles.join(', '), notificationType);
    } else {
      logger.debug('[Notifications] 📱 %d destinatarios encontrados para %s: %s', 
        recipients.length, 
        notificationType,
        recipients.map(r => `${r.username}(${r.rol})`).join(', ')
      );
    }
    
    return recipients;
  } catch (error) {
    logger.error('[Notifications] Error obteniendo destinatarios para %s:', notificationType, error.message);
    return [];
  }
}

/**
 * Función de compatibilidad - obtiene solo administradores
 * @deprecated Usar getRecipientPhoneNumbers() con tipo específico
 * @returns {Promise<Array<Object>>} Array de administradores
 */
async function getAdminPhoneNumbers() {
  return await getRecipientPhoneNumbers('SYSTEM_NOTIFICATION_FALLBACK');
}

/**
 * Verifica si se debe enviar notificación (throttling)
 * Evita spam enviando máximo 1 notificación del mismo tipo cada X minutos
 * 
 * @param {string} tipoError - Tipo de error (PRINTING_ERROR, DATABASE_ERROR, etc.)
 * @returns {boolean} true si se debe enviar, false si está en throttle
 */
async function shouldNotify(tipoError) {
  const config = await loadConfig();
  
  // Si las notificaciones están deshabilitadas
  if (!config.enabled) {
    logger.debug('[Notifications] Notificaciones deshabilitadas en configuración');
    return false;
  }
  
  const cached = notificationCache.get(tipoError);
  const now = Date.now();
  
  if (!cached) {
    // Primera notificación de este tipo
    notificationCache.set(tipoError, {
      ultimaNotificacion: now,
      contador: 1
    });
    return true;
  }
  
  const minutosDesdeUltima = (now - cached.ultimaNotificacion) / 60000;
  
  if (minutosDesdeUltima >= config.throttleMinutes) {
    // Ha pasado suficiente tiempo, enviar
    notificationCache.set(tipoError, {
      ultimaNotificacion: now,
      contador: cached.contador + 1
    });
    return true;
  }
  
  // Aún en throttle
  logger.debug('[Notifications] Throttle activo para %s (último hace %.1f min)', tipoError, minutosDesdeUltima);
  return false;
}

/**
 * Registra una notificación en la base de datos
 * 
 * @param {string} tipoError - Tipo de error
 * @param {string} severidad - CRITICAL, ERROR, WARNING, INFO
 * @param {string} mensaje - Mensaje de la notificación
 * @param {Array<string>} destinatarios - Números de WhatsApp
 * @param {string} estado - PENDIENTE, ENVIADO, ERROR, THROTTLED
 * @param {string|null} whatsappMessageID - ID del mensaje de WhatsApp
 * @param {Object|null} metadata - Información adicional
 * @param {string|null} errorMensaje - Mensaje de error si falló
 * @returns {Promise<number|null>} ID de la notificación registrada
 */
async function logNotification(tipoError, severidad, mensaje, destinatarios, estado, whatsappMessageID = null, metadata = null, errorMensaje = null) {
  try {
    const pool = await getPool();
    
    const result = await pool.request()
      .input('tipoError', sql.NVarChar(50), tipoError)
      .input('severidad', sql.NVarChar(20), severidad)
      .input('mensaje', sql.NVarChar(sql.MAX), mensaje)
      .input('destinatarios', sql.NVarChar(500), destinatarios.join(', '))
      .input('estado', sql.NVarChar(20), estado)
      .input('whatsappMessageID', sql.NVarChar(255), whatsappMessageID)
      .input('metadata', sql.NVarChar(sql.MAX), metadata ? JSON.stringify(metadata) : null)
      .input('errorMensaje', sql.NVarChar(sql.MAX), errorMensaje)
      .query(`
        INSERT INTO dbo.NotificacionesLog (
          TipoError, Severidad, Mensaje, Destinatarios, Estado,
          WhatsAppMessageID, Metadata, CreadoEn, EnviadoEn, ErrorMensaje
        )
        OUTPUT INSERTED.NotificacionID
        VALUES (
          @tipoError, @severidad, @mensaje, @destinatarios, @estado,
          @whatsappMessageID, @metadata, SYSDATETIME(), 
          ${estado === 'ENVIADO' ? 'SYSDATETIME()' : 'NULL'}, 
          @errorMensaje
        )
      `);
    
    return result.recordset[0]?.NotificacionID || null;
  } catch (error) {
    logger.error('[Notifications] Error registrando notificación en BD:', error.message);
    return null;
  }
}

/**
 * Envía una notificación de error a los administradores vía WhatsApp
 * 
 * @param {string} tipoError - Tipo de error (PRINTING_ERROR, DATABASE_ERROR, etc.)
 * @param {string} mensaje - Mensaje descriptivo del error
 * @param {Object} options - Opciones adicionales
 * @param {string} options.severidad - CRITICAL, ERROR, WARNING, INFO (default: ERROR)
 * @param {Object} options.metadata - Datos adicionales para contexto
 * @param {boolean} options.forceNotify - Ignorar throttling (default: false)
 * @returns {Promise<boolean>} true si se envió, false si no
 */
export async function notifyAdmins(tipoError, mensaje, options = {}) {
  const {
    severidad = 'ERROR',
    metadata = null,
    forceNotify = false
  } = options;
  
  try {
    // Validar tipo de notificación
    if (!ALL_NOTIFICATION_TYPES.includes(tipoError)) {
      logger.warn('[Notifications] ⚠️  Tipo de notificación no válido: %s', tipoError);
      // Fallback a notificación de sistema
      tipoError = 'SYSTEM_ERROR';
    }
    
    // Verificar throttling (a menos que sea forzado)
    if (!forceNotify) {
      const should = await shouldNotify(tipoError);
      if (!should) {
        // Registrar como THROTTLED
        await logNotification(tipoError, severidad, mensaje, [], 'THROTTLED', null, metadata, null);
        return false;
      }
    }
    
    // Obtener destinatarios según el tipo de notificación
    const recipients = await getRecipientPhoneNumbers(tipoError);
    
    if (recipients.length === 0) {
      const requiredRoles = SYSTEM_NOTIFICATIONS.includes(tipoError) ? 'admin' : 'admin/supervisor';
      logger.warn('[Notifications] ⚠️  No se puede enviar notificación tipo %s: no hay usuarios %s con WhatsApp', 
        tipoError, requiredRoles);
      await logNotification(tipoError, severidad, mensaje, [], 'ERROR', null, metadata, 
        `No hay usuarios ${requiredRoles} con WhatsApp configurado`);
      return false;
    }
    
    // Construir mensaje formateado
    const emoji = {
      CRITICAL: '🔥',
      ERROR: '❌',
      WARNING: '⚠️',
      INFO: 'ℹ️'
    }[severidad] || '❌';
    
    const formattedMessage = `${emoji} *ALERTA DEL SISTEMA*\n\n` +
      `*Tipo:* ${tipoError.replace(/_/g, ' ')}\n` +
      `*Severidad:* ${severidad}\n` +
      `*Hora:* ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}\n\n` +
      `*Detalle:*\n${mensaje}`;
    
    // Importar whatsappService dinámicamente para evitar dependencia circular
    const whatsappService = await import('./whatsappService.js');
    
    // Enviar a cada destinatario
    const results = [];
    const phoneNumbers = recipients.map(r => r.phone);
    
    for (const recipient of recipients) {
      try {
        const response = await whatsappService.default.sendText(recipient.phone, formattedMessage);
        
        results.push({
          username: recipient.username,
          rol: recipient.rol,
          phone: recipient.phone,
          success: true,
          messageId: response.messages?.[0]?.id
        });
        
        logger.info('[Notifications] ✅ Notificación %s enviada a %s (%s) - %s', 
          tipoError, recipient.username, recipient.rol, recipient.phone);
      } catch (error) {
        results.push({
          username: recipient.username,
          rol: recipient.rol,
          phone: recipient.phone,
          success: false,
          error: error.message
        });
        
        logger.error('[Notifications] ❌ Error enviando a %s (%s): %s', recipient.username, recipient.rol, error.message);
      }
    }
    
    // Verificar si al menos uno se envió exitosamente
    const anySuccess = results.some(r => r.success);
    const allSuccess = results.every(r => r.success);
    
    // Registrar en BD
    const estado = allSuccess ? 'ENVIADO' : (anySuccess ? 'ENVIADO' : 'ERROR');
    const whatsappMessageID = results.find(r => r.success)?.messageId || null;
    const errorMensaje = allSuccess ? null : results.filter(r => !r.success).map(r => `${r.username}(${r.rol}): ${r.error}`).join('; ');
    const recipientSummary = results.map(r => `${r.username}(${r.rol})`).join(', ');
    
    await logNotification(
      tipoError,
      severidad,
      mensaje,
      phoneNumbers,
      estado,
      whatsappMessageID,
      { ...metadata, results, recipientSummary },
      errorMensaje
    );
    
    if (allSuccess) {
      logger.info('[Notifications] ✅ Notificación %s enviada exitosamente a %d destinatarios (%s)', 
        tipoError, recipients.length, recipientSummary);
    } else if (anySuccess) {
      logger.warn('[Notifications] ⚠️  Notificación %s enviada parcialmente (%d/%d exitosos) - %s', 
        tipoError, results.filter(r => r.success).length, recipients.length, recipientSummary);
    } else {
      logger.error('[Notifications] ❌ Error enviando notificación %s a todos los destinatarios', tipoError);
    }
    
    return anySuccess;
  } catch (error) {
    logger.error('[Notifications] ❌ Error crítico en notifyAdmins:', error.message);
    
    // Intentar registrar el error
    try {
      await logNotification(tipoError, severidad, mensaje, [], 'ERROR', null, metadata, error.message);
    } catch (logError) {
      logger.error('[Notifications] ❌ Error registrando notificación fallida:', logError.message);
    }
    
    return false;
  }
}

/**
 * Obtiene el historial de notificaciones desde la BD
 * 
 * @param {Object} filters - Filtros opcionales
 * @param {string} filters.tipoError - Filtrar por tipo de error
 * @param {string} filters.estado - Filtrar por estado
 * @param {number} filters.limit - Límite de registros (default: 50)
 * @returns {Promise<Array>} Lista de notificaciones
 */
export async function getNotificationHistory(filters = {}) {
  const { tipoError = null, estado = null, limit = 50 } = filters;
  
  try {
    const pool = await getPool();
    
    let query = `
      SELECT TOP (@limit)
        NotificacionID,
        TipoError,
        Severidad,
        Mensaje,
        Destinatarios,
        Estado,
        WhatsAppMessageID,
        Metadata,
        CreadoEn,
        EnviadoEn,
        ErrorMensaje
      FROM dbo.NotificacionesLog
      WHERE 1=1
    `;
    
    const request = pool.request().input('limit', sql.Int, limit);
    
    if (tipoError) {
      query += ' AND TipoError = @tipoError';
      request.input('tipoError', sql.NVarChar(50), tipoError);
    }
    
    if (estado) {
      query += ' AND Estado = @estado';
      request.input('estado', sql.NVarChar(20), estado);
    }
    
    query += ' ORDER BY CreadoEn DESC';
    
    const result = await request.query(query);
    
    return result.recordset.map(row => ({
      ...row,
      Metadata: row.Metadata ? JSON.parse(row.Metadata) : null
    }));
  } catch (error) {
    logger.error('[Notifications] Error obteniendo historial:', error.message);
    return [];
  }
}

/**
 * Limpia notificaciones antiguas de la BD
 * (Útil para mantenimiento, ejecutar periódicamente)
 * 
 * @param {number} diasAntiguedad - Días de antigüedad para eliminar (default: 90)
 * @returns {Promise<number>} Cantidad de registros eliminados
 */
export async function cleanOldNotifications(diasAntiguedad = 90) {
  try {
    const pool = await getPool();
    
    const result = await pool.request()
      .input('dias', sql.Int, diasAntiguedad)
      .query(`
        DELETE FROM dbo.NotificacionesLog
        WHERE CreadoEn < DATEADD(day, -@dias, SYSDATETIME())
      `);
    
    const deleted = result.rowsAffected[0] || 0;
    
    if (deleted > 0) {
      logger.info('[Notifications] 🧹 Limpiadas %d notificaciones antiguas (>%d días)', deleted, diasAntiguedad);
    }
    
    return deleted;
  } catch (error) {
    logger.error('[Notifications] Error limpiando notificaciones antiguas:', error.message);
    return 0;
  }
}

/**
 * Obtiene estadísticas de notificaciones
 * @returns {Promise<Object>} Estadísticas
 */
export async function getNotificationStats() {
  try {
    const pool = await getPool();
    
    const result = await pool.request().query(`
      SELECT 
        COUNT(*) AS TotalNotificaciones,
        SUM(CASE WHEN Estado = 'ENVIADO' THEN 1 ELSE 0 END) AS Enviadas,
        SUM(CASE WHEN Estado = 'ERROR' THEN 1 ELSE 0 END) AS Errores,
        SUM(CASE WHEN Estado = 'THROTTLED' THEN 1 ELSE 0 END) AS Throttled,
        MAX(CreadoEn) AS UltimaNotificacion
      FROM dbo.NotificacionesLog
      WHERE CreadoEn >= DATEADD(day, -7, SYSDATETIME())
    `);
    
    const byType = await pool.request().query(`
      SELECT 
        TipoError,
        COUNT(*) AS Cantidad,
        MAX(CreadoEn) AS Ultima
      FROM dbo.NotificacionesLog
      WHERE CreadoEn >= DATEADD(day, -7, SYSDATETIME())
      GROUP BY TipoError
      ORDER BY Cantidad DESC
    `);
    
    return {
      general: result.recordset[0],
      porTipo: byType.recordset
    };
  } catch (error) {
    logger.error('[Notifications] Error obteniendo estadísticas:', error.message);
    return null;
  }
}

/**
 * Envía notificaciones de sistema (solo a administradores)
 * @param {string} tipoError - Tipo de error del sistema
 * @param {string} mensaje - Mensaje de la notificación
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<boolean>} True si se envió exitosamente
 */
export async function notifySystemError(tipoError, mensaje, options = {}) {
  // Validar que sea un tipo de notificación de sistema
  if (!SYSTEM_NOTIFICATIONS.includes(tipoError)) {
    logger.warn('[Notifications] ⚠️  Tipo no válido para notificación de sistema: %s', tipoError);
    return false;
  }
  
  return await notifyAdmins(tipoError, mensaje, options);
}

/**
 * Envía notificaciones operativas (a administradores y supervisores)
 * @param {string} tipoError - Tipo de notificación operativa
 * @param {string} mensaje - Mensaje de la notificación
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<boolean>} True si se envió exitosamente
 */
export async function notifyOperationalIssue(tipoError, mensaje, options = {}) {
  // Validar que sea un tipo de notificación operativa
  if (!OPERATIONAL_NOTIFICATIONS.includes(tipoError)) {
    logger.warn('[Notifications] ⚠️  Tipo no válido para notificación operativa: %s', tipoError);
    return false;
  }
  
  return await notifyAdmins(tipoError, mensaje, options);
}

export default {
  notifyAdmins,
  notifySystemError,
  notifyOperationalIssue,
  getNotificationHistory,
  cleanOldNotifications,
  getNotificationStats,
  // Constantes para uso externo
  SYSTEM_NOTIFICATIONS,
  OPERATIONAL_NOTIFICATIONS,
  ALL_NOTIFICATION_TYPES
};
