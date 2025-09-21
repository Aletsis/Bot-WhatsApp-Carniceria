import sql from 'mssql';
import { getPool } from './dbService.js';


// Sessions are persisted in table Conversaciones
export default {
    getOrCreateSession: async (phone) => {
      console.log('Buscando sesión %s', phone);
        const pool = await getPool();
        const result = await pool.request()
          .input('Telefono', sql.NVarChar, phone)
          .query('SELECT TOP 1 * FROM Conversaciones WHERE NumeroTelefono = @Telefono ORDER BY UltimaInteraccion DESC');
        if (result.recordset.length > 0) return result.recordset[0];

        // create
        console.log('Creando sesión %s', phone);
        await pool.request()
          .input('Telefono', sql.NVarChar, phone)
          .input('Estado', sql.NVarChar, 'START')
          .query('INSERT INTO Conversaciones (NumeroTelefono, Estado) VALUES (@Telefono,@Estado)');
          const created = await pool.request()
          .input('Telefono', sql.NVarChar, phone)
          .query('SELECT TOP 1 * FROM Conversaciones WHERE NumeroTelefono = @Telefono ORDER BY UltimaInteraccion DESC');
        return created.recordset[0];
      },

    updateSession: async (telefono, updates) => {
        // updates is an object with keys to merge into Buffer / Estado / UltimaInteraccion
        const pool = await getPool();
        const sel = await pool.request()
            .input('telefono', sql.NVarChar, telefono)
            .query('SELECT * FROM Conversaciones WHERE NumeroTelefono = @telefono');
        const row = sel.recordset[0];
        const newEstado = updates.Estado || row?.Estado || 'START';
        const nombreTemporal = updates.NombreTemporal || row?.NombreTemporal || null;
        let newBuffer = row?.Buffer || null;
        if (updates.Buffer !== undefined) newBuffer = updates.Buffer;

        await pool.request()
        .input('telefono', sql.NVarChar, telefono)
        .input('estado', sql.NVarChar, newEstado)
        .input('buffer', sql.NVarChar, newBuffer)
        .input('nombretemporal', sql.NVarChar, nombreTemporal)
        .query('UPDATE Conversaciones SET Estado=@estado, Buffer=@buffer, UltimaInteraccion=SYSDATETIME(), NombreTemporal=@nombretemporal WHERE NumeroTelefono=@telefono');


        return true;
    }
};