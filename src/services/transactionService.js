import sql from 'mssql';
import { getPool } from './dbService.js';
import logger from '../logger.js';

/**
 * Servicio de Transacciones para Operaciones Atómicas
 * 
 * Proporciona wrappers para ejecutar operaciones dentro de transacciones SQL,
 * garantizando atomicidad (todo o nada) y previniendo race conditions.
 * 
 * @module transactionService
 */

/**
 * Ejecuta una función dentro de una transacción SQL
 * Si la función tiene éxito, hace commit. Si falla, hace rollback automáticamente.
 * 
 * @param {Function} operation - Función async que recibe (transaction) y ejecuta queries
 * @param {number} maxRetries - Número máximo de reintentos en caso de deadlock (default: 3)
 * @returns {Promise<any>} - Resultado de la operación
 * @throws {Error} - Si la operación falla después de todos los reintentos
 * 
 * @example
 * await executeInTransaction(async (transaction) => {
 *   await transaction.request()
 *     .input('id', sql.Int, 123)
 *     .query('UPDATE Tabla SET Campo = @valor WHERE ID = @id');
 *   
 *   await transaction.request()
 *     .input('id', sql.Int, 456)
 *     .query('INSERT INTO Logs (Info) VALUES (@info)');
 * });
 */
export async function executeInTransaction(operation, maxRetries = 3) {
  const pool = await getPool();
  let attempt = 0;
  
  while (attempt < maxRetries) {
    const transaction = new sql.Transaction(pool);
    
    try {
      await transaction.begin();
      logger.debug('🔄 Transacción iniciada (intento %d/%d)', attempt + 1, maxRetries);
      
      // Ejecutar la operación dentro de la transacción
      const result = await operation(transaction);
      
      // Si todo salió bien, hacer commit
      await transaction.commit();
      logger.debug('✅ Transacción completada exitosamente');
      
      return result;
      
    } catch (err) {
      // Hacer rollback en caso de error
      try {
        await transaction.rollback();
        logger.debug('🔙 Rollback ejecutado');
      } catch (rollbackErr) {
        logger.error('❌ Error durante rollback:', rollbackErr.message);
      }
      
      // Detectar deadlocks (SQL Server error 1205)
      const isDeadlock = err.number === 1205;
      
      if (isDeadlock && attempt < maxRetries - 1) {
        attempt++;
        const delay = Math.pow(2, attempt) * 100; // Exponential backoff: 200ms, 400ms, 800ms
        logger.warn('⚠️ Deadlock detectado, reintentando en %dms (intento %d/%d)', 
          delay, attempt + 1, maxRetries);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Si no es deadlock o se agotaron reintentos, propagar error
      logger.error('❌ Error en transacción:', err.message);
      throw err;
    }
  }
}

/**
 * Actualiza una sesión con locking optimista
 * Previene race conditions verificando que la versión no haya cambiado
 * 
 * @param {string} telefono - Número de teléfono
 * @param {Object} updates - Campos a actualizar
 * @param {number} expectedVersion - Versión esperada para el update
 * @returns {Promise<boolean>} - true si se actualizó, false si hubo conflicto de versión
 * @throws {Error} - Si hay error de BD
 */
export async function updateSessionWithVersion(telefono, updates, expectedVersion) {
  return await executeInTransaction(async (transaction) => {
    // Leer versión actual
    const selectResult = await transaction.request()
      .input('telefono', sql.NVarChar, telefono)
      .query('SELECT Version, Estado, Buffer, NombreTemporal FROM Conversaciones WHERE NumeroTelefono = @telefono');
    
    if (selectResult.recordset.length === 0) {
      throw new Error(`Sesión no encontrada: ${telefono}`);
    }
    
    const currentVersion = selectResult.recordset[0].Version;
    
    // Verificar que la versión coincida (locking optimista)
    if (currentVersion !== expectedVersion) {
      logger.warn('⚠️ Conflicto de versión detectado para %s. Esperada: %d, Actual: %d', 
        telefono, expectedVersion, currentVersion);
      return false; // Conflicto de versión
    }
    
    // Preparar valores para actualización
    const row = selectResult.recordset[0];
    const newEstado = updates.Estado !== undefined ? updates.Estado : row.Estado;
    const newBuffer = updates.Buffer !== undefined ? updates.Buffer : row.Buffer;
    const newNombreTemporal = updates.NombreTemporal !== undefined ? updates.NombreTemporal : row.NombreTemporal;
    const newTimeoutExpiraEn = updates.TimeoutExpiraEn !== undefined ? updates.TimeoutExpiraEn : undefined;
    
    // Actualizar con versión incrementada
    const updateRequest = transaction.request()
      .input('telefono', sql.NVarChar, telefono)
      .input('estado', sql.NVarChar, newEstado)
      .input('buffer', sql.NVarChar, newBuffer)
      .input('nombretemporal', sql.NVarChar, newNombreTemporal)
      .input('expectedVersion', sql.Int, expectedVersion)
      .input('newVersion', sql.Int, expectedVersion + 1);
    
    let query = `
      UPDATE Conversaciones 
      SET Estado = @estado,
          Buffer = @buffer,
          NombreTemporal = @nombretemporal,
          UltimaInteraccion = SYSDATETIME(),
          Version = @newVersion`;
    
    // Agregar TimeoutExpiraEn si está presente
    if (newTimeoutExpiraEn !== undefined) {
      updateRequest.input('timeoutExpiraEn', sql.DateTime2, newTimeoutExpiraEn);
      query += `,
          TimeoutExpiraEn = @timeoutExpiraEn`;
    }
    
    query += `
      WHERE NumeroTelefono = @telefono 
        AND Version = @expectedVersion`;
    
    const updateResult = await updateRequest.query(query);
    
    if (updateResult.rowsAffected[0] === 0) {
      // No se actualizó ninguna fila (otro proceso cambió la versión)
      logger.warn('⚠️ Conflicto de versión al actualizar %s', telefono);
      return false;
    }
    
    logger.debug('✅ Sesión actualizada con locking optimista: %s (v%d → v%d)', 
      telefono, expectedVersion, expectedVersion + 1);
    return true;
  });
}

/**
 * Actualiza el estado de un pedido con locking optimista
 * 
 * @param {number} pedidoID - ID del pedido
 * @param {string} nuevoEstado - Nuevo estado
 * @param {number} expectedVersion - Versión esperada
 * @returns {Promise<boolean>} - true si se actualizó, false si hubo conflicto
 */
export async function updatePedidoEstadoWithVersion(pedidoID, nuevoEstado, expectedVersion) {
  return await executeInTransaction(async (transaction) => {
    // Verificar versión actual
    const selectResult = await transaction.request()
      .input('pedidoID', sql.Int, pedidoID)
      .query('SELECT Version FROM Pedidos WHERE PedidoID = @pedidoID');
    
    if (selectResult.recordset.length === 0) {
      throw new Error(`Pedido no encontrado: ${pedidoID}`);
    }
    
    const currentVersion = selectResult.recordset[0].Version;
    
    if (currentVersion !== expectedVersion) {
      logger.warn('⚠️ Conflicto de versión en pedido %d. Esperada: %d, Actual: %d', 
        pedidoID, expectedVersion, currentVersion);
      return false;
    }
    
    // Actualizar con versión incrementada
    const updateResult = await transaction.request()
      .input('pedidoID', sql.Int, pedidoID)
      .input('nuevoEstado', sql.NVarChar, nuevoEstado)
      .input('expectedVersion', sql.Int, expectedVersion)
      .input('newVersion', sql.Int, expectedVersion + 1)
      .query(`
        UPDATE Pedidos 
        SET Estado = @nuevoEstado,
            Version = @newVersion
        WHERE PedidoID = @pedidoID 
          AND Version = @expectedVersion
      `);
    
    if (updateResult.rowsAffected[0] === 0) {
      logger.warn('⚠️ Conflicto de versión al actualizar pedido %d', pedidoID);
      return false;
    }
    
    logger.debug('✅ Pedido %d actualizado con locking optimista (v%d → v%d)', 
      pedidoID, expectedVersion, expectedVersion + 1);
    return true;
  });
}

export default {
  executeInTransaction,
  updateSessionWithVersion,
  updatePedidoEstadoWithVersion
};
