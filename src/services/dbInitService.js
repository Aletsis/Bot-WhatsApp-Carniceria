import sql from 'mssql';
import logger from '../logger.js';

/**
 * Verifica si la base de datos existe
 * @param {string} dbName - Nombre de la base de datos
 * @returns {Promise<boolean>}
 */
async function checkDatabaseExists(dbName) {
  const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    server: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
    database: 'master', // Conectarse a master para verificar
    options: {
      encrypt: false,
      trustServerCertificate: true
    }
  };

  let pool;
  try {
    pool = await sql.connect(config);
    const result = await pool.request()
      .input('dbName', sql.NVarChar, dbName)
      .query('SELECT database_id FROM sys.databases WHERE name = @dbName');
    
    return result.recordset.length > 0;
  } catch (err) {
    logger.error('[DB Init] Error verificando base de datos:', err.message);
    throw err;
  } finally {
    if (pool) await pool.close();
  }
}

/**
 * Crea la base de datos y las tablas
 * @param {string} dbName - Nombre de la base de datos
 */
async function createDatabase(dbName) {
  const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    server: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
    database: 'master',
    options: {
      encrypt: false,
      trustServerCertificate: true
    }
  };

  let pool;
  try {
    logger.info('[DB Init] 🔨 Creando base de datos %s...', dbName);
    pool = await sql.connect(config);
    
    // Crear la base de datos
    await pool.request()
      .query(`CREATE DATABASE [${dbName}]`);
    
    logger.info('[DB Init] ✅ Base de datos creada exitosamente');
    
    // Cerrar conexión a master
    await pool.close();
    
    // Conectarse a la nueva base de datos para crear tablas
    const dbConfig = {
      ...config,
      database: dbName
    };
    
    pool = await sql.connect(dbConfig);
    
    logger.info('[DB Init] 📋 Creando tablas...');
    
    // Crear tabla Clientes
    await pool.request().query(`
      CREATE TABLE Clientes (
        ClienteID INT IDENTITY(1,1) PRIMARY KEY,
        NumeroTelefono NVARCHAR(30) UNIQUE NOT NULL,
        Nombre NVARCHAR(200) NULL,
        Direccion NVARCHAR(500) NULL,
        FechaAlta DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        Activo BIT NOT NULL DEFAULT 1
      )
    `);
    logger.info('[DB Init] ✅ Tabla Clientes creada');
    
    // Crear tabla Pedidos
    await pool.request().query(`
      CREATE TABLE Pedidos (
        PedidoID BIGINT IDENTITY(1,1) PRIMARY KEY,
        ClienteID INT NOT NULL FOREIGN KEY REFERENCES Clientes(ClienteID),
        Folio NVARCHAR(30) NOT NULL,
        Contenido NVARCHAR(MAX) NOT NULL,
        Estado NVARCHAR(50) NOT NULL DEFAULT 'En espera de surtir',
        Fecha DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        Notas NVARCHAR(1000) NULL
      )
    `);
    logger.info('[DB Init] ✅ Tabla Pedidos creada');
    
    // Crear tabla Conversaciones
    await pool.request().query(`
      CREATE TABLE Conversaciones (
        NumeroTelefono NVARCHAR(30) PRIMARY KEY,
        Estado NVARCHAR(50) NOT NULL,
        Buffer NVARCHAR(MAX) NULL,
        NombreTemporal NVARCHAR(200) NULL,
        UltimaInteraccion DATETIME2 NOT NULL DEFAULT SYSDATETIME()
      )
    `);
    logger.info('[DB Init] ✅ Tabla Conversaciones creada');
    
    // Crear tabla TelefonosAtencion
    await pool.request().query(`
      CREATE TABLE TelefonosAtencion (
        TelefonoID INT IDENTITY(1,1) PRIMARY KEY,
        Etiqueta NVARCHAR(100) NOT NULL,
        Telefono NVARCHAR(50) NOT NULL
      )
    `);
    logger.info('[DB Init] ✅ Tabla TelefonosAtencion creada');
    
    // Insertar datos iniciales
    await pool.request().query(`
      INSERT INTO TelefonosAtencion (Etiqueta, Telefono) 
      VALUES ('Sucursal 8','8145678901'), ('Atencion Precios','8198765432')
    `);
    logger.info('[DB Init] ✅ Datos iniciales insertados');
    
    logger.info('[DB Init] 🎉 Base de datos inicializada completamente');
    
  } catch (err) {
    logger.error('[DB Init] ❌ Error creando base de datos:', err.message);
    throw err;
  } finally {
    if (pool) await pool.close();
  }
}

/**
 * Verifica si las tablas necesarias existen
 * @param {string} dbName - Nombre de la base de datos
 * @returns {Promise<boolean>}
 */
async function checkTablesExist(dbName) {
  const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    server: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
    database: dbName,
    options: {
      encrypt: false,
      trustServerCertificate: true
    }
  };

  let pool;
  try {
    pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT COUNT(*) as TableCount 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME IN ('Clientes', 'Pedidos', 'Conversaciones', 'TelefonosAtencion')
    `);
    
    return result.recordset[0].TableCount === 4;
  } catch (err) {
    logger.error('[DB Init] Error verificando tablas:', err.message);
    return false;
  } finally {
    if (pool) await pool.close();
  }
}

/**
 * Inicializa la base de datos (verifica y crea si es necesario)
 */
export async function initializeDatabase() {
  const dbName = process.env.DB_NAME;
  
  if (!dbName) {
    throw new Error('DB_NAME no está definido en las variables de entorno');
  }

  try {
    logger.info('[DB Init] 🔍 Verificando base de datos %s...', dbName);
    
    const dbExists = await checkDatabaseExists(dbName);
    
    if (!dbExists) {
      logger.warn('[DB Init] ⚠️  Base de datos no encontrada, creando...');
      await createDatabase(dbName);
      return true;
    }
    
    logger.info('[DB Init] ✅ Base de datos existe');
    
    // Verificar que las tablas existen
    logger.info('[DB Init] 🔍 Verificando tablas...');
    const tablesExist = await checkTablesExist(dbName);
    
    if (!tablesExist) {
      logger.warn('[DB Init] ⚠️  Algunas tablas faltan, recreando estructura...');
      // Aquí podrías implementar lógica para crear solo las tablas faltantes
      // Por ahora, loguear advertencia
      logger.warn('[DB Init] ⚠️  Por favor, ejecute manualmente el script de migración');
      return false;
    }
    
    logger.info('[DB Init] ✅ Todas las tablas verificadas');
    return true;
    
  } catch (err) {
    logger.error('[DB Init] ❌ Error en inicialización:', err.message);
    throw err;
  }
}

/**
 * Verifica la conexión a SQL Server (sin especificar base de datos)
 */
export async function checkSqlServerConnection() {
  const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    server: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
    database: 'master',
    options: {
      encrypt: false,
      trustServerCertificate: true
    }
  };

  let pool;
  try {
    logger.info('[DB Init] 🔌 Probando conexión a SQL Server...');
    pool = await sql.connect(config);
    const result = await pool.request().query('SELECT @@VERSION as Version');
    logger.info('[DB Init] ✅ Conectado a SQL Server exitosamente');
    logger.info('[DB Init] 📌 Versión:', result.recordset[0].Version.split('\n')[0]);
    return true;
  } catch (err) {
    logger.error('[DB Init] ❌ No se pudo conectar a SQL Server:', err.message);
    logger.error('[DB Init] 💡 Verifica que SQL Server esté corriendo y las credenciales sean correctas');
    throw err;
  } finally {
    if (pool) await pool.close();
  }
}