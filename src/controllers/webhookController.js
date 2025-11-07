import WhatsappService from '../services/whatsappService.js';
import SessionService from '../services/sessionService.js';
import DBService from '../services/dbService.js';
import { clearSessionTimeout, resetSessionTimeout } from '../services/sessionTimeoutService.js';
import { saveMessage } from '../services/messageService.js';
import logger from '../logger.js';
import { handleButton } from '../handlers/buttonHandlers.js';
import {
  handleStartState,
  handleMenuState,
  handleAskNameState,
  handleAskAddressState,
  handleTakingOrderState,
  handleAwaitingConfirmState
} from '../handlers/stateHandlers.js';


export async function verifyWebhookHandler(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Verificar que WEBHOOK_VERIFY_TOKEN esté configurado
  if (!process.env.WEBHOOK_VERIFY_TOKEN) {
    logger.error('❌ WEBHOOK_VERIFY_TOKEN no está configurado en .env');
    return res.status(500).json({ 
      error: 'Server configuration error',
      message: 'WEBHOOK_VERIFY_TOKEN not configured' 
    });
  }

  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    logger.info('✅ Webhook verificado exitosamente');
    return res.status(200).send(challenge);
  }
  
  logger.warn('⚠️ Intento de verificación de webhook fallido - Token: %s', token);
  return res.sendStatus(403);
}

export async function messageWebhookHandler(req, res) {
  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];
    
    if (!message || message.type === 'status') {
        return res.sendStatus(200);
    }
    if (!message.text?.body && !message.interactive?.button_reply) {
        logger.warn('Mensaje sin contenido procesable');
        return res.sendStatus(200);
    }

    const from = message.from;
    const text = message.text?.body || '';
    const buttonId = message.interactive?.button_reply?.id;
    const numeroCorregido = from;

    logger.info('📱 Mensaje recibido de %s | texto="%s" | botón=%s', from, text.substring(0, 50), buttonId || 'ninguno');

    // Guardar mensaje recibido en BD
    try {
      const tipoMensaje = message.type || 'text';
      let contenido = text;
      
      // Si es un botón, guardar el título del botón presionado
      if (buttonId && message.interactive?.button_reply) {
        const buttonTitle = message.interactive.button_reply.title;
        contenido = buttonTitle || buttonId;
      }
      
      const metadata = {
        messageId: message.id,
        timestamp: message.timestamp,
        type: message.type,
        interactive: message.interactive || null,
        buttonId: buttonId || null
      };
      
      await saveMessage(from, 'recibido', contenido, tipoMensaje, metadata);
    } catch (saveErr) {
      logger.error('[webhookController] Error guardando mensaje recibido:', saveErr);
      // No interrumpir el flujo si falla el guardado
    }

    // Comando global para cancelar/reiniciar
    const textLower = text.trim().toLowerCase();
    if (['cancelar', 'reiniciar', 'salir', 'menu', 'inicio'].includes(textLower)) {
      try {
        // Limpiar timeout al reiniciar
        clearSessionTimeout(from);
        
        await SessionService.updateSession(from, { Estado: 'START', Buffer: null, NombreTemporal: null });
        await WhatsappService.sendText(numeroCorregido, '🔄 Proceso cancelado. Volvamos al inicio.');
        
        const cliente = await DBService.getClienteByPhone(from);
        if (cliente) {
          await WhatsappService.sendPersonalizedGreeting(cliente.Nombre, numeroCorregido);
        } else {
          await WhatsappService.sendGenericGreeting(numeroCorregido);
        }
        await WhatsappService.sendMainMenu(numeroCorregido);
        
        return res.sendStatus(200);
      } catch (err) {
        logger.error('❌ Error en comando de reinicio: %s', err.message);
        // Aún así, respondemos 200 para no bloquear WhatsApp
        return res.sendStatus(200);
      }
    }

    const session = await SessionService.getOrCreateSession(from);
    
    // Reiniciar timeout cada vez que el usuario interactúa
    resetSessionTimeout(from, session.Estado);
    
    await handleBySessionState(from, text, session, numeroCorregido, buttonId);
    
    return res.sendStatus(200);
  } catch (err) {
    logger.error('❌ Error al procesar mensaje:', err.message, err.stack);
    
    // Intentar enviar mensaje de error al usuario
    try {
      const numeroCorregido = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from;
      if (numeroCorregido) {
        const num = numeroCorregido.slice(0, 2) + numeroCorregido.slice(3);
        await WhatsappService.sendText(num, 
          '❌ Lo siento, ocurrió un error técnico. Por favor, intenta de nuevo en unos momentos.');
      }
    } catch (notifyErr) {
      logger.error('❌ No se pudo notificar error al usuario: %s', notifyErr.message);
    }
    
    // Siempre respondemos 200 a WhatsApp para evitar reintentos
    return res.sendStatus(200);
  }
}

async function handleBySessionState(from, text, session, numeroCorregido, buttonId) {
    const state = session?.Estado || 'START';
    let result;
    
    try {
      switch (state) {
          case 'START':
              await handleStartState(from, numeroCorregido);
              break;
          
          case 'MENU':
              result = await handleMenuState(from, text, buttonId, session, numeroCorregido);
              if (result?.shouldHandleButton && buttonId) {
                  await handleButton(from, buttonId, session, numeroCorregido);
              }
              break;
              
          case 'ASK_NAME':
              await handleAskNameState(from, text, numeroCorregido);
              break;
              
          case 'ASK_ADDRESS':
              await handleAskAddressState(from, text, session, numeroCorregido);
              break;
              
          case 'TAKING_ORDER':
              result = await handleTakingOrderState(from, text, buttonId, session, numeroCorregido);
              if (result?.shouldHandleButton && buttonId) {
                  await handleButton(from, buttonId, session, numeroCorregido);
              }
              break;
              
          case 'AWAITING_CONFIRM':
              result = await handleAwaitingConfirmState(from, buttonId, session, numeroCorregido);
              if (result?.shouldHandleButton && buttonId) {
                  await handleButton(from, buttonId, session, numeroCorregido);
              }
              break;
              
          default:
              logger.warn('⚠️  Estado no reconocido: %s para %s', state, from);
              await WhatsappService.sendText(numeroCorregido, 
                  'Algo salió mal. Escribe "reiniciar" para comenzar de nuevo.');
      }
    } catch (err) {
      logger.error('❌ Error en handleBySessionState (estado: %s) para %s: %s', state, from, err.message);
      logger.error('Stack trace:', err.stack);
      
      // Intentar notificar al usuario
      try {
        await WhatsappService.sendText(numeroCorregido, 
          '❌ Ocurrió un error. Por favor, escribe "menu" para reintentar.');
      } catch (notifyErr) {
        logger.error('❌ No se pudo enviar mensaje de error: %s', notifyErr.message);
      }
      
      // No propagar el error - ya fue logueado y notificado
    }
}