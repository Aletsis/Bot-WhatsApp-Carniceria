import axios from 'axios';
import dotenv from 'dotenv';
import dbService from '../services/dbService.js';

dotenv.config();

const API_BASE = (id) => `https://graph.facebook.com/v21.0/${id}/messages`;
const PHONE_ID = process.env.PHONE_NUMBER_ID;
const TOKEN = process.env.WHATSAPP_TOKEN;

async function apiSend(payload) {
    try {
        const res = await axios.post(API_BASE(PHONE_ID), payload, {
        headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }
        });
        return res.data;
    } catch (err) {
        throw err;
    }
}

export default {
    sendText: (to, body) => apiSend({ messaging_product: 'whatsapp', to, type: 'text', text: { body } }),

    sendGenericGreeting: (to) => apiSend({ 
        messaging_product: 'whatsapp', to, type: 'text', text: { 
            body: '¡Bienvenido a Carnicería La Blanquita!, Soy Blanqui un bot diseñado para ayudarte a: \n•Hacer pedidos \n•Consultar el estado de tu pedido \n•Brindarte informacion sobre nuestra sucursal' 
        } 
    }),

    sendPersonalizedGreeting: (name, to) => apiSend({ 
        messaging_product: 'whatsapp', to, type: 'text', text: { 
            body: `¡Hola ${name}!, es un gusto tenerte de vuelta, recuerda que puedo ayudarte a: \n•Hacer pedidos \n•Consultar el estado de tu pedido` 
        } 
    }),

    sendMainMenu: (to) => apiSend({
        messaging_product: 'whatsapp', to, type: 'interactive', interactive: {
            type: 'button', body: { text: '👋 ¿Como te puedo ayudar?' },
            action: { buttons: [
                { type: 'reply', reply: { id: 'BTN_HACER_PEDIDO', title: '🛒 Hacer pedido' } },
                { type: 'reply', reply: { id: 'BTN_ESTATUS_PEDIDO', title: '🚚 Estado pedido' } },
                { type: 'reply', reply: { id: 'BTN_INFORMACION', title: '📞 Información' } }
            ] }
        }
    }),

    sendOrderConfirmation: async (to, folio) => apiSend({
        messaging_product: 'whatsapp', to, type: 'text', text: {
            body: `✅ Tu pedido ha sido confirmado y en espera a ser surtido. \n Folio: ${folio}\n\n¡Gracias por tu compra!`
        }
    }),

    sendOrderRequest: async (to) => apiSend({
        messaging_product: 'whatsapp', to, type: 'text', text: {
            body: 'Perfecto ✅\nEscribe tu pedido en formato natural, ejemplo: "2 kg de pollo". Escribe "Finalizar pedido" cuando termines.'
        }
    }),

    sendNameRequest: async (to) => apiSend({
        messaging_product: 'whatsapp', to, type: 'text', text: {
            body: '👋 Parece que es tu primer pedido. ¿Cuál es tu nombre completo?'
        }
    }),

    sendAddressRequest: async (to) => apiSend({
        messaging_product: 'whatsapp', to, type: 'text', text: {
            body: 'Gracias. Ahora por favor comparte tu dirección completa (calle, número, colonia, CP, ciudad).'
        }
    }),

    sendOrderOptions: async (to, pedido) => {
        const interactive = {
            messaging_product: "whatsapp", to,type: "interactive",interactive: {
                type: "button",
                body: {
                    text: `📝 Tu pedido hasta ahora:\n${pedido}\n\n¿Qué deseas hacer?`
                },
                action: {
                    buttons: [
                        { type: "reply", reply: { id: 'AGREGAR_MAS', title: '➕ Agregar más' } },
                        { type: "reply", reply: { id: 'CONFIRMAR_PEDIDO', title: '✅ Confirmar' } }
                    ]
                }
            }
        };
        return apiSend(interactive);
    },

    sendAddressConfirmation: async (to, direccion) => {
        const interactive = {
            messaging_product: "whatsapp", to,type: "interactive",interactive: {
                type: "button",
                body: {
                    text: `📝 Enviaremos tu pedido a:\n${direccion}\n\n¿Confirmas?`
                },
                action: {
                    buttons: [
                        { type: "reply", reply: { id: 'CONFIRMAR_DIRECCION', title: '✅ Confirmar' } },
                        { type: "reply", reply: { id: 'CORREGIR_DIRECCION', title: '❌ Corregir' } }
                    ]
                }
            }
        };
        return apiSend(interactive);
    },

    sendMoreProducts: async (to) => apiSend({
        messaging_product: "whatsapp", to, type: "text", text: {
            body: "Perfecto 👍.\nEscribe lo que deseas agregar a tu pedido:"
        }
    }),

    sendAddressUpdate: async (to) => apiSend({
        messaging_product: "whatsapp", to, type: "text", text: {
            body: "De acuerdo, escribe la dirección a la cual enviaremos tu pedido (calle, número, colonia, CP, ciudad)."
        }
    }),

    sendFindingLastOrderStatus: async (to) => {
        return apiSend({ messaging_product: 'whatsapp', to, type: 'text', text: { body: 'Buscando tu último pedido...' } });
    },

    sendLastOrderStatus: async (to) => {
        const LastOrder = await dbService.getUltimoPedidoPorCliente(to);
        if (!LastOrder) return apiSend({ 
            messaging_product: 'whatsapp', to, type: 'text', text: { 
                body: 'No hay pedidos pendientes.' 
            } 
        });
        return apiSend({ 
            messaging_product: 'whatsapp', to, type: 'text', text: { 
                body: `Tu último pedido fue realizado el ${LastOrder.Fecha} y tiene el siguiente estado: ${LastOrder.Estado}` 
            } 
        });
    },

    sendAlternativeMenu: async (to) => {
        return apiSend({
            messaging_product: 'whatsapp', to, type: 'interactive', interactive: {
                type: 'button', body: { text: '👋 ¿Que otra cosa puedo hacer por ti?' },
                action: { buttons: [
                    { type: 'reply', reply: { id: 'BTN_HACER_PEDIDO', title: '🛒 Hacer pedido' } },
                    { type: 'reply', reply: { id: 'BTN_ESTATUS_PEDIDO', title: '🚚 Estado pedido' } },
                    { type: 'reply', reply: { id: 'BTN_INFORMACION', title: '📞 Información' } }
                ] }
            }
        });
    },
    sendInformationOptions: async (to) => {
        return apiSend({
            messaging_product: 'whatsapp', to, type: 'interactive', interactive: {
                type: 'button', body: { text: '📝 Claro, ¿Como te puedo ayudar?' },
                action: { buttons: [
                    { type: 'reply', reply: { id: 'DIRECCION', title: '🚚 Dirección' } },
                    { type: 'reply', reply: { id: 'TELEFONOS', title: '📞 Telefonos' } },
                    { type: 'reply', reply: { id: 'HORARIOS', title: '📅 Horarios' } }
                ] }
            }
        });
    },
    sendBranchAddress: async (to) => {
        return apiSend({
            messaging_product: 'whatsapp', to, type: 'text', text: {
                body: 'Estamos ubicados en: \nCalle Negrete 108, \nSoledad de Graciano Sanchez, 78430, \nSoledad de Graciano Sanchez.'
            }
        });
    },
    sendPhoneNumbers: async (to) => {
        return apiSend({
            messaging_product: 'whatsapp', to, type: 'text', text: {
                body: 'Claro, puedes contactar con un asesor en los siguientes numeros, con gusto te atendera y resolvera todas tus dudas:\n•4448310535\n•81 9876 5432'
            }
        });
    },
    sendOpeningHours: async (to) => {
        return apiSend({
            messaging_product: 'whatsapp', to, type: 'text', text: {
                body: 'Nuestros horarios de servicio son de Lunes a Domingo de 8:00a.m. a 5:00p.m.'
            }
        });
    }
};