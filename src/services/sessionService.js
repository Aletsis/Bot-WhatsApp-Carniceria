import sql from 'mssql';
import { getPool } from './dbService.js';
import logger from '../logger.js';
import { 
  isValidTransition, 
  isCriticalState, 
  getTransitionError 
} from '../config/stateTransitions.js';
import { updateSessionWithVersion } from './transactionService.js';


// Sessions are persisted in table Conversaciones
export default {
    /**
     * Obtiene una sesión existente o crea una nueva
     * @param {string} phone - Número de teléfono
     * @returns {Promise<Object>} Sesión encontrada o creada
     * @throws {Error} Si hay un error de conexión o consulta a BD
     */
    getOrCreateSession: async (phone) => {
      logger.info('🔍 Buscando sesión para %s', phone);
      const pool = await getPool();
      
      const result = await pool.request()
        .input('Telefono', sql.NVarChar, phone)
        .query('SELECT TOP 1 * FROM Conversaciones WHERE NumeroTelefono = @Telefono ORDER BY UltimaInteraccion DESC');
      
      if (result.recordset.length > 0) {
        logger.debug('✅ Sesión existente encontrada para %s', phone);
        return result.recordset[0];
      }

      // Crear nueva sesión
      logger.info('➕ Creando nueva sesión para %s', phone);
      await pool.request()
        .input('Telefono', sql.NVarChar, phone)
        .input('Estado', sql.NVarChar, 'START')
        .query('INSERT INTO Conversaciones (NumeroTelefono, Estado) VALUES (@Telefono,@Estado)');
      
      const created = await pool.request()
        .input('Telefono', sql.NVarChar, phone)
        .query('SELECT TOP 1 * FROM Conversaciones WHERE NumeroTelefono = @Telefono ORDER BY UltimaInteraccion DESC');
      
      logger.info('✅ Sesión creada para %s', phone);
      return created.recordset[0];
    },

    /**
     * Actualiza los campos de una sesión existente
     * @param {string} telefono - Número de teléfono
     * @param {Object} updates - Campos a actualizar
     * @param {string} [updates.Estado] - Nuevo estado
     * @param {string} [updates.Buffer] - Nuevo buffer
     * @param {string} [updates.NombreTemporal] - Nombre temporal
     * @returns {Promise<boolean>}
     * @throws {Error} Si hay un error de conexión, consulta a BD, o conflicto de concurrencia
     */
    updateSession: async (telefono, updates) => {
        const pool = await getPool();
        
        // 🔄 RETRY LOOP con optimistic locking (máximo 3 intentos)
        const MAX_RETRIES = 3;
        let attempt = 0;
        
        while (attempt < MAX_RETRIES) {
          attempt++;
          
          // Obtener sesión actual CON VERSION
          const sel = await pool.request()
              .input('telefono', sql.NVarChar, telefono)
              .query('SELECT * FROM Conversaciones WHERE NumeroTelefono = @telefono');
          
          const row = sel.recordset[0];
          if (!row) {
            logger.warn('⚠️ No se encontró sesión para actualizar: %s', telefono);
            throw new Error(`No se encontró sesión para: ${telefono}`);
          }
          
          const currentVersion = row.Version || 0;
          
          // Preparar valores
          const currentState = row.Estado || 'START';
          const newEstado = updates.Estado || currentState;
          const nombreTemporal = updates.NombreTemporal !== undefined ? updates.NombreTemporal : row.NombreTemporal;
          let newBuffer = row.Buffer || null;
          if (updates.Buffer !== undefined) newBuffer = updates.Buffer;
          
          // 🔒 VALIDACIÓN DE TRANSICIÓN DE ESTADO
          if (updates.Estado && currentState !== newEstado) {
            const isValid = isValidTransition(currentState, newEstado);
            
            if (!isValid) {
              // Transición inválida detectada
              const errorMsg = getTransitionError(currentState, newEstado);
              
              // Si es un estado crítico, loggear como ERROR (posible bug serio)
              if (isCriticalState(currentState) || isCriticalState(newEstado)) {
                logger.error('🚨 TRANSICIÓN CRÍTICA INVÁLIDA: %s (tel: %s)', errorMsg, telefono);
              } else {
                logger.warn('⚠️ Transición inválida: %s (tel: %s)', errorMsg, telefono);
              }
              
              // ⚠️ IMPORTANTE: Por ahora solo loggeamos, NO bloqueamos
              // En futuras versiones se puede cambiar a throw Error para bloquear
              // throw new Error(errorMsg);
            } else {
              // Transición válida
              logger.debug('✅ Transición válida: %s → %s (tel: %s)', currentState, newEstado, telefono);
            }
          }
          
          // 🔐 ACTUALIZACIÓN CON OPTIMISTIC LOCKING
          const sessionUpdates = {
            Estado: newEstado,
            Buffer: newBuffer,
            NombreTemporal: nombreTemporal
          };
          
          const success = await updateSessionWithVersion(telefono, sessionUpdates, currentVersion);
          
          if (success) {
            logger.debug('✅ Sesión actualizada (intento %d/%d): %s - Estado: %s', attempt, MAX_RETRIES, telefono, newEstado);
            return true;
          } else {
            // Conflicto de versión - otro proceso modificó la sesión
            logger.warn('⚠️ Conflicto de versión en intento %d/%d para: %s (esperado v%d)', 
                       attempt, MAX_RETRIES, telefono, currentVersion);
            
            if (attempt >= MAX_RETRIES) {
              logger.error('🚨 FALLO después de %d intentos - conflicto de concurrencia: %s', MAX_RETRIES, telefono);
              throw new Error(`Conflicto de concurrencia después de ${MAX_RETRIES} intentos para: ${telefono}`);
            }
            
            // Esperar un poco antes de reintentar (backoff exponencial)
            const delay = Math.pow(2, attempt - 1) * 100; // 100ms, 200ms, 400ms
            await new Promise(resolve => setTimeout(resolve, delay));
            // Continuar al siguiente intento del loop
          }
        }
        
        // No debería llegar aquí, pero por seguridad
        throw new Error(`Fallo al actualizar sesión después de ${MAX_RETRIES} intentos: ${telefono}`);
    }
};