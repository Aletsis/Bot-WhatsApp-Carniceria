/**
 * Servicio de Gestión de Mensajes
 * 
 * Maneja el almacenamiento y recuperación del historial de conversaciones
 * con los clientes a través de WhatsApp.
 */

import { getPool } from './dbService.js';
import logger from '../logger.js';

/**
 * Guarda un mensaje en la base de datos
 * 
 * @param {string} numeroTelefono - Número de teléfono del cliente
 * @param {string} tipo - Tipo de mensaje ('recibido' o 'enviado')
 * @param {string} contenido - Contenido del mensaje
 * @param {string} tipoMensaje - Tipo de mensaje ('texto', 'imagen', 'documento', etc.)
 * @param {Object} metadataWhatsApp - Metadatos adicionales de WhatsApp (opcional)
 * @param {string} estado - Estado del mensaje ('entregado', 'leido', 'fallido')
 * @returns {Promise<number>} ID del mensaje guardado
 */
export async function saveMessage(
  numeroTelefono,
  tipo,
  contenido,
  tipoMensaje = 'texto',
  metadataWhatsApp = null,
  estado = 'entregado'
) {
  const pool = await getPool();
  
  try {
    const result = await pool
      .request()
      .input('NumeroTelefono', numeroTelefono)
      .input('Tipo', tipo)
      .input('Contenido', contenido)
      .input('TipoMensaje', tipoMensaje)
      .input('MetadataWhatsApp', metadataWhatsApp ? JSON.stringify(metadataWhatsApp) : null)
      .input('Estado', estado)
      .query(`
        INSERT INTO Mensajes (NumeroTelefono, Tipo, Contenido, TipoMensaje, MetadataWhatsApp, Estado)
        OUTPUT INSERTED.MensajeID
        VALUES (@NumeroTelefono, @Tipo, @Contenido, @TipoMensaje, @MetadataWhatsApp, @Estado)
      `);
    
    const mensajeID = result.recordset[0].MensajeID;
    
    logger.info(`[messageService] Mensaje guardado: ID=${mensajeID}, Tipo=${tipo}, Telefono=${numeroTelefono}`);
    
    return mensajeID;
  } catch (error) {
    logger.error('[messageService] Error guardando mensaje:', error);
    throw error;
  }
}

/**
 * Obtiene el historial de mensajes de un cliente específico
 * 
 * @param {string} numeroTelefono - Número de teléfono del cliente
 * @param {number} limit - Número máximo de mensajes a retornar (default: 50)
 * @param {number} offset - Número de mensajes a omitir (default: 0)
 * @returns {Promise<Array>} Array de mensajes ordenados por fecha (más recientes primero)
 */
export async function getMessageHistory(numeroTelefono, limit = 50, offset = 0) {
  const pool = await getPool();
  
  try {
    const result = await pool
      .request()
      .input('NumeroTelefono', numeroTelefono)
      .input('Limit', limit)
      .input('Offset', offset)
      .query(`
        SELECT 
          MensajeID,
          NumeroTelefono,
          Tipo,
          Contenido,
          TipoMensaje,
          MetadataWhatsApp,
          Estado,
          Fecha
        FROM Mensajes
        WHERE NumeroTelefono = @NumeroTelefono
        ORDER BY Fecha DESC
        OFFSET @Offset ROWS
        FETCH NEXT @Limit ROWS ONLY
      `);
    
    // Parsear metadatos JSON
    const mensajes = result.recordset.map(msg => ({
      ...msg,
      MetadataWhatsApp: msg.MetadataWhatsApp ? JSON.parse(msg.MetadataWhatsApp) : null
    }));
    
    logger.info(`[messageService] Historial recuperado: Telefono=${numeroTelefono}, Mensajes=${mensajes.length}`);
    
    return mensajes;
  } catch (error) {
    logger.error('[messageService] Error obteniendo historial:', error);
    throw error;
  }
}

/**
 * Obtiene el conteo total de mensajes de un cliente
 * 
 * @param {string} numeroTelefono - Número de teléfono del cliente
 * @returns {Promise<number>} Total de mensajes
 */
export async function getMessageCount(numeroTelefono) {
  const pool = await getPool();
  
  try {
    const result = await pool
      .request()
      .input('NumeroTelefono', numeroTelefono)
      .query(`
        SELECT COUNT(*) AS Total
        FROM Mensajes
        WHERE NumeroTelefono = @NumeroTelefono
      `);
    
    return result.recordset[0].Total;
  } catch (error) {
    logger.error('[messageService] Error contando mensajes:', error);
    throw error;
  }
}

/**
 * Obtiene la lista de todas las conversaciones (clientes únicos con su último mensaje)
 * 
 * @param {number} limit - Número máximo de conversaciones a retornar (default: 50)
 * @param {number} offset - Número de conversaciones a omitir (default: 0)
 * @returns {Promise<Array>} Array de conversaciones con último mensaje
 */
export async function getConversationList(limit = 50, offset = 0) {
  const pool = await getPool();
  
  try {
    const result = await pool
      .request()
      .input('Limit', limit)
      .input('Offset', offset)
      .query(`
        WITH UltimosMensajes AS (
          SELECT 
            NumeroTelefono,
            MAX(Fecha) AS UltimaFecha
          FROM Mensajes
          GROUP BY NumeroTelefono
        ),
        MensajesConCliente AS (
          SELECT 
            m.NumeroTelefono,
            m.Contenido AS UltimoMensaje,
            m.Tipo AS TipoUltimoMensaje,
            m.Fecha AS UltimaFecha,
            c.Nombre AS NombreCliente,
            (SELECT COUNT(*) FROM Mensajes WHERE NumeroTelefono = m.NumeroTelefono AND Tipo = 'recibido' AND Estado = 'entregado') AS MensajesNoLeidos
          FROM Mensajes m
          INNER JOIN UltimosMensajes um ON m.NumeroTelefono = um.NumeroTelefono AND m.Fecha = um.UltimaFecha
          LEFT JOIN Clientes c ON m.NumeroTelefono = c.NumeroTelefono
        )
        SELECT *
        FROM MensajesConCliente
        ORDER BY UltimaFecha DESC
        OFFSET @Offset ROWS
        FETCH NEXT @Limit ROWS ONLY
      `);
    
    logger.info(`[messageService] Lista de conversaciones recuperada: Total=${result.recordset.length}`);
    
    return result.recordset;
  } catch (error) {
    logger.error('[messageService] Error obteniendo lista de conversaciones:', error);
    throw error;
  }
}

/**
 * Marca mensajes como leídos
 * 
 * @param {string} numeroTelefono - Número de teléfono del cliente
 * @returns {Promise<number>} Número de mensajes actualizados
 */
export async function markMessagesAsRead(numeroTelefono) {
  const pool = await getPool();
  
  try {
    const result = await pool
      .request()
      .input('NumeroTelefono', numeroTelefono)
      .query(`
        UPDATE Mensajes
        SET Estado = 'leido'
        WHERE NumeroTelefono = @NumeroTelefono
          AND Tipo = 'recibido'
          AND Estado = 'entregado'
      `);
    
    logger.info(`[messageService] Mensajes marcados como leídos: Telefono=${numeroTelefono}, Actualizados=${result.rowsAffected[0]}`);
    
    return result.rowsAffected[0];
  } catch (error) {
    logger.error('[messageService] Error marcando mensajes como leídos:', error);
    throw error;
  }
}

/**
 * Busca mensajes por contenido, nombre de cliente o número de teléfono
 * 
 * @param {string} searchTerm - Término de búsqueda
 * @param {number} limit - Número máximo de resultados (default: 50)
 * @returns {Promise<Array>} Array de mensajes que coinciden con la búsqueda
 */
export async function searchMessages(searchTerm, limit = 50) {
  const pool = await getPool();
  
  try {
    const result = await pool
      .request()
      .input('SearchTerm', `%${searchTerm}%`)
      .input('Limit', limit)
      .query(`
        SELECT TOP (@Limit)
          m.MensajeID,
          m.NumeroTelefono,
          m.Tipo,
          m.Contenido,
          m.TipoMensaje,
          m.Fecha,
          c.Nombre AS NombreCliente
        FROM Mensajes m
        LEFT JOIN Clientes c ON m.NumeroTelefono = c.NumeroTelefono
        WHERE m.Contenido LIKE @SearchTerm
           OR m.NumeroTelefono LIKE @SearchTerm
           OR c.Nombre LIKE @SearchTerm
        ORDER BY m.Fecha DESC
      `);
    
    logger.info(`[messageService] Búsqueda realizada: Termino="${searchTerm}", Resultados=${result.recordset.length}`);
    
    return result.recordset;
  } catch (error) {
    logger.error('[messageService] Error buscando mensajes:', error);
    throw error;
  }
}

/**
 * Obtiene estadísticas de mensajes
 * 
 * @returns {Promise<Object>} Objeto con estadísticas
 */
export async function getMessageStats() {
  const pool = await getPool();
  
  try {
    const result = await pool.request().query(`
      SELECT 
        COUNT(*) AS TotalMensajes,
        SUM(CASE WHEN Tipo = 'recibido' THEN 1 ELSE 0 END) AS TotalRecibidos,
        SUM(CASE WHEN Tipo = 'enviado' THEN 1 ELSE 0 END) AS TotalEnviados,
        COUNT(DISTINCT NumeroTelefono) AS TotalConversaciones,
        COUNT(CASE WHEN Fecha >= DATEADD(day, -1, GETDATE()) THEN 1 END) AS MensajesUltimas24h,
        COUNT(CASE WHEN Fecha >= DATEADD(day, -7, GETDATE()) THEN 1 END) AS MensajesUltima7d
      FROM Mensajes
    `);
    
    return result.recordset[0];
  } catch (error) {
    logger.error('[messageService] Error obteniendo estadísticas:', error);
    throw error;
  }
}

/**
 * Busca conversaciones por nombre de cliente o número de teléfono
 * 
 * @param {string} searchTerm - Término de búsqueda
 * @param {number} limit - Número máximo de resultados (default: 50)
 * @returns {Promise<Array>} Array de conversaciones que coinciden con la búsqueda
 */
export async function searchConversations(searchTerm, limit = 50) {
  const pool = await getPool();
  
  try {
    const result = await pool
      .request()
      .input('SearchTerm', `%${searchTerm}%`)
      .input('Limit', limit)
      .query(`
        WITH UltimosMensajes AS (
          SELECT 
            NumeroTelefono,
            MAX(Fecha) AS UltimaFecha
          FROM Mensajes
          GROUP BY NumeroTelefono
        ),
        MensajesConCliente AS (
          SELECT 
            m.NumeroTelefono,
            m.Contenido AS UltimoMensaje,
            m.Tipo AS TipoUltimoMensaje,
            m.Fecha AS UltimaFecha,
            c.Nombre AS NombreCliente,
            (SELECT COUNT(*) FROM Mensajes WHERE NumeroTelefono = m.NumeroTelefono AND Tipo = 'recibido' AND Estado = 'entregado') AS MensajesNoLeidos
          FROM Mensajes m
          INNER JOIN UltimosMensajes um ON m.NumeroTelefono = um.NumeroTelefono AND m.Fecha = um.UltimaFecha
          LEFT JOIN Clientes c ON m.NumeroTelefono = c.NumeroTelefono
          WHERE m.NumeroTelefono LIKE @SearchTerm
             OR c.Nombre LIKE @SearchTerm
        )
        SELECT TOP (@Limit) *
        FROM MensajesConCliente
        ORDER BY UltimaFecha DESC
      `);
    
    logger.info(`[messageService] Búsqueda de conversaciones: Termino="${searchTerm}", Resultados=${result.recordset.length}`);
    
    return result.recordset;
  } catch (error) {
    logger.error('[messageService] Error buscando conversaciones:', error);
    throw error;
  }
}
