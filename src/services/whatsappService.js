import axios from 'axios';
import axiosRetry from 'axios-retry';
import dotenv from 'dotenv';
import dbService from '../services/dbService.js';
import * as configService from '../services/configService.js';
import logger from '../logger.js';

dotenv.config();

// Variables para cachear configuraciones
let cachedConfig = {
  PHONE_ID: null,
  TOKEN: null,
  NOTIFICATIONS_ENABLED: null,
  lastUpdate: null
};

const CACHE_TTL = 60000; // 1 minuto de caché

/**
 * Obtiene las configuraciones de WhatsApp desde la BD
 * Usa caché para evitar consultas excesivas
 */
async function getWhatsAppConfig() {
  const now = Date.now();
  
  // Si el caché es válido, usarlo
  if (cachedConfig.lastUpdate && (now - cachedConfig.lastUpdate) < CACHE_TTL) {
    return cachedConfig;
  }
  
  try {
    // Cargar configuraciones desde BD
    const token = await configService.getConfig('WHATSAPP_TOKEN');
    const phoneId = await configService.getConfig('PHONE_NUMBER_ID');
    const notificationsEnabled = await configService.getConfig('NOTIFICATIONS_ENABLED');
    
    // Actualizar caché
    cachedConfig = {
      PHONE_ID: phoneId?.Valor || process.env.PHONE_NUMBER_ID,
      TOKEN: token?.Valor || process.env.WHATSAPP_TOKEN,
      NOTIFICATIONS_ENABLED: notificationsEnabled?.Valor === 'true',
      lastUpdate: now
    };
    
    return cachedConfig;
  } catch (error) {
    logger.error('❌ Error cargando configuraciones de WhatsApp desde BD:', error.message);
    logger.warn('⚠️  Usando configuraciones de .env como fallback');
    
    // Fallback a .env si hay error
    return {
      PHONE_ID: process.env.PHONE_NUMBER_ID,
      TOKEN: process.env.WHATSAPP_TOKEN,
      NOTIFICATIONS_ENABLED: true,
      lastUpdate: now
    };
  }
}

const API_BASE = (id) => `https://graph.facebook.com/v21.0/${id}/messages`;

async function assertEnv() {
  const config = await getWhatsAppConfig();
  if (!config.TOKEN) throw new Error('WHATSAPP_TOKEN no está definido en BD ni en .env');
  if (!config.PHONE_ID) throw new Error('PHONE_NUMBER_ID no está definido en BD ni en .env');
}

// Verificar configuración al iniciar
assertEnv().catch(err => {
  logger.error('❌ Error verificando configuración de WhatsApp:', err.message);
});

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
        // Obtener configuración actualizada
        const config = await getWhatsAppConfig();
        
        const res = await axios.post(API_BASE(config.PHONE_ID), payload, {
          headers: { Authorization: `Bearer ${config.TOKEN}`, 'Content-Type': 'application/json' }
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
    },

    /**
     * Notifica automáticamente al cliente sobre cambios en el estado de su pedido
     * 
     * @param {string} telefono - Número de teléfono del cliente (formato: +52...)
     * @param {number} pedidoID - ID del pedido
     * @param {string} nuevoEstado - Nuevo estado del pedido
     * @param {string} nombreCliente - Nombre del cliente (opcional, para personalizar)
     * @returns {Promise<boolean>} true si se envió correctamente, false si falló
     */
    notifyCustomerOrderStatus: async (telefono, pedidoID, nuevoEstado, nombreCliente = null) => {
        try {
            // Verificar si las notificaciones están habilitadas desde BD
            const config = await getWhatsAppConfig();
            
            if (!config.NOTIFICATIONS_ENABLED) {
                logger.debug('📵 Notificaciones deshabilitadas - No se envió notificación para pedido %d', pedidoID);
                return false;
            }
            // Templates de mensajes por estado
            const templates = {
                'En espera de surtir': {
                    emoji: '⏳',
                    title: 'Pedido Recibido',
                    message: 'Tu pedido ha sido recibido y está en espera de ser surtido.'
                },
                'En ruta': {
                    emoji: '🚚',
                    title: 'Pedido en Camino',
                    message: '¡Tu pedido está en camino! Pronto llegará a tu dirección.'
                },
                'Entregado': {
                    emoji: '✅',
                    title: 'Pedido Entregado',
                    message: '¡Tu pedido ha sido entregado exitosamente!\n\n¡Gracias por tu compra! Esperamos verte pronto.'
                },
                'Cancelado': {
                    emoji: '❌',
                    title: 'Pedido Cancelado',
                    message: 'Tu pedido ha sido cancelado.\n\nSi tienes dudas, contáctanos al 4448310535.'
                }
            };

            const template = templates[nuevoEstado];

            // Si no hay template para este estado, no enviar notificación
            if (!template) {
                logger.debug('📵 Sin template de notificación para estado: %s (pedido %d)', nuevoEstado, pedidoID);
                return false;
            }

            // Construir mensaje personalizado
            const saludo = nombreCliente ? `Hola ${nombreCliente},\n\n` : '';
            const mensaje = `${template.emoji} *${template.title}*\n\n${saludo}${template.message}\n\n📦 Folio: ${pedidoID}`;

            // Enviar notificación
            await apiSend({
                messaging_product: 'whatsapp',
                to: telefono,
                type: 'text',
                text: { body: mensaje }
            });

            logger.info('✅ Notificación enviada: Pedido %d → %s (Tel: %s)', pedidoID, nuevoEstado, telefono);
            return true;

        } catch (error) {
            // NO lanzar error - las notificaciones no deben bloquear la actualización del pedido
            logger.error('❌ Error enviando notificación de pedido %d a %s:', pedidoID, telefono, error.message);
            logger.error('   Estado: %s', nuevoEstado);
            
            // Logging adicional para debugging
            if (error.response) {
                logger.error('   Response status: %d', error.response.status);
                logger.error('   Response data: %o', error.response.data);
            }
            
            return false;
        }
    }
};