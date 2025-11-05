import WhatsappService from '../services/whatsappService.js';
import SessionService from '../services/sessionService.js';
import DBService from '../services/dbService.js';
import { startSessionTimeout } from '../services/sessionTimeoutService.js';
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
  startSessionTimeout(from, 'MENU');
  
  logger.info('✅ Estado START procesado para %s', from);
}

/**
 * Maneja el estado MENU - Opciones principales
 */
export async function handleMenuState(from, text, buttonId, session, numeroCorregido) {
  if (buttonId) {
    logger.info('⏳ Esperando manejo de botón para %s', from);
    // Los botones se manejan en buttonHandlers.js
    return { shouldHandleButton: true };
  }
  
  const textLower = text.trim().toLowerCase();
  
  // Opciones válidas del menú
  const validOptions = ['hacer pedido', 'estado pedido', 'informacion', 'información'];
  
  if (textLower === 'hacer pedido') {
    const cliente = await DBService.getClienteByPhone(from);
    if (!cliente) {
      await WhatsappService.sendNameRequest(numeroCorregido);
      await SessionService.updateSession(from, { Estado: 'ASK_NAME' });
      startSessionTimeout(from, 'ASK_NAME');
    } else {
      await WhatsappService.sendOrderRequest(numeroCorregido);
      await SessionService.updateSession(from, { Estado: 'TAKING_ORDER', Buffer: JSON.stringify({ pedido: '' }) });
      startSessionTimeout(from, 'TAKING_ORDER');
    }
    return { shouldHandleButton: false };
  }
  
  if (textLower === 'estado pedido') {
    await WhatsappService.sendLastOrderStatus(numeroCorregido, from);
    return { shouldHandleButton: false };
  }
  
  if (textLower === 'informacion' || textLower === 'información') {
    await WhatsappService.sendInformationOptions(numeroCorregido);
    return { shouldHandleButton: false };
  }
  
  // Opción no reconocida - informar al usuario
  await WhatsappService.sendText(numeroCorregido,
    '❌ No entendí tu respuesta. Por favor, selecciona una opción del menú usando los botones o escribe:\n\n' +
    '📝 "Hacer pedido"\n' +
    '📊 "Estado pedido"\n' +
    'ℹ️ "Información"'
  );
  await WhatsappService.sendMainMenu(numeroCorregido);
  
  logger.warn('⚠️  Opción de menú no válida de %s: %s', from, text);
  return { shouldHandleButton: false };
}

/**
 * Maneja el estado ASK_NAME - Solicitar nombre del cliente
 */
export async function handleAskNameState(from, text, numeroCorregido) {
  // Validar longitud mínima de nombre (al menos 2 caracteres)
  const validation = validateText(text, 2, 100);
  
  if (!validation.isValid) {
    await WhatsappService.sendText(numeroCorregido, 
      `❌ ${validation.error}.\n\n` +
      '📝 Por favor, escribe tu nombre completo (mínimo 2 caracteres).\n' +
      'Ejemplo: Juan Pérez'
    );
    logger.warn('⚠️  Nombre inválido de %s: %s', from, validation.error);
    return;
  }
  
  // Validar que el nombre no sea solo números
  if (/^\d+$/.test(validation.sanitized)) {
    await WhatsappService.sendText(numeroCorregido,
      '❌ El nombre no puede ser solo números. Por favor, escribe tu nombre completo.\n' +
      'Ejemplo: Juan Pérez'
    );
    logger.warn('⚠️  Nombre solo números de %s', from);
    return;
  }
  
  // Validar que tenga al menos una letra
  if (!/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(validation.sanitized)) {
    await WhatsappService.sendText(numeroCorregido,
      '❌ El nombre debe contener letras. Por favor, escribe tu nombre completo.\n' +
      'Ejemplo: Juan Pérez'
    );
    logger.warn('⚠️  Nombre sin letras de %s', from);
    return;
  }
  
  await SessionService.updateSession(from, { 
    NombreTemporal: validation.sanitized, 
    Estado: 'ASK_ADDRESS' 
  });
  startSessionTimeout(from, 'ASK_ADDRESS');
  
  await WhatsappService.sendAddressRequest(numeroCorregido);
  logger.info('✅ Nombre capturado para %s: %s', from, validation.sanitized);
}

/**
 * Maneja el estado ASK_ADDRESS - Solicitar dirección
 */
export async function handleAskAddressState(from, text, session, numeroCorregido) {
  // Validar longitud mínima de dirección (al menos 10 caracteres)
  const validation = validateText(text, 10, 500);
  
  if (!validation.isValid) {
    await WhatsappService.sendText(numeroCorregido, 
      `❌ ${validation.error}.\n\n` +
      '📍 Por favor, escribe tu dirección completa (mínimo 10 caracteres).\n' +
      'Incluye: calle, número, colonia\n\n' +
      'Ejemplo: Av. Juárez 123, Col. Centro'
    );
    logger.warn('⚠️  Dirección inválida de %s: %s', from, validation.error);
    return;
  }
  
  // Validar que la dirección tenga al menos un número (número de calle)
  if (!/\d/.test(validation.sanitized)) {
    await WhatsappService.sendText(numeroCorregido,
      '❌ La dirección debe incluir un número de casa/edificio.\n\n' +
      '📍 Ejemplo: Av. Juárez 123, Col. Centro'
    );
    logger.warn('⚠️  Dirección sin número de %s', from);
    return;
  }
  
  // Validar que tenga letras (nombre de calle/colonia)
  if (!/[a-zA-ZáéíóúÁÉÍÓÚñÑ]{3,}/.test(validation.sanitized)) {
    await WhatsappService.sendText(numeroCorregido,
      '❌ La dirección debe incluir el nombre de la calle o colonia.\n\n' +
      '📍 Ejemplo: Av. Juárez 123, Col. Centro'
    );
    logger.warn('⚠️  Dirección sin nombre de calle de %s', from);
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
    startSessionTimeout(from, 'TAKING_ORDER');
    
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
      startSessionTimeout(from, 'TAKING_ORDER');
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
    // Validar que sea un botón esperado para este estado
    const validButtons = ['AGREGAR_MAS', 'CONFIRMAR_PEDIDO'];
    
    if (!validButtons.includes(buttonId)) {
      await WhatsappService.sendText(numeroCorregido,
        '❌ Esa opción no es válida ahora. Escribe los productos de tu pedido o usa los botones disponibles.'
      );
      logger.warn('⚠️  Botón no válido en TAKING_ORDER de %s: %s', from, buttonId);
      return { shouldHandleButton: false };
    }
    
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
    startSessionTimeout(from, 'AWAITING_CONFIRM');
    
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
export async function handleAwaitingConfirmState(from, buttonId, session, numeroCorregido) {
  if (buttonId) {
    // Validar que sea un botón esperado
    const validButtons = ['CONFIRMAR_PEDIDO', 'AGREGAR_MAS', 'CONFIRMAR_DIRECCION', 'CORREGIR_DIRECCION'];
    
    if (!validButtons.includes(buttonId)) {
      await WhatsappService.sendText(numeroCorregido,
        '❌ Esa opción no es válida en este momento. Por favor, usa los botones del pedido.'
      );
      logger.warn('⚠️  Botón no válido en AWAITING_CONFIRM de %s: %s', from, buttonId);
      return { shouldHandleButton: false };
    }
    
    return { shouldHandleButton: true };
  }
  
  // Si escribió texto en lugar de usar botones
  const buf = JSON.parse(session.Buffer || '{"pedido": ""}');
  await WhatsappService.sendText(numeroCorregido,
    '⚠️  Por favor, usa los botones para confirmar tu pedido o agregar más productos.\n\n' +
    'Tu pedido actual:\n' + buf.pedido
  );
  
  // Reenviar opciones
  await WhatsappService.sendOrderOptions(numeroCorregido, buf.pedido);
  
  logger.info('⏳ Usuario envió texto en lugar de botón en AWAITING_CONFIRM: %s', from);
  return { shouldHandleButton: false };
}
