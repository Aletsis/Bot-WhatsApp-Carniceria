import sql from 'mssql';
import dayjs from 'dayjs';
import logger from '../logger.js';

let poolPromise = null;
let poolInstance = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS = 5000; // 5 segundos

/**
 * Intenta reconectar a la base de datos con backoff exponencial
 */
async function attemptReconnection() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    logger.error('[DB] Máximo de intentos de reconexión alcanzado (%d)', MAX_RECONNECT_ATTEMPTS);
    return;
  }
  
  reconnectAttempts++;
  const delay = RECONNECT_DELAY_MS * Math.pow(2, reconnectAttempts - 1);
  
  logger.warn('[DB] Intento de reconexión %d/%d en %dms...', 
    reconnectAttempts, MAX_RECONNECT_ATTEMPTS, delay);
  
  setTimeout(async () => {
    try {
      await getPool();
      logger.info('[DB] ✅ Reconexión exitosa');
      reconnectAttempts = 0; // Resetear contador al reconectar exitosamente
    } catch (err) {
      logger.error('[DB] ❌ Reconexión fallida:', err.message);
      await attemptReconnection();
    }
  }, delay);
}

/**
 * Configura listeners de eventos del pool
 */
function setupPoolListeners(pool) {
  // Evento cuando hay un error de conexión
  pool.on('error', err => {
    logger.error('[DB] ⚠️ Error de conexión detectado:', err.message);
    
    // Resetear referencias del pool
    poolPromise = null;
    poolInstance = null;
    
    // Intentar reconectar automáticamente
    attemptReconnection();
  });
  
  // Evento cuando el pool se cierra
  pool.on('close', () => {
    logger.warn('[DB] Pool cerrado');
    poolPromise = null;
    poolInstance = null;
  });
}

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
      trustServerCertificate: true,
      enableArithAbort: true,
      requestTimeout: 30000, // 30 segundos
      connectionTimeout: 30000 // 30 segundos
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    }
  };

  if (!config.server) throw new Error('DB_HOST no está definido en .env');

  poolPromise = sql.connect(config)
    .then(pool => {
      poolInstance = pool;
      reconnectAttempts = 0; // Resetear contador al conectar exitosamente
      logger.info('[DB] Conectado correctamente');
      
      // Configurar listeners de eventos
      setupPoolListeners(pool);
      
      return pool;
    })
    .catch(err => {
      poolPromise = null;
      logger.error('[DB] Error de conexión:', err.message);
      throw err;
    });

  return poolPromise;
}

export function getPoolInstance() {
  return poolInstance;
}

export default {
  /**
   * Obtiene un cliente por su número de teléfono
   * @param {string} telefono - Número de teléfono del cliente
   * @returns {Promise<Object|null>} Cliente encontrado o null si no existe
   * @throws {Error} Si hay un error de conexión o consulta a BD
   */
  getClienteByPhone: async (telefono) => {
    const pool = await getPool();
    const res = await pool.request()
      .input('telefono', sql.NVarChar, telefono)
      .query('SELECT * FROM Clientes WHERE NumeroTelefono = @telefono');
    
    const cliente = res.recordset[0] || null;
    logger.debug('Cliente obtenido: %s - %s', telefono, cliente ? 'Encontrado' : 'No encontrado');
    return cliente;
  },

  /**
   * Actualiza la dirección de un cliente existente
   * @param {string} telefono - Número de teléfono del cliente
   * @param {string} direccion - Nueva dirección
   * @returns {Promise<number>} Número de filas afectadas
   * @throws {Error} Si hay un error de conexión o consulta a BD
   */
  updateCliente: async (telefono, direccion) => {
    const pool = await getPool();
    const result = await pool.request()
      .input('telefono', sql.NVarChar, telefono)
      .input('direccion', sql.NVarChar, direccion)
      .query('UPDATE Clientes SET Direccion=@direccion WHERE NumeroTelefono=@telefono');
    
    logger.info('Cliente actualizado: %s - Filas afectadas: %d', telefono, result.rowsAffected[0]);
    return result.rowsAffected[0];
  },

  /**
   * Crea un nuevo cliente
   * @param {Object} params - Datos del cliente
   * @param {string} params.telefono - Número de teléfono
   * @param {string} params.nombre - Nombre completo
   * @param {string} params.direccion - Dirección
   * @returns {Promise<void>}
   * @throws {Error} Si hay un error de conexión, consulta a BD o si el teléfono ya existe
   */
  createCliente: async ({ telefono, nombre, direccion }) => {
    const pool = await getPool();
    await pool.request()
      .input('telefono', sql.NVarChar, telefono)
      .input('nombre', sql.NVarChar, nombre)
      .input('direccion', sql.NVarChar, direccion)
      .query('INSERT INTO Clientes (NumeroTelefono, Nombre, Direccion) VALUES (@telefono,@nombre,@direccion)');
    
    logger.info('Cliente creado: %s - %s', telefono, nombre);
  },

  /**
   * Genera un folio único para un pedido
   * @returns {string} Folio en formato CAR-YYYYMMDD-XXXX
   */
  generateFolio: () => {
    const d = dayjs().format('YYYYMMDD');
    const rnd = Math.floor(Math.random() * 9000) + 1000;
    return `CAR-${d}-${rnd}`;
  },

  /**
   * Crea un nuevo pedido
   * @param {number} clienteId - ID del cliente
   * @param {string} folio - Folio del pedido
   * @param {string} estado - Estado inicial del pedido
   * @param {string} items - Contenido del pedido en texto
   * @returns {Promise<number>} ID del pedido creado
   * @throws {Error} Si hay un error de conexión o consulta a BD
   */
  createPedido: async (clienteId, folio, estado = 'En espera de surtir', items) => {
    const pool = await getPool();
    const res = await pool.request()
      .input('ClienteID', sql.Int, clienteId)
      .input('Folio', sql.NVarChar, folio)
      .input('Estado', sql.NVarChar, estado)
      .input('Items', sql.NVarChar, items)
      .query('INSERT INTO Pedidos (ClienteID,Folio,Estado,Contenido) OUTPUT INSERTED.PedidoID VALUES (@ClienteID,@Folio,@Estado,@Items)');
    
    const pedidoId = res.recordset[0].PedidoID;
    logger.info('Pedido creado: %s - ID: %d - Cliente: %d', folio, pedidoId, clienteId);
    return pedidoId;
  },

  /**
   * Obtiene el último pedido de un cliente por su número de teléfono
   * @param {string} telefono - Número de teléfono del cliente
   * @returns {Promise<Object|null>} Último pedido o null si no tiene pedidos
   * @throws {Error} Si hay un error de conexión o consulta a BD
   */
  getUltimoPedidoPorCliente: async (telefono) => {
    const pool = await getPool();
    const res = await pool.request().input('telefono', sql.NVarChar, telefono)
      .query(`SELECT TOP 1 p.PedidoID, p.Folio, p.Estado, p.Fecha
              FROM Pedidos p
              JOIN Clientes c ON c.ClienteID = p.ClienteID
              WHERE c.NumeroTelefono = @telefono
              ORDER BY p.Fecha DESC`);
    
    const pedido = res.recordset[0] || null;
    logger.debug('Último pedido consultado: %s - %s', telefono, pedido ? `Folio: ${pedido.Folio}` : 'Sin pedidos');
    return pedido;
  }
};
