import sql from 'mssql';
import logger from '../logger.js';

/**
 * Servicio de Inicialización de Base de Datos
 * 
 * Este servicio se encarga de:
 * 1. Verificar la conexión a SQL Server
 * 2. Crear la base de datos si no existe
 * 3. Crear todas las tablas necesarias:
 *    - Clientes
 *    - Pedidos
 *    - Conversaciones
 *    - TelefonosAtencion
 *    - Usuarios (para dashboard)
 *    - LogAccesos (auditoría de accesos)
 * 4. Crear índices para optimizar rendimiento
 * 5. Insertar datos iniciales:
 *    - Teléfonos de atención
 *    - Usuario admin (username: admin, password: admin123)
 * 
 * La inicialización es automática al arrancar la app.
 * También puede ejecutarse manualmente con: npm run init-db
 * 
 * @module dbInitService
 */

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
        Notas NVARCHAR(1000) NULL,
        EstadoImpresion NVARCHAR(50) NOT NULL DEFAULT 'Pendiente',
        FechaImpresion DATETIME2 NULL,
        ErrorImpresion NVARCHAR(500) NULL,
        CONSTRAINT CK_Pedidos_EstadoImpresion CHECK (EstadoImpresion IN ('Pendiente', 'Impreso', 'Error', 'NoRequerida', 'Reimprimiendo'))
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
        UltimaInteraccion DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        TimeoutExpiraEn DATETIME2 NULL
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
    
    // Crear tabla Usuarios
    await pool.request().query(`
      CREATE TABLE Usuarios (
        UsuarioID INT IDENTITY(1,1) PRIMARY KEY,
        Username NVARCHAR(50) UNIQUE NOT NULL,
        PasswordHash NVARCHAR(255) NOT NULL,
        Rol NVARCHAR(20) NOT NULL DEFAULT 'viewer',
        Nombre NVARCHAR(100) NULL,
        Email NVARCHAR(100) NULL,
        Activo BIT NOT NULL DEFAULT 1,
        FechaCreacion DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        UltimoAcceso DATETIME2 NULL,
        CreadoPor NVARCHAR(50) NULL,
        CONSTRAINT CK_Usuarios_Rol CHECK (Rol IN ('admin', 'editor', 'viewer'))
      )
    `);
    logger.info('[DB Init] ✅ Tabla Usuarios creada');
    
    // Crear índices para Usuarios
    await pool.request().query(`
      CREATE INDEX IX_Usuarios_Username ON Usuarios(Username);
      CREATE INDEX IX_Usuarios_Activo ON Usuarios(Activo);
    `);
    logger.info('[DB Init] ✅ Índices de Usuarios creados');
    
    // Crear tabla LogAccesos
    await pool.request().query(`
      CREATE TABLE LogAccesos (
        LogID BIGINT IDENTITY(1,1) PRIMARY KEY,
        UsuarioID INT NOT NULL FOREIGN KEY REFERENCES Usuarios(UsuarioID),
        FechaHora DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        IP NVARCHAR(50) NULL,
        Exitoso BIT NOT NULL DEFAULT 1,
        Detalles NVARCHAR(500) NULL
      )
    `);
    logger.info('[DB Init] ✅ Tabla LogAccesos creada');
    
    // Crear índices para LogAccesos
    await pool.request().query(`
      CREATE INDEX IX_LogAccesos_UsuarioID ON LogAccesos(UsuarioID);
      CREATE INDEX IX_LogAccesos_FechaHora ON LogAccesos(FechaHora DESC);
    `);
    logger.info('[DB Init] ✅ Índices de LogAccesos creados');
    
    // Crear índices adicionales para mejorar rendimiento
    await pool.request().query(`
      CREATE INDEX IX_Pedidos_ClienteID ON Pedidos(ClienteID);
      CREATE INDEX IX_Pedidos_Estado ON Pedidos(Estado);
      CREATE INDEX IX_Pedidos_Fecha ON Pedidos(Fecha);
      CREATE INDEX IX_Pedidos_EstadoImpresion ON Pedidos(EstadoImpresion);
      CREATE INDEX IX_Conversaciones_UltimaInteraccion ON Conversaciones(UltimaInteraccion);
    `);
    logger.info('[DB Init] ✅ Índices adicionales creados');
    
    // Crear índice filtrado para timeouts activos
    await pool.request().query(`
      CREATE INDEX IX_Conversaciones_TimeoutExpiraEn 
      ON Conversaciones(TimeoutExpiraEn)
      WHERE TimeoutExpiraEn IS NOT NULL;
    `);
    logger.info('[DB Init] ✅ Índice de timeouts creado');
    
    // Insertar datos iniciales en TelefonosAtencion
    await pool.request().query(`
      INSERT INTO TelefonosAtencion (Etiqueta, Telefono) 
      VALUES ('Sucursal 8','8145678901'), ('Atencion Precios','8198765432')
    `);
    logger.info('[DB Init] ✅ Datos iniciales de TelefonosAtencion insertados');
    
    // Insertar usuario admin por defecto
    await pool.request().query(`
      INSERT INTO Usuarios (Username, PasswordHash, Rol, Nombre, Email, Activo, CreadoPor)
      VALUES (
        'admin',
        '$2b$10$S4rilO7yYF0KWuG0NPSRTujWWsjrOSh75oCpotGJ5cM8A0AYrTSyW',
        'admin',
        'Administrador',
        'admin@carniceria.com',
        1,
        'SYSTEM'
      )
    `);
    logger.info('[DB Init] ✅ Usuario admin creado (password: admin123)');
    logger.warn('[DB Init] ⚠️  IMPORTANTE: Cambiar la contraseña del admin en producción');
    
    logger.info('[DB Init] 🎉 Base de datos inicializada completamente');
    
  } catch (err) {
    logger.error('[DB Init] ❌ Error creando base de datos:', err.message);
    throw err;
  } finally {
    if (pool) await pool.close();
  }
}

/**
 * Crea tablas faltantes en una base de datos existente
 * @param {string} dbName - Nombre de la base de datos
 * @param {string[]} missingTables - Array de nombres de tablas faltantes
 */
async function createMissingTables(dbName, missingTables) {
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
    logger.info('[DB Init] 🔨 Creando tablas faltantes...');
    
    for (const tableName of missingTables) {
      switch (tableName) {
        case 'Usuarios':
          await pool.request().query(`
            CREATE TABLE Usuarios (
              UsuarioID INT IDENTITY(1,1) PRIMARY KEY,
              Username NVARCHAR(50) UNIQUE NOT NULL,
              PasswordHash NVARCHAR(255) NOT NULL,
              Rol NVARCHAR(20) NOT NULL DEFAULT 'viewer',
              Nombre NVARCHAR(100) NULL,
              Email NVARCHAR(100) NULL,
              Activo BIT NOT NULL DEFAULT 1,
              FechaCreacion DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
              UltimoAcceso DATETIME2 NULL,
              CreadoPor NVARCHAR(50) NULL,
              CONSTRAINT CK_Usuarios_Rol CHECK (Rol IN ('admin', 'editor', 'viewer'))
            )
          `);
          await pool.request().query(`
            CREATE INDEX IX_Usuarios_Username ON Usuarios(Username);
            CREATE INDEX IX_Usuarios_Activo ON Usuarios(Activo);
          `);
          // Insertar usuario admin por defecto
          await pool.request().query(`
            INSERT INTO Usuarios (Username, PasswordHash, Rol, Nombre, Email, Activo, CreadoPor)
            VALUES (
              'admin',
              '$2b$10$S4rilO7yYF0KWuG0NPSRTujWWsjrOSh75oCpotGJ5cM8A0AYrTSyW',
              'admin',
              'Administrador',
              'admin@carniceria.com',
              1,
              'SYSTEM'
            )
          `);
          logger.info('[DB Init] ✅ Tabla Usuarios creada con usuario admin');
          break;
          
        case 'LogAccesos':
          // Verificar que Usuarios existe primero
          const usuariosExists = await pool.request().query(`
            SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Usuarios'
          `);
          if (usuariosExists.recordset[0].cnt === 0) {
            logger.warn('[DB Init] ⚠️  No se puede crear LogAccesos sin tabla Usuarios');
            continue;
          }
          
          await pool.request().query(`
            CREATE TABLE LogAccesos (
              LogID BIGINT IDENTITY(1,1) PRIMARY KEY,
              UsuarioID INT NOT NULL FOREIGN KEY REFERENCES Usuarios(UsuarioID),
              FechaHora DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
              IP NVARCHAR(50) NULL,
              Exitoso BIT NOT NULL DEFAULT 1,
              Detalles NVARCHAR(500) NULL
            )
          `);
          await pool.request().query(`
            CREATE INDEX IX_LogAccesos_UsuarioID ON LogAccesos(UsuarioID);
            CREATE INDEX IX_LogAccesos_FechaHora ON LogAccesos(FechaHora DESC);
          `);
          logger.info('[DB Init] ✅ Tabla LogAccesos creada');
          break;
          
        default:
          logger.warn('[DB Init] ⚠️  No hay script de creación para tabla: %s', tableName);
      }
    }
    
    logger.info('[DB Init] ✅ Tablas faltantes creadas');
  } catch (err) {
    logger.error('[DB Init] ❌ Error creando tablas faltantes:', err.message);
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
      WHERE TABLE_NAME IN ('Clientes', 'Pedidos', 'Conversaciones', 'TelefonosAtencion', 'Usuarios', 'LogAccesos')
    `);
    
    const expectedTables = 6; // Ahora esperamos 6 tablas
    const foundTables = result.recordset[0].TableCount;
    
    if (foundTables < expectedTables) {
      logger.warn('[DB Init] ⚠️  Encontradas %d de %d tablas esperadas', foundTables, expectedTables);
      
      // Verificar cuáles tablas faltan
      const tablesCheck = await pool.request().query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME IN ('Clientes', 'Pedidos', 'Conversaciones', 'TelefonosAtencion', 'Usuarios', 'LogAccesos')
      `);
      
      const existingTables = tablesCheck.recordset.map(r => r.TABLE_NAME);
      const allTables = ['Clientes', 'Pedidos', 'Conversaciones', 'TelefonosAtencion', 'Usuarios', 'LogAccesos'];
      const missingTables = allTables.filter(t => !existingTables.includes(t));
      
      if (missingTables.length > 0) {
        logger.warn('[DB Init] 📋 Tablas faltantes: %s', missingTables.join(', '));
      }
    }
    
    return foundTables === expectedTables;
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
      logger.warn('[DB Init] ⚠️  Algunas tablas faltan, intentando crearlas...');
      
      // Obtener lista de tablas faltantes
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
        const tablesCheck = await pool.request().query(`
          SELECT TABLE_NAME 
          FROM INFORMATION_SCHEMA.TABLES 
          WHERE TABLE_NAME IN ('Clientes', 'Pedidos', 'Conversaciones', 'TelefonosAtencion', 'Usuarios', 'LogAccesos')
        `);
        
        const existingTables = tablesCheck.recordset.map(r => r.TABLE_NAME);
        const allTables = ['Clientes', 'Pedidos', 'Conversaciones', 'TelefonosAtencion', 'Usuarios', 'LogAccesos'];
        const missingTables = allTables.filter(t => !existingTables.includes(t));
        
        if (missingTables.length > 0) {
          logger.info('[DB Init] 📋 Creando tablas: %s', missingTables.join(', '));
          await createMissingTables(dbName, missingTables);
          logger.info('[DB Init] ✅ Tablas creadas exitosamente');
        }
      } finally {
        if (pool) await pool.close();
      }
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