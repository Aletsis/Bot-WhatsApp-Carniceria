import WhatsappService from '../services/whatsappService.js';
import SessionService from '../services/sessionService.js';
import DBService from '../services/dbService.js';
import logger from '../logger.js';
import { validateText } from '../utils/validators.js';

/**
 * Maneja el estado START - Saludo inicial
 */
export async function handleStartState(from, numeroCorregido) {
  const cliente = await DBService.getClienteByPhone(from);
  
  if (cliente) {
    await WhatsappService.sendPersonalizedGreeting(cliente.Nombre, numeroCorregido);
  } else {
    await WhatsappService.sendGenericGreeting(numeroCorregido);
  }
  
  await WhatsappService.sendMainMenu(numeroCorregido);
  await SessionService.updateSession(from, { Estado: 'MENU' });
  
  logger.info('✅ Estado START procesado para %s', from);
}

/**
 * Maneja el estado MENU - Opciones principales
 */
export async function handleMenuState(from, text, buttonId, session, numeroCorregido) {
  if (buttonId) {
    // Los botones se manejan en buttonHandlers.js
    return { shouldHandleButton: true };
  }
  
  const textLower = text.trim().toLowerCase();
  
  if (textLower === 'hacer pedido') {
    const cliente = await DBService.getClienteByPhone(from);
    if (!cliente) {
      await WhatsappService.sendNameRequest(numeroCorregido);
      await SessionService.updateSession(from, { Estado: 'ASK_NAME' });
    } else {
      await WhatsappService.sendOrderRequest(numeroCorregido);
      await SessionService.updateSession(from, { Estado: 'TAKING_ORDER', Buffer: JSON.stringify({ pedido: '' }) });
    }
    return { shouldHandleButton: false };
  }
  
  if (textLower === 'estado pedido') {
    await WhatsappService.sendLastOrderStatus(numeroCorregido, from);
    return { shouldHandleButton: false };
  }
  
  // Opción no reconocida, mostrar menú nuevamente
  await WhatsappService.sendMainMenu(numeroCorregido);
  return { shouldHandleButton: false };
}

/**
 * Maneja el estado ASK_NAME - Solicitar nombre del cliente
 */
export async function handleAskNameState(from, text, numeroCorregido) {
  const validation = validateText(text, 2, 200);
  
  if (!validation.isValid) {
    await WhatsappService.sendText(numeroCorregido, 
      `❌ ${validation.error}. Por favor, escribe tu nombre completo.`);
    return;
  }
  
  await SessionService.updateSession(from, { 
    NombreTemporal: validation.sanitized, 
    Estado: 'ASK_ADDRESS' 
  });
  
  await WhatsappService.sendAddressRequest(numeroCorregido);
  logger.info('✅ Nombre capturado para %s: %s', from, validation.sanitized);
}

/**
 * Maneja el estado ASK_ADDRESS - Solicitar dirección
 */
export async function handleAskAddressState(from, text, session, numeroCorregido) {
  const validation = validateText(text, 10, 500);
  
  if (!validation.isValid) {
    await WhatsappService.sendText(numeroCorregido, 
      `❌ ${validation.error}. Por favor, escribe tu dirección completa (calle, número, colonia, CP, ciudad).`);
    return;
  }
  
  const customer = await DBService.getClienteByPhone(from);
  
  if (!customer) {
    // Cliente nuevo - crear registro
    await DBService.createCliente({ 
      telefono: from, 
      nombre: session.NombreTemporal || 'Cliente', 
      direccion: validation.sanitized 
    });
    
    await WhatsappService.sendText(numeroCorregido, 
      '✅ Perfecto! Tu información ha sido guardada.');
    await WhatsappService.sendOrderRequest(numeroCorregido);
    await SessionService.updateSession(from, { 
      Estado: 'TAKING_ORDER', 
      NombreTemporal: null,
      Buffer: JSON.stringify({ pedido: '' })
    });
    
    logger.info('✅ Cliente nuevo registrado: %s - %s', from, session.NombreTemporal);
  } else {
    // Cliente existente - actualizar dirección
    await DBService.updateCliente(from, validation.sanitized);
    
    const buf = JSON.parse(session.Buffer || '{"pedido": ""}');
    
    if (!buf.pedido || buf.pedido.trim() === "") {
      await WhatsappService.sendText(numeroCorregido, 
        '✅ Dirección actualizada. Ahora escribe tu pedido.');
      await WhatsappService.sendOrderRequest(numeroCorregido);
      await SessionService.updateSession(from, { 
        Estado: 'TAKING_ORDER',
        Buffer: JSON.stringify({ pedido: '' })
      });
    } else {
      // Ya tenía un pedido en buffer, confirmar
      const folio = DBService.generateFolio();
      await DBService.createPedido(customer.ClienteID, folio, 'En espera de surtir', buf.pedido);
      await WhatsappService.sendOrderConfirmation(numeroCorregido, folio);
      await SessionService.updateSession(from, { Estado: 'START', Buffer: null });
      
      logger.info('✅ Pedido creado con folio: %s', folio);
    }
  }
}

/**
 * Maneja el estado TAKING_ORDER - Recibir items del pedido
 */
export async function handleTakingOrderState(from, text, buttonId, session, numeroCorregido) {
  if (buttonId) {
    return { shouldHandleButton: true };
  }
  
  const textLower = text.trim().toLowerCase();
  
  // Usuario quiere finalizar
  if (textLower === 'finalizar pedido' || textLower === 'finalizar') {
    const buf = JSON.parse(session.Buffer || '{"pedido": ""}');
    
    if (!buf.pedido || buf.pedido.trim() === "") {
      await WhatsappService.sendText(numeroCorregido,
        '❌ No hay artículos en el pedido. Escribe los productos que deseas (ej: "2 kg de pollo").'
      );
      return { shouldHandleButton: false };
    }
    
    await WhatsappService.sendOrderOptions(numeroCorregido, buf.pedido);
    await SessionService.updateSession(from, { Estado: 'AWAITING_CONFIRM' });
    
    logger.info('📋 Pedido listo para confirmar: %s', from);
    return { shouldHandleButton: false };
  }
  
  // Validar que el texto no esté vacío
  const validation = validateText(text, 3, 200);
  
  if (!validation.isValid) {
    await WhatsappService.sendText(numeroCorregido, 
      `❌ ${validation.error}. Escribe productos válidos (ej: "2 kg de pollo").`);
    return { shouldHandleButton: false };
  }
  
  // Agregar item al pedido
  const buf = JSON.parse(session.Buffer || '{"pedido": ""}');
  buf.pedido = (buf.pedido || "") + (buf.pedido ? "\n" : "") + validation.sanitized;
  
  await SessionService.updateSession(from, { Buffer: JSON.stringify(buf) });
  await WhatsappService.sendOrderOptions(numeroCorregido, buf.pedido);
  
  logger.info('➕ Item agregado al pedido de %s', from);
  return { shouldHandleButton: false };
}

/**
 * Maneja el estado AWAITING_CONFIRM - Esperando confirmación final
 */
export async function handleAwaitingConfirmState(from, buttonId) {
  if (buttonId) {
    return { shouldHandleButton: true };
  }
  
  // Si no presionó un botón, no hacer nada
  logger.info('⏳ Esperando confirmación de botón para %s', from);
  return { shouldHandleButton: false };
}
