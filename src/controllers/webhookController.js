import WhatsappService from '../services/whatsappService.js';
import SessionService from '../services/sessionService.js';
import DBService from '../services/dbService.js';
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

  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
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
    const numeroCorregido = from.slice(0, 2) + from.slice(3);
    const buttonId = message.interactive?.button_reply?.id;

    logger.info('📱 Mensaje recibido de %s | texto="%s" | botón=%s', from, text.substring(0, 50), buttonId || 'ninguno');

    // Comando global para cancelar/reiniciar
    const textLower = text.trim().toLowerCase();
    if (['cancelar', 'reiniciar', 'salir', 'menu', 'inicio'].includes(textLower)) {
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
    }

    const session = await SessionService.getOrCreateSession(from);
    logger.info('Sesión actual para %s: %o', from, session);
    logger.info('Estado de sesión: %s', session.Estado);
    logger.info('Llamando a handleBySessionState...');
    await handleBySessionState(from, text, session, numeroCorregido, buttonId);
    
    return res.sendStatus(200);
  } catch (err) {
    logger.error('❌ Error al procesar mensaje:', err.message, err.stack);
    return res.status(500).send({ error: 'Internal server error' });
  }
}

async function handleBySessionState(from, text, session, numeroCorregido, buttonId) {
    const state = session?.Estado || 'START';
    let result;
    
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
}