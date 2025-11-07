import escpos from 'escpos';
const Network = escpos.Network;
import logger from '../logger.js';
import sql from 'mssql';
import { getPool } from './dbService.js';
import * as configService from './configService.js';
import { notifyAdmins } from './notificationService.js';

/**
 * Servicio de Impresión ESC/POS
 * 
 * Imprime tickets de pedidos en impresoras térmicas compatibles con ESC/POS.
 * Soporta impresoras conectadas por red (Network).
 * 
 * Configuración desde BD (tabla Configuraciones):
 * - PRINTER_ENABLED: true/false (habilita o deshabilita impresión)
 * - PRINTER_HOST: IP de la impresora (ej: 192.168.1.100)
 * - PRINTER_PORT: Puerto de la impresora (ej: 9100)
 * 
 * @module printingService
 */

// Contador de errores consecutivos para notificaciones
let consecutiveErrors = 0;
let lastErrorTime = null;

// Variables para cachear configuraciones de impresora
let cachedPrinterConfig = {
  enabled: null,
  host: null,
  port: null,
  lastUpdate: null
};

const CACHE_TTL = 60000; // 1 minuto de caché

/**
 * Obtiene las configuraciones de impresora desde la BD
 * Usa caché para evitar consultas excesivas
 */
async function getPrinterConfig() {
  const now = Date.now();
  
  // Si el caché es válido, usarlo
  if (cachedPrinterConfig.lastUpdate && (now - cachedPrinterConfig.lastUpdate) < CACHE_TTL) {
    return cachedPrinterConfig;
  }
  
  try {
    // Cargar configuraciones desde BD
    const enabled = await configService.getConfig('PRINTER_ENABLED');
    const host = await configService.getConfig('PRINTER_HOST');
    const port = await configService.getConfig('PRINTER_PORT');
    
    // Actualizar caché
    cachedPrinterConfig = {
      enabled: enabled?.Valor === 'true',
      host: host?.Valor || process.env.PRINTER_HOST || '192.168.1.100',
      port: parseInt(port?.Valor || process.env.PRINTER_PORT || '9100', 10),
      lastUpdate: now
    };
    
    return cachedPrinterConfig;
  } catch (error) {
    logger.error('❌ Error cargando configuraciones de impresora desde BD:', error.message);
    logger.warn('⚠️  Usando configuraciones de .env como fallback');
    
    // Fallback a .env si hay error
    return {
      enabled: process.env.PRINTER_ENABLED !== 'false',
      host: process.env.PRINTER_HOST || '192.168.1.100',
      port: parseInt(process.env.PRINTER_PORT || '9100', 10),
      lastUpdate: now
    };
  }
}

/**
 * Actualiza el estado de impresión de un pedido en la BD
 * @param {number} pedidoID - ID del pedido
 * @param {string} estado - Estado de impresión ('Pendiente', 'Impreso', 'Error', 'NoRequerida', 'Reimprimiendo')
 * @param {string} [error] - Mensaje de error (opcional, solo para estado 'Error')
 * @returns {Promise<void>}
 * @private
 */
async function updatePrintStatus(pedidoID, estado, error = null) {
  try {
    const pool = await getPool();
    
    await pool.request()
      .input('PedidoID', sql.Int, pedidoID)
      .input('EstadoImpresion', sql.NVarChar, estado)
      .input('FechaImpresion', sql.DateTime2, new Date())
      .input('ErrorImpresion', sql.NVarChar, error)
      .query(`
        UPDATE Pedidos 
        SET EstadoImpresion = @EstadoImpresion,
            FechaImpresion = @FechaImpresion,
            ErrorImpresion = @ErrorImpresion
        WHERE PedidoID = @PedidoID
      `);
    
    logger.debug('💾 Estado de impresión actualizado: Pedido %d → %s', pedidoID, estado);
  } catch (err) {
    logger.error('❌ Error actualizando estado de impresión:', err.message);
  }
}

/**
 * Abre la conexión con el dispositivo de impresión
 * @param {Object} device - Dispositivo escpos
 * @returns {Promise<void>}
 * @private
 */
function openDevice(device) {
  return new Promise((resolve, reject) => {
    device.open(err => {
      if (err) return reject(err);
      resolve();
    });
  });
}

/**
 * Imprime un ticket de pedido en impresora térmica
 * 
 * @param {Object} data - Datos del pedido
 * @param {number} data.pedidoID - ID del pedido en BD
 * @param {string} data.folio - Folio único del pedido
 * @param {string} data.cliente - Nombre del cliente
 * @param {string} data.telefono - Teléfono del cliente
 * @param {string} data.direccion - Dirección de entrega
 * @param {string} data.contenido - Contenido completo del pedido
 * @param {string} [data.fecha] - Fecha del pedido (opcional, usa fecha actual si no se proporciona)
 * @returns {Promise<void>}
 * @throws {Error} Si hay error de conexión o impresión
 */
export async function printTicket(data) {
  // Obtener configuración de impresora desde BD
  const config = await getPrinterConfig();
  
  if (!config.enabled) {
    logger.info('🖨️  Impresión deshabilitada. Ticket no impreso.');
    
    // Marcar como NoRequerida si hay pedidoID
    if (data.pedidoID) {
      await updatePrintStatus(data.pedidoID, 'NoRequerida');
    }
    
    return;
  }

  const device = new Network(config.host, config.port);
  const printer = new escpos.Printer(device);

  try {
    logger.info('🖨️  Conectando a impresora %s:%d...', config.host, config.port);
    await openDevice(device);

    const fecha = data.fecha || new Date().toLocaleString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    printer
      .font('a')
      .align('ct')
      .style('bu')
      .size(1, 1)
      .text('CARNICERÍAS LA BLANQUITA')
      .text('PEDIDO')
      .style('normal')
      .text('')
      .drawLine()
      .align('lt')
      .style('b')
      .text(`Folio: ${data.folio}`)
      .style('normal')
      .text(`Fecha: ${fecha}`)
      .text('')
      .text(`Cliente: ${data.cliente}`)
      .text(`Telefono: ${data.telefono}`)
      .text(`Direccion: ${data.direccion}`)
      .text('')
      .drawLine()
      .text('DETALLE DEL PEDIDO:')
      .drawLine()
      .text(data.contenido)
      .text('')
      .drawLine()
      .align('ct')
      .text('Gracias por su preferencia')
      .text('')
      .text('')
      .cut()
      .close();

    logger.info('✅ Ticket impreso exitosamente - Folio: %s', data.folio);
    
    // Resetear contador de errores consecutivos al tener éxito
    consecutiveErrors = 0;
    lastErrorTime = null;
    
    // Actualizar estado a Impreso
    if (data.pedidoID) {
      await updatePrintStatus(data.pedidoID, 'Impreso');
    }
    
  } catch (err) {
    logger.error('❌ Error al imprimir ticket - Folio: %s - Error: %s', data.folio, err.message);
    
    // Actualizar estado a Error con mensaje
    if (data.pedidoID) {
      await updatePrintStatus(data.pedidoID, 'Error', err.message);
    }
    
    // Contabilizar error consecutivo
    const now = Date.now();
    const threshold = parseInt(await configService.getConfig('PRINTING_ERROR_THRESHOLD')?.valor || '3');
    
    // Si el último error fue hace menos de 10 minutos, incrementar contador
    if (lastErrorTime && (now - lastErrorTime) < 600000) { // 10 minutos
      consecutiveErrors++;
    } else {
      // Reiniciar contador si pasó mucho tiempo
      consecutiveErrors = 1;
    }
    
    lastErrorTime = now;
    
    // Notificar error individual
    await notifyAdmins(
      'PRINTING_ERROR',
      `Error al imprimir pedido.\n\n` +
      `Folio: ${data.folio}\n` +
      `Pedido ID: ${data.pedidoID || 'N/A'}\n` +
      `Cliente: ${data.cliente}\n` +
      `Error: ${err.message}\n\n` +
      `Acción: Verificar estado de la impresora y reintentar manualmente.`,
      {
        severidad: 'ERROR',
        metadata: {
          pedidoID: data.pedidoID,
          folio: data.folio,
          error: err.message,
          cliente: data.cliente
        }
      }
    ).catch(notifyError => {
      // No interrumpir el flujo si falla la notificación
      logger.error('Error enviando notificación de error de impresión:', notifyError.message);
    });
    
    // Si hay muchos errores consecutivos, enviar alerta crítica
    if (consecutiveErrors >= threshold) {
      await notifyAdmins(
        'PRINTING_RECURRING',
        `⚠️ ALERTA CRÍTICA: Se han detectado ${consecutiveErrors} errores de impresión consecutivos en los últimos 10 minutos.\n\n` +
        `Último error: ${err.message}\n\n` +
        `Acción recomendada:\n` +
        `1. Verificar conexión física de la impresora\n` +
        `2. Verificar conexión de red (${data.printerIP || 'N/A'})\n` +
        `3. Reiniciar impresora si es necesario\n` +
        `4. Revisar papel y otros consumibles`,
        {
          severidad: 'CRITICAL',
          metadata: {
            consecutiveErrors,
            lastError: err.message,
            printerIP: data.printerIP
          }
        }
      ).catch(notifyError => {
        logger.error('Error enviando notificación crítica:', notifyError.message);
      });
      
      // Reiniciar contador después de notificar
      consecutiveErrors = 0;
    }
    
    throw err;
  }
}

