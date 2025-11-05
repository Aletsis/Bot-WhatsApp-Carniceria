import SessionService from './sessionService.js';
import WhatsappService from './whatsappService.js';
import logger from '../logger.js';

// Almacenar timeouts activos por número de teléfono
const activeTimeouts = new Map();
const warningTimeouts = new Map();

// Configuración de tiempos (en milisegundos)
const WARNING_TIME = 4 * 60 * 1000; // 4 minutos - advertencia
const CANCEL_TIME = 5 * 60 * 1000;  // 5 minutos - cancelación

/**
 * Mensajes de advertencia según el estado
 */
const WARNING_MESSAGES = {
  ASK_NAME: '⏰ Hola! Aún estoy esperando tu nombre para continuar con el pedido. ¿Sigues ahí?',
  ASK_ADDRESS: '⏰ Aún estoy esperando tu dirección de entrega. ¿Sigues ahí?',
  TAKING_ORDER: '⏰ Recordatorio: Estoy esperando los productos de tu pedido. Escribe lo que deseas ordenar o "finalizar pedido" si terminaste.',
  AWAITING_CONFIRM: '⏰ Tienes un pedido pendiente de confirmación. ¿Deseas continuar?',
  MENU: '⏰ ¿Necesitas ayuda? Selecciona una opción del menú o escribe "menu" para verlo de nuevo.'
};

/**
 * Mensajes de cancelación según el estado
 */
const CANCEL_MESSAGES = {
  ASK_NAME: '⌛ Por inactividad, he cancelado el proceso. Escribe "menu" cuando estés listo para hacer tu pedido.',
  ASK_ADDRESS: '⌛ Por inactividad, he cancelado el proceso. Escribe "menu" cuando estés listo para continuar.',
  TAKING_ORDER: '⌛ Por inactividad, he cancelado tu pedido. No te preocupes, puedes empezar uno nuevo escribiendo "menu".',
  AWAITING_CONFIRM: '⌛ Por inactividad, he cancelado el pedido pendiente. Escribe "menu" cuando estés listo para hacer un nuevo pedido.',
  MENU: '⌛ Por inactividad, he reiniciado la conversación. Escribe "menu" cuando necesites algo.'
};

/**
 * Inicia el timeout para una sesión
 * @param {string} from - Número de teléfono del usuario
 * @param {string} state - Estado actual de la sesión
 */
export function startSessionTimeout(from, state) {
  // Limpiar timeouts anteriores si existen
  clearSessionTimeout(from);
  
  // No aplicar timeout al estado START
  if (state === 'START') {
    return;
  }
  
  const numeroCorregido = from.slice(0, 2) + from.slice(3);
  
  // Programar advertencia después de 4 minutos
  const warningTimer = setTimeout(async () => {
    try {
      const session = await SessionService.getOrCreateSession(from);
      const currentState = session?.Estado;
      
      // Verificar que el estado no haya cambiado
      if (currentState === state && WARNING_MESSAGES[state]) {
        await WhatsappService.sendText(numeroCorregido, WARNING_MESSAGES[state]);
        logger.info('⏰ Advertencia de timeout enviada a %s en estado %s', from, state);
      }
    } catch (err) {
      logger.error('❌ Error enviando advertencia de timeout:', err.message);
    }
  }, WARNING_TIME);
  
  // Programar cancelación después de 5 minutos
  const cancelTimer = setTimeout(async () => {
    try {
      const session = await SessionService.getOrCreateSession(from);
      const currentState = session?.Estado;
      
      // Verificar que el estado no haya cambiado
      if (currentState === state) {
        // Cancelar la sesión
        await SessionService.updateSession(from, { 
          Estado: 'START', 
          Buffer: null, 
          NombreTemporal: null 
        });
        
        // Enviar mensaje de cancelación
        const cancelMsg = CANCEL_MESSAGES[state] || CANCEL_MESSAGES.MENU;
        await WhatsappService.sendText(numeroCorregido, cancelMsg);
        
        logger.info('⌛ Sesión cancelada por timeout para %s (estado: %s)', from, state);
        
        // Limpiar referencias
        clearSessionTimeout(from);
      }
    } catch (err) {
      logger.error('❌ Error cancelando sesión por timeout:', err.message);
    }
  }, CANCEL_TIME);
  
  // Guardar referencias de los timers
  warningTimeouts.set(from, warningTimer);
  activeTimeouts.set(from, cancelTimer);
  
  logger.debug('⏱️  Timeout iniciado para %s en estado %s', from, state);
}

/**
 * Limpia los timeouts de una sesión
 * @param {string} from - Número de teléfono del usuario
 */
export function clearSessionTimeout(from) {
  const warningTimer = warningTimeouts.get(from);
  const cancelTimer = activeTimeouts.get(from);
  
  if (warningTimer) {
    clearTimeout(warningTimer);
    warningTimeouts.delete(from);
  }
  
  if (cancelTimer) {
    clearTimeout(cancelTimer);
    activeTimeouts.delete(from);
  }
  
  logger.debug('⏱️  Timeouts limpiados para %s', from);
}

/**
 * Reinicia el timeout cuando hay actividad del usuario
 * @param {string} from - Número de teléfono del usuario
 * @param {string} newState - Nuevo estado de la sesión
 */
export function resetSessionTimeout(from, newState) {
  clearSessionTimeout(from);
  startSessionTimeout(from, newState);
}

/**
 * Obtiene información de timeouts activos (para debugging)
 */
export function getActiveTimeouts() {
  return {
    active: activeTimeouts.size,
    warnings: warningTimeouts.size,
    sessions: Array.from(activeTimeouts.keys())
  };
}

export default {
  startSessionTimeout,
  clearSessionTimeout,
  resetSessionTimeout,
  getActiveTimeouts
};
