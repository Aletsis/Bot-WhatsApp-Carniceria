import debug from 'debug';
import WhatsappService from '../services/whatsappService.js';
import SessionService from '../services/sessionService.js';
import {printTicket} from '../services/printingService.js';
import DBService from '../services/dbService.js';
import e from 'express';

const log = debug('carnibot:webhook');

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
    if (!message) return res.sendStatus(200);

    const from = message.from; // phone number
    const text = message.text?.body || '';
    const numeroCorregido = from.slice(0, 2) + from.slice(2 + 1);
    const buttonId = message.interactive?.button_reply?.id;

    console.log('received from %s text=%s button=%s', from, text, buttonId);

    //Verificamos si existe una conversacion con el numero de telefono o creamos una nueva
    const session = await SessionService.getOrCreateSession(from);
    await handleBySessionState(from, text, session, numeroCorregido, buttonId);
    return res.sendStatus(200);
    } catch (err) {
        console.error('❌ Error al procesar mensaje:', err.message);
        return res.sendStatus(500);
    }
}
async function handleBySessionState(from, text, session, numeroCorregido, buttonId) {
    const state = session?.Estado || 'START';
    //Dependiendo del estado de la conversacion, se ejecutara el codigo correspondiente
    switch (state) {
        case 'START': {
            //Verificamos is el cliente existe o no
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
            const cliente = await DBService.getClienteByPhone(from);
            if (!cliente) {
                await DBService.createCliente({ telefono: from, nombre: session.NombreTemporal || '', direccion: text });
                await WhatsappService.sendOrderRequest(numeroCorregido);
                await SessionService.updateSession(from, { Estado: 'TAKING_ORDER', NombreTemporal: null });
            } else {
                await DBService.updateCliente(from, text);
                const buf = JSON.parse(session.Buffer || '{"pedido": ""}');
                const folio = DBService.generateFolio();
                await DBService.createPedido(cliente.ClienteID, folio, 'En espera de surtir', buf.pedido);
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
            break;
        case 'CONFIRMAR_PEDIDO':
            await WhatsappService.sendAddressConfirmation(numeroCorregido, cliente.Direccion );
            await SessionService.updateSession(from, { Estado: 'AWAITING_CONFIRM' });
            break;
        case 'CONFIRMAR_DIRECCION':
            const buf = JSON.parse(session.Buffer || '{"pedido": ""}');
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
            await WhatsappService.sendLastOrderStatus(numeroCorregido);
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
    }
}