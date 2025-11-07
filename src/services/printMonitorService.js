/**
 * @file printMonitorService.js
 * @description Servicio de monitoreo de pedidos no impresos
 * 
 * Monitorea periódicamente la base de datos para detectar pedidos que no se han
 * logrado imprimir en un tiempo razonable. Cuando detecta pedidos problemáticos,
 * envía notificaciones a los administradores para que tomen acción.
 * 
 * Características:
 * - Detección automática de pedidos con estados 'Error' o 'Pendiente'
 * - Notificación solo para pedidos que superan el tiempo límite (15 min por defecto)
 * - Prevención de notificaciones duplicadas con tracking en BD
 * - Job programado con intervalos configurables (5 min por defecto)
 * - Sistema habilitado/deshabilitado vía configuración
 * 
 * @author Sistema de Notificaciones
 * @version 1.0.0
 */

import cron from 'node-cron';
import sql from 'mssql';
import dbService from './dbService.js';
import { notifyAdmins } from './notificationService.js';
import logger from '../logger.js';

let monitorJob = null;
let monitorConfig = {
  enabled: true,
  intervalMinutes: 5,
  timeoutMinutes: 15
};

/**
 * Carga la configuración del monitoreo desde la base de datos
 * @returns {Promise<Object>} Configuración cargada
 */
async function loadConfig() {
  try {
    const pool = await dbService.getPool();
    
    // Obtener las 3 configuraciones necesarias
    const result = await pool.request()
      .query(`
        SELECT Clave, Valor 
        FROM Configuraciones 
        WHERE Clave IN (
          'PRINT_MONITOR_ENABLED', 
          'PRINT_MONITOR_INTERVAL',
          'PRINT_TIMEOUT_MINUTES'
        )
      `);
    
    // Parsear configuraciones
    result.recordset.forEach(config => {
      switch (config.Clave) {
        case 'PRINT_MONITOR_ENABLED':
          monitorConfig.enabled = config.Valor.toLowerCase() === 'true';
          break;
        case 'PRINT_MONITOR_INTERVAL':
          monitorConfig.intervalMinutes = parseInt(config.Valor) || 5;
          break;
        case 'PRINT_TIMEOUT_MINUTES':
          monitorConfig.timeoutMinutes = parseInt(config.Valor) || 15;
          break;
      }
    });
    
    logger.info('🔧 Configuración del monitor de impresión cargada:', monitorConfig);
    return monitorConfig;
    
  } catch (error) {
    logger.error('Error cargando configuración del monitor:', error);
    // Usar valores por defecto si falla
    return monitorConfig;
  }
}

/**
 * Verifica y notifica pedidos no impresos
 * @returns {Promise<void>}
 */
async function checkUnprintedOrders() {
  try {
    const pool = await dbService.getPool();
    
    // Buscar pedidos problemáticos
    const result = await pool.request()
      .input('timeoutMinutes', sql.Int, monitorConfig.timeoutMinutes)
      .query(`
        SELECT 
          p.PedidoID,
          p.Folio,
          p.Contenido,
          p.EstadoImpresion,
          p.Fecha,
          DATEDIFF(MINUTE, p.Fecha, SYSDATETIME()) AS MinutosSinImprimir,
          c.Nombre AS ClienteNombre,
          c.NumeroTelefono AS ClienteTelefono
        FROM Pedidos p
        INNER JOIN Clientes c ON p.ClienteID = c.ClienteID
        WHERE p.EstadoImpresion IN ('Pendiente', 'Error')
          AND DATEDIFF(MINUTE, p.Fecha, SYSDATETIME()) > @timeoutMinutes
          AND p.NotificacionImpresionEnviada IS NULL
        ORDER BY p.Fecha
      `);
    
    const pedidosProblematicos = result.recordset;
    
    if (pedidosProblematicos.length === 0) {
      logger.info('✅ Monitor de impresión: No hay pedidos pendientes de notificación');
      return;
    }
    
    logger.warn(`⚠️  Monitor de impresión: ${pedidosProblematicos.length} pedido(s) sin imprimir detectado(s)`);
    
    // Notificar cada pedido problemático
    for (const pedido of pedidosProblematicos) {
      try {
        // Preparar mensaje de notificación
        const mensaje = `Pedido ${pedido.Folio} lleva ${pedido.MinutosSinImprimir} minutos sin imprimir`;
        
        // Metadata adicional
        const metadata = {
          pedidoID: pedido.PedidoID,
          folio: pedido.Folio,
          cliente: pedido.ClienteNombre,
          telefono: pedido.ClienteTelefono,
          minutosEspera: pedido.MinutosSinImprimir,
          estadoImpresion: pedido.EstadoImpresion,
          fecha: pedido.Fecha
        };
        
        // Determinar severidad según tiempo de espera
        let severidad = 'WARNING';
        if (pedido.MinutosSinImprimir > 30) {
          severidad = 'CRITICAL';
        }
        
        // Enviar notificación a administradores
        await notifyAdmins('ORDER_NOT_PRINTED', mensaje, {
          metadata,
          severidad
        });
        
        // Marcar como notificado en la base de datos
        await pool.request()
          .input('pedidoID', sql.BigInt, pedido.PedidoID)
          .query(`
            UPDATE Pedidos 
            SET NotificacionImpresionEnviada = SYSDATETIME()
            WHERE PedidoID = @pedidoID
          `);
        
        logger.info(`📢 Notificación enviada para pedido ${pedido.Folio} (${pedido.MinutosSinImprimir} min)`);
        
      } catch (notifError) {
        logger.error(`Error notificando pedido ${pedido.Folio}:`, notifError);
        // Continuar con los demás pedidos aunque uno falle
      }
    }
    
  } catch (error) {
    logger.error('Error en checkUnprintedOrders:', error);
    // No re-lanzar el error para no romper el job programado
  }
}

/**
 * Inicia el monitoreo automático de pedidos no impresos
 * @returns {Promise<void>}
 */
export async function startMonitor() {
  try {
    // Cargar configuración
    await loadConfig();
    
    // Verificar si el monitoreo está habilitado
    if (!monitorConfig.enabled) {
      logger.info('⏸️  Monitor de impresión deshabilitado (PRINT_MONITOR_ENABLED=false)');
      return;
    }
    
    logger.info('🚀 Iniciando monitor de pedidos no impresos...');
    logger.info(`   Intervalo: cada ${monitorConfig.intervalMinutes} minutos`);
    logger.info(`   Timeout: ${monitorConfig.timeoutMinutes} minutos sin imprimir`);
    
    // Ejecutar primera verificación inmediatamente
    await checkUnprintedOrders();
    
    // Programar verificaciones periódicas
    // Cron expresión: cada X minutos
    const cronExpression = `*/${monitorConfig.intervalMinutes} * * * *`;
    
    monitorJob = cron.schedule(cronExpression, async () => {
      logger.info('⏰ Ejecutando verificación programada de pedidos no impresos...');
      await checkUnprintedOrders();
    });
    
    logger.info(`✅ Monitor de impresión iniciado (cada ${monitorConfig.intervalMinutes} min)`);
    
  } catch (error) {
    logger.error('Error iniciando monitor de impresión:', error);
    throw error;
  }
}

/**
 * Detiene el monitoreo automático
 * @returns {Promise<void>}
 */
export async function stopMonitor() {
  if (monitorJob) {
    monitorJob.stop();
    monitorJob = null;
    logger.info('⏹️  Monitor de impresión detenido');
  }
}

/**
 * Verifica el estado actual del monitor
 * @returns {Object} Estado del monitor
 */
export function getMonitorStatus() {
  return {
    running: monitorJob !== null,
    config: monitorConfig
  };
}

/**
 * Ejecuta una verificación manual (útil para testing)
 * @returns {Promise<void>}
 */
export async function runManualCheck() {
  logger.info('🔍 Ejecutando verificación manual de pedidos no impresos...');
  await checkUnprintedOrders();
}

/**
 * Recarga la configuración sin reiniciar el monitor
 * @returns {Promise<Object>} Nueva configuración
 */
export async function reloadConfig() {
  const newConfig = await loadConfig();
  logger.info('🔄 Configuración del monitor recargada:', newConfig);
  
  // Si el monitor estaba corriendo y se deshabilitó, detenerlo
  if (monitorJob && !newConfig.enabled) {
    await stopMonitor();
  }
  
  // Si el monitor no estaba corriendo y se habilitó, iniciarlo
  if (!monitorJob && newConfig.enabled) {
    await startMonitor();
  }
  
  return newConfig;
}

/**
 * Obtiene estadísticas de pedidos no impresos (útil para debugging)
 * @returns {Promise<Object>} Estadísticas
 */
export async function getUnprintedStats() {
  try {
    const pool = await dbService.getPool();
    
    const result = await pool.request()
      .input('timeoutMinutes', sql.Int, monitorConfig.timeoutMinutes)
      .query(`
        SELECT 
          COUNT(*) AS TotalPendientes,
          SUM(CASE WHEN EstadoImpresion = 'Pendiente' THEN 1 ELSE 0 END) AS EstadoPendiente,
          SUM(CASE WHEN EstadoImpresion = 'Error' THEN 1 ELSE 0 END) AS EstadoError,
          SUM(CASE WHEN NotificacionImpresionEnviada IS NULL THEN 1 ELSE 0 END) AS SinNotificar,
          SUM(CASE WHEN NotificacionImpresionEnviada IS NOT NULL THEN 1 ELSE 0 END) AS YaNotificados,
          MIN(DATEDIFF(MINUTE, Fecha, SYSDATETIME())) AS TiempoMinimo,
          MAX(DATEDIFF(MINUTE, Fecha, SYSDATETIME())) AS TiempoMaximo,
          AVG(DATEDIFF(MINUTE, Fecha, SYSDATETIME())) AS TiempoPromedio
        FROM Pedidos
        WHERE EstadoImpresion IN ('Pendiente', 'Error')
          AND DATEDIFF(MINUTE, Fecha, SYSDATETIME()) > @timeoutMinutes
      `);
    
    return result.recordset[0];
    
  } catch (error) {
    logger.error('Error obteniendo estadísticas de pedidos no impresos:', error);
    return null;
  }
}

/**
 * Resetea el estado de notificación de un pedido (útil para testing)
 * @param {number} pedidoID - ID del pedido a resetear
 * @returns {Promise<boolean>} True si se reseteó exitosamente
 */
export async function resetNotificationFlag(pedidoID) {
  try {
    const pool = await dbService.getPool();
    
    await pool.request()
      .input('pedidoID', sql.BigInt, pedidoID)
      .query(`
        UPDATE Pedidos 
        SET NotificacionImpresionEnviada = NULL
        WHERE PedidoID = @pedidoID
      `);
    
    logger.info(`🔄 Flag de notificación reseteado para pedido ${pedidoID}`);
    return true;
    
  } catch (error) {
    logger.error(`Error reseteando flag de notificación para pedido ${pedidoID}:`, error);
    return false;
  }
}

// Exportar todo como default también
export default {
  startMonitor,
  stopMonitor,
  getMonitorStatus,
  runManualCheck,
  reloadConfig,
  getUnprintedStats,
  resetNotificationFlag
};
