import SessionService from './sessionService.js';
import WhatsappService from './whatsappService.js';
import logger from '../logger.js';
import sql from 'mssql';
import { getPool } from './dbService.js';

// Almacenar timeouts activos por número de teléfono (en memoria para velocidad)
const activeTimeouts = new Map();
const warningTimeouts = new Map();

// Configuración de tiempos (en milisegundos)
const WARNING_TIME = 4 * 60 * 1000; // 4 minutos - advertencia
const CANCEL_TIME = 5 * 60 * 1000;  // 5 minutos - cancelación

// Intervalo para limpieza de sesiones abandonadas (cada hora)
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hora

/**
 * Guarda la fecha de expiración del timeout en la BD
 * @param {string} from - Número de teléfono
 */
async function saveTimeoutExpiration(from) {
  try {
    const pool = await getPool();
    const expiraEn = new Date(Date.now() + CANCEL_TIME);
    
    await pool.request()
      .input('NumeroTelefono', sql.NVarChar, from)
      .input('TimeoutExpiraEn', sql.DateTime2, expiraEn)
      .query(`
        UPDATE Conversaciones 
        SET TimeoutExpiraEn = @TimeoutExpiraEn
        WHERE NumeroTelefono = @NumeroTelefono
      `);
    
    logger.debug('💾 Timeout guardado en BD para %s (expira: %s)', from, expiraEn.toISOString());
  } catch (err) {
    logger.error('❌ Error guardando timeout en BD:', err.message);
  }
}

/**
 * Limpia el timeout de la BD
 * @param {string} from - Número de teléfono
 */
async function clearTimeoutExpiration(from) {
  try {
    const pool = await getPool();
    
    await pool.request()
      .input('NumeroTelefono', sql.NVarChar, from)
      .query(`
        UPDATE Conversaciones 
        SET TimeoutExpiraEn = NULL
        WHERE NumeroTelefono = @NumeroTelefono
      `);
    
    logger.debug('🗑️  Timeout limpiado de BD para %s', from);
  } catch (err) {
    logger.error('❌ Error limpiando timeout en BD:', err.message);
  }
}

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
  
  // Guardar timeout en BD
  saveTimeoutExpiration(from).catch(err => 
    logger.error('Error guardando timeout:', err)
  );
  
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
        
        // Limpiar timeout de BD
        await clearTimeoutExpiration(from);
        
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
  
  // Limpiar de BD
  clearTimeoutExpiration(from).catch(err => 
    logger.error('Error limpiando timeout de BD:', err)
  );
  
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

/**
 * Restaura los timeouts activos desde la BD al iniciar el servidor
 * Esto permite sobrevivir a reinicios del servidor
 */
export async function restoreActiveTimeouts() {
  try {
    const pool = await getPool();
    
    const result = await pool.request().query(`
      SELECT NumeroTelefono, Estado, TimeoutExpiraEn
      FROM Conversaciones
      WHERE TimeoutExpiraEn IS NOT NULL 
        AND TimeoutExpiraEn > SYSDATETIME()
        AND Estado != 'START'
    `);
    
    logger.info('🔄 Restaurando %d timeouts activos desde BD...', result.recordset.length);
    
    for (const row of result.recordset) {
      const { NumeroTelefono, Estado, TimeoutExpiraEn } = row;
      const timeRemaining = new Date(TimeoutExpiraEn).getTime() - Date.now();
      
      if (timeRemaining > 0) {
        // Reiniciar timeout con el tiempo restante
        startSessionTimeout(NumeroTelefono, Estado);
        logger.debug('✅ Timeout restaurado para %s (estado: %s, restante: %dms)', 
          NumeroTelefono, Estado, timeRemaining);
      } else {
        // Si ya expiró, limpiar
        await clearTimeoutExpiration(NumeroTelefono);
      }
    }
    
    logger.info('✅ Timeouts restaurados correctamente');
  } catch (err) {
    logger.error('❌ Error restaurando timeouts:', err.message);
  }
}

/**
 * Limpia sesiones abandonadas (timeouts expirados en BD)
 * Se ejecuta periódicamente para mantener la BD limpia
 */
export async function cleanupAbandonedSessions() {
  try {
    const pool = await getPool();
    
    // Buscar sesiones con timeout expirado
    const result = await pool.request().query(`
      SELECT NumeroTelefono, Estado
      FROM Conversaciones
      WHERE TimeoutExpiraEn IS NOT NULL 
        AND TimeoutExpiraEn <= SYSDATETIME()
    `);
    
    if (result.recordset.length > 0) {
      logger.info('🧹 Limpiando %d sesiones abandonadas...', result.recordset.length);
      
      for (const row of result.recordset) {
        const { NumeroTelefono, Estado } = row;
        
        // Resetear sesión a START
        await pool.request()
          .input('NumeroTelefono', sql.NVarChar, NumeroTelefono)
          .query(`
            UPDATE Conversaciones 
            SET Estado = 'START', 
                Buffer = NULL, 
                NombreTemporal = NULL,
                TimeoutExpiraEn = NULL
            WHERE NumeroTelefono = @NumeroTelefono
          `);
        
        logger.info('🗑️  Sesión limpiada para %s (estado anterior: %s)', NumeroTelefono, Estado);
      }
      
      logger.info('✅ Limpieza de sesiones completada');
    }
  } catch (err) {
    logger.error('❌ Error limpiando sesiones abandonadas:', err.message);
  }
}

/**
 * Inicia el proceso de limpieza periódica de sesiones abandonadas
 * Se ejecuta cada hora
 */
export function startCleanupJob() {
  // Ejecutar limpieza inmediatamente al iniciar
  cleanupAbandonedSessions().catch(err => 
    logger.error('Error en limpieza inicial:', err)
  );
  
  // Programar ejecución periódica cada hora
  setInterval(() => {
    cleanupAbandonedSessions().catch(err => 
      logger.error('Error en limpieza periódica:', err)
    );
  }, CLEANUP_INTERVAL);
  
  logger.info('🕐 Job de limpieza de sesiones iniciado (intervalo: 1 hora)');
}

export default {
  startSessionTimeout,
  clearSessionTimeout,
  resetSessionTimeout,
  getActiveTimeouts,
  restoreActiveTimeouts,
  cleanupAbandonedSessions,
  startCleanupJob
};
