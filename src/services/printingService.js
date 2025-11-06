import escpos from 'escpos';
const Network = escpos.Network;
import logger from '../logger.js';

/**
 * Servicio de Impresión ESC/POS
 * 
 * Imprime tickets de pedidos en impresoras térmicas compatibles con ESC/POS.
 * Soporta impresoras conectadas por red (Network).
 * 
 * Configuración requerida en .env:
 * - PRINTER_ENABLED: true/false (habilita o deshabilita impresión)
 * - PRINTER_HOST: IP de la impresora (ej: 192.168.0.100)
 * - PRINTER_PORT: Puerto de la impresora (ej: 9100)
 * 
 * @module printingService
 */

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
  // Verificar si la impresión está habilitada
  const printerEnabled = process.env.PRINTER_ENABLED === 'true';
  
  if (!printerEnabled) {
    logger.info('🖨️  Impresión deshabilitada (PRINTER_ENABLED=false). Ticket no impreso.');
    return;
  }

  const host = process.env.PRINTER_HOST || '192.168.0.100';
  const port = parseInt(process.env.PRINTER_PORT || '9100', 10);

  const device = new Network(host, port);
  const printer = new escpos.Printer(device);

  try {
    logger.info('🖨️  Conectando a impresora %s:%d...', host, port);
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
      .text('CARNICERÍA')
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
    
  } catch (err) {
    logger.error('❌ Error al imprimir ticket - Folio: %s - Error: %s', data.folio, err.message);
    throw err;
  }
}

/**
 * Verifica si el servicio de impresión está habilitado
 * @returns {boolean}
 */
export function isPrintingEnabled() {
  return process.env.PRINTER_ENABLED === 'true';
}

/**
 * Obtiene la configuración actual de la impresora
 * @returns {Object} Configuración de la impresora
 */
export function getPrinterConfig() {
  return {
    enabled: process.env.PRINTER_ENABLED === 'true',
    host: process.env.PRINTER_HOST || '192.168.0.100',
    port: parseInt(process.env.PRINTER_PORT || '9100', 10)
  };
}