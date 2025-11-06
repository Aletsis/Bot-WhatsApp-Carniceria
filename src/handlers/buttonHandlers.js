import WhatsappService from '../services/whatsappService.js';
import SessionService from '../services/sessionService.js';
import DBService from '../services/dbService.js';
import { startSessionTimeout, clearSessionTimeout } from '../services/sessionTimeoutService.js';
import { printTicket, isPrintingEnabled } from '../services/printingService.js';
import logger from '../logger.js';

/**
 * Maneja todos los botones interactivos
 */
export async function handleButton(from, buttonId, session, numeroCorregido) {
  try {
    const cliente = await DBService.getClienteByPhone(from);
    
    switch (buttonId) {
      case 'BTN_HACER_PEDIDO':
        await handleMakePedidoButton(from, numeroCorregido, cliente);
        break;
        
      case 'AGREGAR_MAS':
        await handleAgregarMasButton(from, numeroCorregido);
        break;
        
      case 'CONFIRMAR_PEDIDO':
        await handleConfirmarPedidoButton(from, numeroCorregido, cliente);
        break;
        
      case 'CONFIRMAR_DIRECCION':
        await handleConfirmarDireccionButton(from, session, numeroCorregido, cliente);
        break;
        
      case 'CORREGIR_DIRECCION':
        await handleCorregirDireccionButton(from, numeroCorregido);
        break;
        
      case 'BTN_ESTATUS_PEDIDO':
        await handleEstatusPedidoButton(from, numeroCorregido);
        break;
        
      case 'BTN_INFORMACION':
        await handleInformacionButton(numeroCorregido);
        break;
        
      case 'DIRECCION':
        await handleDireccionButton(numeroCorregido);
        break;
        
      case 'TELEFONOS':
        await handleTelefonosButton(numeroCorregido);
        break;
        
      case 'HORARIOS':
        await handleHorariosButton(numeroCorregido);
        break;
        
      default:
        logger.warn('⚠️  Botón no reconocido: %s', buttonId);
        await WhatsappService.sendText(numeroCorregido, 
          'No reconocí esa opción. Escribe "menu" para ver las opciones disponibles.');
    }
  } catch (err) {
    logger.error('❌ Error en handleButton (%s) para %s: %s', buttonId, from, err.message);
    await WhatsappService.sendText(numeroCorregido, 
      '❌ Ocurrió un error al procesar tu solicitud. Por favor, intenta de nuevo o escribe "menu".');
    throw err;
  }
}

async function handleMakePedidoButton(from, numeroCorregido, cliente) {
  if (!cliente) {
    await WhatsappService.sendNameRequest(numeroCorregido);
    await SessionService.updateSession(from, { Estado: 'ASK_NAME' });
    startSessionTimeout(from, 'ASK_NAME');
  } else {
    await WhatsappService.sendOrderRequest(numeroCorregido);
    await SessionService.updateSession(from, { 
      Estado: 'TAKING_ORDER', 
      Buffer: JSON.stringify({ pedido: '' }) 
    });
    startSessionTimeout(from, 'TAKING_ORDER');
  }
  logger.info('🛒 Iniciando proceso de pedido para %s', from);
}

async function handleAgregarMasButton(from, numeroCorregido) {
  await WhatsappService.sendMoreProducts(numeroCorregido);
  await SessionService.updateSession(from, { Estado: 'TAKING_ORDER' });
  startSessionTimeout(from, 'TAKING_ORDER');
  logger.info('➕ Usuario agregando más productos: %s', from);
}

async function handleConfirmarPedidoButton(from, numeroCorregido, cliente) {
  // Validar que cliente existe
  if (!cliente) {
    logger.warn('⚠️  Cliente no encontrado al confirmar pedido: %s', from);
    await WhatsappService.sendText(numeroCorregido, 
      '❌ Lo siento, no encontré tu información. Por favor, escribe "reiniciar" para comenzar de nuevo.');
    await SessionService.updateSession(from, { Estado: 'START', Buffer: null });
    return;
  }
  
  // Validar que tenga dirección
  if (!cliente.Direccion) {
    await WhatsappService.sendText(numeroCorregido, 
      '📍 Primero necesito tu dirección de entrega.');
    await WhatsappService.sendAddressRequest(numeroCorregido);
    await SessionService.updateSession(from, { Estado: 'ASK_ADDRESS' });
    startSessionTimeout(from, 'ASK_ADDRESS');
    return;
  }
  
  await WhatsappService.sendAddressConfirmation(numeroCorregido, cliente.Direccion);
  await SessionService.updateSession(from, { Estado: 'AWAITING_CONFIRM' });
  startSessionTimeout(from, 'AWAITING_CONFIRM');
  logger.info('✅ Solicitando confirmación de dirección: %s', from);
}

async function handleConfirmarDireccionButton(from, session, numeroCorregido, cliente) {
  // Validar cliente
  if (!cliente) {
    logger.error('❌ Cliente no encontrado al confirmar dirección: %s', from);
    await WhatsappService.sendText(numeroCorregido, 
      '❌ Ocurrió un error. Por favor, reinicia el proceso escribiendo "menu".');
    await SessionService.updateSession(from, { Estado: 'START', Buffer: null });
    return;
  }
  
  const buf = JSON.parse(session.Buffer || '{"pedido": ""}');
  
  // Validar que haya pedido
  if (!buf.pedido || buf.pedido.trim() === "") {
    await WhatsappService.sendText(numeroCorregido, 
      '❌ No hay productos en tu pedido. Escribe "menu" para empezar de nuevo.');
    await SessionService.updateSession(from, { Estado: 'START', Buffer: null });
    return;
  }
  
  // Crear pedido en base de datos
  const folio = DBService.generateFolio();
  const pedidoID = await DBService.createPedido(cliente.ClienteID, folio, 'En espera de surtir', buf.pedido);
  
  // Intentar imprimir ticket (no bloquea si falla)
  if (isPrintingEnabled()) {
    try {
      await printTicket({
        pedidoID: pedidoID,  // ⚡ Pasar ID del pedido para rastreo de impresión
        folio: folio,
        cliente: cliente.Nombre,
        telefono: from,
        direccion: cliente.Direccion,
        contenido: buf.pedido
      });
      logger.info('🖨️  Ticket impreso exitosamente - Folio: %s', folio);
    } catch (printError) {
      // Log del error pero no interrumpe el flujo del pedido
      logger.error('⚠️  Error al imprimir ticket (pedido registrado) - Folio: %s - Error: %s', 
        folio, printError.message);
    }
  } else {
    logger.debug('🖨️  Impresión deshabilitada - Folio: %s', folio);
  }
  
  // Enviar confirmación al cliente
  await WhatsappService.sendOrderConfirmation(numeroCorregido, folio);
  await SessionService.updateSession(from, { Estado: 'START', Buffer: null });
  clearSessionTimeout(from); // Pedido completado, limpiar timeout
  
  logger.info('✅ Pedido confirmado - Folio: %s | Cliente: %s', folio, cliente.Nombre);
}

async function handleCorregirDireccionButton(from, numeroCorregido) {
  await WhatsappService.sendAddressUpdate(numeroCorregido);
  await SessionService.updateSession(from, { Estado: 'ASK_ADDRESS' });
  startSessionTimeout(from, 'ASK_ADDRESS');
  logger.info('📝 Usuario corrigiendo dirección: %s', from);
}

async function handleEstatusPedidoButton(from, numeroCorregido) {
  await WhatsappService.sendFindingLastOrderStatus(numeroCorregido);
  await WhatsappService.sendLastOrderStatus(numeroCorregido, from);
  await WhatsappService.sendAlternativeMenu(numeroCorregido);
  logger.info('📊 Consultando estado de pedido: %s', from);
}

async function handleInformacionButton(numeroCorregido) {
  await WhatsappService.sendInformationOptions(numeroCorregido);
  logger.info('ℹ️  Mostrando opciones de información');
}

async function handleDireccionButton(numeroCorregido) {
  await WhatsappService.sendBranchAddress(numeroCorregido);
  await WhatsappService.sendAlternativeMenu(numeroCorregido);
  logger.info('📍 Información de dirección enviada');
}

async function handleTelefonosButton(numeroCorregido) {
  await WhatsappService.sendPhoneNumbers(numeroCorregido);
  await WhatsappService.sendAlternativeMenu(numeroCorregido);
  logger.info('📞 Información de teléfonos enviada');
}

async function handleHorariosButton(numeroCorregido) {
  await WhatsappService.sendOpeningHours(numeroCorregido);
  await WhatsappService.sendAlternativeMenu(numeroCorregido);
  logger.info('🕐 Información de horarios enviada');
}
