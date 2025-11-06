import axios from 'axios';
import axiosRetry from 'axios-retry';
import dotenv from 'dotenv';
import dbService from '../services/dbService.js';
import logger from '../logger.js';

dotenv.config();

const API_BASE = (id) => `https://graph.facebook.com/v21.0/${id}/messages`;
const PHONE_ID = process.env.PHONE_NUMBER_ID;
const TOKEN = process.env.WHATSAPP_TOKEN;

function assertEnv() {
  if (!TOKEN) throw new Error('WHATSAPP_TOKEN no está definido en .env');
  if (!PHONE_ID) throw new Error('PHONE_ID no está definido en .env');
}
assertEnv();

// Configurar reintentos automáticos para axios
axiosRetry(axios, {
  retries: 3, // Máximo 3 reintentos
  retryDelay: axiosRetry.exponentialDelay, // Delay exponencial: 1s, 2s, 4s
  retryCondition: (error) => {
    // Reintentar solo en casos específicos
    if (!error.response) {
      // Sin respuesta (timeout, network error)
      logger.warn('🔄 Sin respuesta de WhatsApp API - Reintentando...');
      return true;
    }
    
    const status = error.response.status;
    
    // Reintentar solo errores 5xx (servidor de WhatsApp caído)
    if (status >= 500 && status < 600) {
      logger.warn('🔄 Error 5xx de WhatsApp API (%d) - Reintentando...', status);
      return true;
    }
    
    // Reintentar en rate limit (429) después de esperar
    if (status === 429) {
      logger.warn('🔄 Rate limit (429) - Reintentando después de esperar...');
      return true;
    }
    
    // NO reintentar errores 4xx (excepto 429)
    // Estos son errores del cliente que no se resolverán con reintentos
    return false;
  },
  onRetry: (retryCount, error, requestConfig) => {
    const status = error.response?.status || 'sin respuesta';
    const url = requestConfig.url;
    logger.warn('⚠️ Reintento %d/3 para %s (Status: %s)', retryCount, url, status);
  }
});

async function apiSend(payload) {
    const to = payload.to;
    if (!to) throw new Error('apiSend: parámetro "to" es requerido');
    
    try {
        const res = await axios.post(API_BASE(PHONE_ID), payload, {
          headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }
        });
        
        // Validar respuesta de WhatsApp
        if (!res.data || !res.data.messages) {
          logger.warn('⚠️ Respuesta inesperada de WhatsApp API: %o', res.data);
        } else {
          logger.info('✅ Mensaje enviado a %s - ID: %s', to, res.data.messages[0]?.id);
        }
        
        return res.data;
    } catch (err) {
        // Distinguir tipos de error
        if (err.response) {
          // Error de respuesta de WhatsApp API
          const status = err.response.status;
          const errorData = err.response.data;
          
          logger.error('❌ Error de WhatsApp API (%d) para %s: %o', status, to, errorData);
          
          // Errores comunes
          if (status === 401) {
            logger.error('🔑 Token de WhatsApp inválido o expirado');
          } else if (status === 404) {
            logger.error('📞 Número de teléfono no válido o Phone Number ID incorrecto: %s', to);
          } else if (status === 429) {
            logger.error('🚦 Rate limit excedido en WhatsApp API');
          } else if (status >= 500) {
            logger.error('🔥 Error del servidor de WhatsApp');
          }
        } else if (err.request) {
          // Request enviado pero no hay respuesta
          logger.error('❌ Sin respuesta de WhatsApp API para %s: %s', to, err.message);
        } else {
          // Error al configurar el request
          logger.error('❌ Error configurando request para %s: %s', to, err.message);
        }
        
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

    sendLastOrderStatus: async (to, from) => {
        const LastOrder = await dbService.getUltimoPedidoPorCliente(from);
        if (!LastOrder) return apiSend({ 
            messaging_product: 'whatsapp', to, type: 'text', text: { 
                body: 'No hay pedidos pendientes.' 
            } 
        });
        return apiSend({ 
            messaging_product: 'whatsapp', to, type: 'text', text: { 
                body: `Tu último pedido realizado tiene el siguiente estado:\n ${LastOrder.Estado}` 
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