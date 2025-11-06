import sql from 'mssql';
import { getPool } from './dbService.js';
import logger from '../logger.js';


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
     * @throws {Error} Si hay un error de conexión o consulta a BD
     */
    updateSession: async (telefono, updates) => {
        const pool = await getPool();
        
        // Obtener sesión actual
        const sel = await pool.request()
            .input('telefono', sql.NVarChar, telefono)
            .query('SELECT * FROM Conversaciones WHERE NumeroTelefono = @telefono');
        
        const row = sel.recordset[0];
        if (!row) {
          logger.warn('⚠️ No se encontró sesión para actualizar: %s', telefono);
          throw new Error(`No se encontró sesión para: ${telefono}`);
        }
        
        // Preparar valores
        const newEstado = updates.Estado || row.Estado || 'START';
        const nombreTemporal = updates.NombreTemporal !== undefined ? updates.NombreTemporal : row.NombreTemporal;
        let newBuffer = row.Buffer || null;
        if (updates.Buffer !== undefined) newBuffer = updates.Buffer;

        await pool.request()
          .input('telefono', sql.NVarChar, telefono)
          .input('estado', sql.NVarChar, newEstado)
          .input('buffer', sql.NVarChar, newBuffer)
          .input('nombretemporal', sql.NVarChar, nombreTemporal)
          .query('UPDATE Conversaciones SET Estado=@estado, Buffer=@buffer, UltimaInteraccion=SYSDATETIME(), NombreTemporal=@nombretemporal WHERE NumeroTelefono=@telefono');

        logger.debug('✅ Sesión actualizada: %s - Estado: %s', telefono, newEstado);
        return true;
    }
};