import sql from 'mssql';
import dayjs from 'dayjs';
import logger from './logger.js';

let poolPromise = null;
let poolInstance = null;

export async function getPool() {
  if (poolPromise) return poolPromise;

  const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    server: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
    database: process.env.DB_NAME,
    options: {
      encrypt: false,
      trustServerCertificate: true
    }
  };

  if (!config.server) throw new Error('DB_HOST no está definido en .env');

  poolPromise = sql.connect(config)
    .then(pool => {
      poolInstance = pool;
      console.log('[DB] Conectado correctamente');
      return pool;
    })
    .catch(err => {
      poolPromise = null;
      console.error('[DB] Error de conexión:', err.message);
      throw err;
    });

  return poolPromise;
}

export function getPoolInstance() {
  return poolInstance;
}

export default {
  getClienteByPhone: async (telefono) => {
    try {
      const pool = await getPool();
      const res = await pool.request()
        .input('telefono', sql.NVarChar, telefono)
        .query('SELECT * FROM Clientes WHERE NumeroTelefono = @telefono');
      return res.recordset[0] || null;
    } catch (err) {
      logger.error('Error obteniendo cliente', err);
      return null;
    }
  },

  updateCliente: async (telefono, direccion) => {
    const pool = await getPool();
    await pool.request()
      .input('telefono', sql.NVarChar, telefono)
      .input('direccion', sql.NVarChar, direccion)
      .query('UPDATE Clientes SET Direccion=@direccion WHERE NumeroTelefono=@telefono');
  },

  createCliente: async ({ telefono, nombre, direccion }) => {
    const pool = await getPool();
    await pool.request()
      .input('telefono', sql.NVarChar, telefono)
      .input('nombre', sql.NVarChar, nombre)
      .input('direccion', sql.NVarChar, direccion)
      .query('INSERT INTO Clientes (NumeroTelefono, Nombre, Direccion) VALUES (@telefono,@nombre,@direccion)');
  },

  generateFolio: () => {
    const d = dayjs().format('YYYYMMDD');
    const rnd = Math.floor(Math.random() * 9000) + 1000;
    return `CAR-${d}-${rnd}`;
  },

  createPedido: async (clienteId, folio, estado = 'En espera de surtir', items) => {
    const pool = await getPool();
    const res = await pool.request()
      .input('ClienteID', sql.Int, clienteId)
      .input('Folio', sql.NVarChar, folio)
      .input('Estado', sql.NVarChar, estado)
      .input('Items', sql.NVarChar, items)
      .query('INSERT INTO Pedidos (ClienteID,Folio,Estado,Contenido) OUTPUT INSERTED.PedidoID VALUES (@ClienteID,@Folio,@Estado,@Items)');
    return res.recordset[0].PedidoID;
  },

  insertDetallePedido: async (pedidoId, item) => {
    const pool = await getPool();
    await pool.request()
      .input('PedidoID', sql.BigInt, pedidoId)
      .input('Producto', sql.NVarChar, item.producto)
      .input('Cantidad', sql.Decimal(10,3), item.cantidad)
      .input('Unidad', sql.NVarChar, item.unidad)
      .input('Observaciones', sql.NVarChar, item.observaciones || null)
      .query('INSERT INTO DetallePedidos (PedidoID,Producto,Cantidad,Unidad,Observaciones) VALUES (@PedidoID,@Producto,@Cantidad,@Unidad,@Observaciones)');
  },

  getUltimoPedidoPorCliente: async (telefono) => {
    const pool = await getPool();
    const res = await pool.request().input('telefono', sql.NVarChar, telefono)
      .query(`SELECT TOP 1 p.PedidoID, p.Folio, p.Estado, p.Fecha
              FROM Pedidos p
              JOIN Clientes c ON c.ClienteID = p.ClienteID
              WHERE c.NumeroTelefono = @telefono
              ORDER BY p.Fecha DESC`);
    return res.recordset[0] || null;
  }
};
