import WhatsappService from '../services/whatsappService.js';
import SessionService from '../services/sessionService.js';
import {printTicket} from '../services/printingService.js';
import DBService from '../services/dbService.js';
import logger from '../logger.js';


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
    await handleBySessionState(from, text, session, numeroCorregido, buttonId);
    
    return res.sendStatus(200);
  } catch (err) {
    logger.error('❌ Error al procesar mensaje:', err.message, err.stack);
    return res.status(500).send({ error: 'Internal server error' });
  }
}

async function handleBySessionState(from, text, session, numeroCorregido, buttonId) {
    const state = session?.Estado || 'START';
    
    switch (state) {
        case 'START': {
          const cliente = await DBService.getClienteByPhone(from);
    
          if (cliente) {
            await WhatsappService.sendPersonalizedGreeting(cliente.Nombre, numeroCorregido);
            await WhatsappService.sendMainMenu(numeroCorregido);
            await SessionService.updateSession(from, { Estado: 'MENU' });
          } else {
            await WhatsappService.sendGenericGreeting(numeroCorregido);
            await WhatsappService.sendMainMenu(numeroCorregido);
            await SessionService.updateSession(from, { Estado: 'MENU' });
          }
          return;
        }
        
        case 'MENU':
            if (buttonId) {
                await handleButton(from, buttonId, session, numeroCorregido);
                return;
            } else {
                if (text.trim().toLowerCase() === 'hacer pedido') {
                    const cliente = await DBService.getClienteByPhone(from);
                    if (!cliente) {
                        await WhatsappService.sendNameRequest(numeroCorregido);
                        await SessionService.updateSession(from, { Estado: 'ASK_NAME' });
                    } else {
                        await WhatsappService.sendOrderRequest(numeroCorregido);
                        await SessionService.updateSession(from, { Estado: 'TAKING_ORDER', Buffer: JSON.stringify({ items: [] }) });
                    }
                }
                if (text.trim().toLowerCase() === 'estado pedido') {
                    await WhatsappService.sendLastOrderStatus(numeroCorregido);
                    return;
                }
                await WhatsappService.sendMainMenu(numeroCorregido);
                return;
            }
            
        case 'ASK_NAME':
            await SessionService.updateSession(from, { NombreTemporal: text, Estado: 'ASK_ADDRESS' });
            await WhatsappService.sendAddressRequest(numeroCorregido);
            return;
            
        case 'ASK_ADDRESS':
            const customer = await DBService.getClienteByPhone(from);
            if (!customer) {
                await DBService.createCliente({ telefono: from, nombre: session.NombreTemporal || '', direccion: text });
                await WhatsappService.sendOrderRequest(numeroCorregido);
                await SessionService.updateSession(from, { Estado: 'TAKING_ORDER', NombreTemporal: null });
            } else {
                await DBService.updateCliente(from, text);
                const buf = JSON.parse(session.Buffer || '{"pedido": ""}');
                const folio = DBService.generateFolio();
                await DBService.createPedido(customer.ClienteID, folio, 'En espera de surtir', buf.pedido);
                await WhatsappService.sendOrderConfirmation(numeroCorregido, folio);
                await SessionService.updateSession(from, { Estado: 'START', Buffer: null });
            }
            return;
            
        case 'TAKING_ORDER':
            if (buttonId) {
                await handleButton(from, buttonId, session, numeroCorregido);
                return;
            }
            if (text.trim().toLowerCase() === 'finalizar pedido') {
                const buf = JSON.parse(session.Buffer || '{"pedido": ""}');
                if (!buf.pedido || buf.pedido.trim() === "") {
                    await WhatsappService.sendText(
                      numeroCorregido,
                      'No hay artículos en el pedido. Escribe los productos (ej: "2 kg de pollo").'
                    );
                    return;
                }
                await WhatsappService.sendOrderOptions(numeroCorregido, buf.pedido);
                await SessionService.updateSession(from, { Estado: 'AWAITING_CONFIRM' });
                return;
            }
            const buf = JSON.parse(session.Buffer || '{"pedido": ""}');
            buf.pedido = (buf.pedido || "") + (buf.pedido ? "\n" : "") + text;
            await SessionService.updateSession(from, { Buffer: JSON.stringify(buf) });
            await WhatsappService.sendOrderOptions(numeroCorregido, buf.pedido);
            return;
            
        case 'AWAITING_CONFIRM':
            if (buttonId){
                await handleButton(from, buttonId, session, numeroCorregido);
                return;
            }
            break;
    }
}

async function handleButton(from, buttonId, session, numeroCorregido) {
    const cliente = await DBService.getClienteByPhone(from);
    
    switch (buttonId) {
        case 'BTN_HACER_PEDIDO': {
            if (!cliente) {
                await WhatsappService.sendNameRequest(numeroCorregido);
                await SessionService.updateSession(from, { Estado: 'ASK_NAME' });
            } else {
                await WhatsappService.sendOrderRequest(numeroCorregido);
                await SessionService.updateSession(from, { Estado: 'TAKING_ORDER', Buffer: JSON.stringify({ items: [] }) });
            }
            break;
        }
        
        case 'AGREGAR_MAS':
            await WhatsappService.sendMoreProducts(numeroCorregido);
            await SessionService.updateSession(from, { Estado: 'TAKING_ORDER' });
            break;
            
        case 'CONFIRMAR_PEDIDO':
            // ✅ ARREGLO CRÍTICO: Validar que cliente existe
            if (!cliente) {
                logger.warn('⚠️  Cliente no encontrado al confirmar pedido para %s', from);
                await WhatsappService.sendText(numeroCorregido, 
                    '❌ Lo siento, no encontré tu información. Por favor, escribe "reiniciar" para comenzar de nuevo.');
                await SessionService.updateSession(from, { Estado: 'START', Buffer: null });
                return;
            }
            
            if (!cliente.Direccion) {
                await WhatsappService.sendText(numeroCorregido, 
                    '📍 Primero necesito tu dirección de entrega.');
                await WhatsappService.sendAddressRequest(numeroCorregido);
                await SessionService.updateSession(from, { Estado: 'ASK_ADDRESS' });
                return;
            }
            
            await WhatsappService.sendAddressConfirmation(numeroCorregido, cliente.Direccion);
            await SessionService.updateSession(from, { Estado: 'AWAITING_CONFIRM' });
            break;
            
        case 'CONFIRMAR_DIRECCION':
            // ✅ ARREGLO CRÍTICO: Validar cliente antes de crear pedido
            if (!cliente) {
                logger.error('❌ Cliente no encontrado al confirmar dirección para %s', from);
                await WhatsappService.sendText(numeroCorregido, 
                    '❌ Ocurrió un error. Por favor, reinicia el proceso escribiendo "menu".');
                await SessionService.updateSession(from, { Estado: 'START', Buffer: null });
                return;
            }
            
            const buf = JSON.parse(session.Buffer || '{"pedido": ""}');
            
            if (!buf.pedido || buf.pedido.trim() === "") {
                await WhatsappService.sendText(numeroCorregido, 
                    '❌ No hay productos en tu pedido. Escribe "menu" para empezar de nuevo.');
                await SessionService.updateSession(from, { Estado: 'START', Buffer: null });
                return;
            }
            
            const folio = DBService.generateFolio();
            await DBService.createPedido(cliente.ClienteID, folio, 'En espera de surtir', buf.pedido);
            await WhatsappService.sendOrderConfirmation(numeroCorregido, folio);
            await SessionService.updateSession(from, { Estado: 'START', Buffer: null });
            break;
            
        case 'CORREGIR_DIRECCION':
            await WhatsappService.sendAddressUpdate(numeroCorregido);
            await SessionService.updateSession(from, { Estado: 'ASK_ADDRESS' });
            break;
            
        case 'BTN_ESTATUS_PEDIDO':
            await WhatsappService.sendFindingLastOrderStatus(numeroCorregido);
            await WhatsappService.sendLastOrderStatus(numeroCorregido, from);
            await WhatsappService.sendAlternativeMenu(numeroCorregido);
            break;
            
        case 'BTN_INFORMACION':
            await WhatsappService.sendInformationOptions(numeroCorregido);
            return;
            
        case 'DIRECCION':
            await WhatsappService.sendBranchAddress(numeroCorregido);
            await WhatsappService.sendAlternativeMenu(numeroCorregido);
            break;
            
        case 'TELEFONOS':
            await WhatsappService.sendPhoneNumbers(numeroCorregido);
            await WhatsappService.sendAlternativeMenu(numeroCorregido);
            break;
            
        case 'HORARIOS':
            await WhatsappService.sendOpeningHours(numeroCorregido);
            await WhatsappService.sendAlternativeMenu(numeroCorregido);
            break;
            
        default:
            logger.warn('⚠️  Botón no reconocido: %s', buttonId);
            await WhatsappService.sendText(numeroCorregido, 
                'No reconocí esa opción. Escribe "menu" para ver las opciones disponibles.');
    }
}