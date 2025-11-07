import sql from 'mssql';
import logger from '../logger.js';
import { getPool } from './dbService.js';

/**
 * Servicio de Inicialización de Base de Datos
 * 
 * Este servicio se encarga de:
 * 1. Verificar la conexión a SQL Server
 * 2. Crear la base de datos si no existe
 * 3. Crear todas las tablas necesarias:
 *    - Clientes
 *    - Pedidos (con Version, NotificacionImpresionEnviada)
 *    - Conversaciones (con TimeoutExpiraEn y Version)
 *    - TelefonosAtencion
 *    - Usuarios (con NumeroWhatsApp y rol supervisor)
 *    - LogAccesos (auditoría de accesos)
 *    - Configuraciones (configuraciones del sistema)
 *    - Mensajes (historial de chats)
 *    - NotificacionesLog (sistema de notificaciones de errores)
 * 4. Crear índices para optimizar rendimiento (20+ índices)
 * 5. Insertar datos iniciales:
 *    - Teléfonos de atención
 *    - Usuario admin (username: admin, password: admin123)
 *    - Configuraciones por defecto (incluye sistema de notificaciones)
 * 
 * La inicialización es automática al arrancar la app.
 * También puede ejecutarse manualmente con: npm run init-db
 * 
 * @module dbInitService
 */

/**
 * Verifica si la base de datos existe
 * @param {string} dbName - Nombre de la base de datos
 * @param {boolean} closePool - Si debe cerrar el pool después (default: false para flujos internos)
 * @returns {Promise<boolean>}
 */
async function checkDatabaseExists(dbName, closePool = false) {
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
    pool = new sql.ConnectionPool(config);
    await pool.connect();
    
    const result = await pool.request()
      .input('dbName', sql.NVarChar, dbName)
      .query('SELECT database_id FROM sys.databases WHERE name = @dbName');
    
    const exists = result.recordset.length > 0;
    
    if (closePool) {
      await pool.close();
    }
    
    return exists;
  } catch (err) {
    logger.error('[DB Init] Error verificando base de datos:', err.message);
    if (pool && closePool) await pool.close();
    throw err;
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

  try {
    logger.info('[DB Init] 🔨 Creando base de datos %s...', dbName);
    
    // Crear conexión a master para crear la BD
    let masterPool = new sql.ConnectionPool(config);
    await masterPool.connect();
    
    // Crear la base de datos
    await masterPool.request()
      .query(`CREATE DATABASE [${dbName}]`);
    
    logger.info('[DB Init] ✅ Base de datos creada exitosamente');
    
    // Cerrar conexión a master
    await masterPool.close();
    
    // Esperar un momento para que SQL Server termine de crear la BD
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Conectarse a la nueva base de datos para crear tablas
    const dbConfig = {
      ...config,
      database: dbName
    };
    
    logger.info('[DB Init] 📋 Conectando a %s para crear tablas...', dbName);
    const pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();
    
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
        NotificacionImpresionEnviada DATETIMEOFFSET NULL,
        Version INT NOT NULL DEFAULT 0,
        CONSTRAINT CK_Pedidos_EstadoImpresion CHECK (EstadoImpresion IN ('Pendiente', 'Impreso', 'Error', 'NoRequerida', 'Reimprimiendo'))
      )
    `);
    logger.info('[DB Init] ✅ Tabla Pedidos creada (con NotificacionImpresionEnviada)');
    
    // Crear tabla Conversaciones
    await pool.request().query(`
      CREATE TABLE Conversaciones (
        NumeroTelefono NVARCHAR(30) PRIMARY KEY,
        Estado NVARCHAR(50) NOT NULL,
        Buffer NVARCHAR(MAX) NULL,
        NombreTemporal NVARCHAR(200) NULL,
        UltimaInteraccion DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        TimeoutExpiraEn DATETIME2 NULL,
        Version INT NOT NULL DEFAULT 0
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
        NumeroWhatsApp NVARCHAR(20) NULL,
        Activo BIT NOT NULL DEFAULT 1,
        FechaCreacion DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        UltimoAcceso DATETIME2 NULL,
        CreadoPor NVARCHAR(50) NULL,
        CONSTRAINT CK_Usuarios_Rol CHECK (Rol IN ('admin', 'supervisor', 'editor', 'viewer'))
      )
    `);
    logger.info('[DB Init] ✅ Tabla Usuarios creada (con NumeroWhatsApp y rol supervisor)');
    
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
    
    // Crear tabla Configuraciones
    await pool.request().query(`
      CREATE TABLE Configuraciones (
        ConfigID INT PRIMARY KEY IDENTITY(1,1),
        Clave NVARCHAR(100) NOT NULL UNIQUE,
        Valor NVARCHAR(500) NOT NULL,
        Descripcion NVARCHAR(500),
        Tipo NVARCHAR(50) NOT NULL,
        Categoria NVARCHAR(50) NOT NULL,
        Editable BIT NOT NULL DEFAULT 1,
        FechaCreacion DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        FechaActualizacion DATETIME2 NOT NULL DEFAULT SYSDATETIME()
      )
    `);
    logger.info('[DB Init] ✅ Tabla Configuraciones creada');
    
    // Crear índice para Configuraciones
    await pool.request().query(`
      CREATE INDEX IX_Configuraciones_Categoria ON Configuraciones(Categoria);
    `);
    logger.info('[DB Init] ✅ Índice de Configuraciones creado');
    
    // Insertar configuraciones por defecto
    await pool.request().query(`
      INSERT INTO Configuraciones (Clave, Valor, Descripcion, Tipo, Categoria, Editable)
      VALUES
      -- === PRINTER ===
      ('PRINTER_ENABLED', 'false', 'Habilitar/deshabilitar impresión de tickets', 'boolean', 'PRINTER', 1),
      ('PRINTER_HOST', '192.168.0.100', 'Dirección IP de la impresora ESC/POS', 'string', 'PRINTER', 1),
      ('PRINTER_PORT', '9100', 'Puerto de la impresora (típicamente 9100)', 'number', 'PRINTER', 1),
      
      -- === WHATSAPP ===
      ('WHATSAPP_TOKEN', '', 'Token de acceso de WhatsApp Business API', 'secret', 'WHATSAPP', 1),
      ('PHONE_NUMBER_ID', '', 'ID del número de teléfono de WhatsApp', 'string', 'WHATSAPP', 1),
      ('WEBHOOK_VERIFY_TOKEN', '', 'Token para verificar webhook de Meta', 'secret', 'WHATSAPP', 1),
      ('APP_SECRET', '', 'App Secret de Meta para verificación de firma', 'secret', 'WHATSAPP', 1),
      
      -- === SYSTEM ===
      ('SESSION_TIMEOUT', '5', 'Timeout de sesión en minutos (5 min default)', 'number', 'SYSTEM', 1),
      ('CONVERSATION_TIMEOUT', '30', 'Timeout de conversación en minutos (30 min default)', 'number', 'SYSTEM', 1),
      ('SESSION_TTL_MINUTES', '1440', 'Tiempo de vida de sesión HTTP en minutos (24h default)', 'number', 'SYSTEM', 1),
      
      -- === NOTIFICATIONS ===
      ('NOTIFICATIONS_ENABLED', 'true', 'Habilitar notificaciones automáticas a clientes', 'boolean', 'NOTIFICATIONS', 1),
      ('ERROR_NOTIFICATIONS_ENABLED', 'true', 'Habilitar notificaciones de errores a administradores', 'boolean', 'NOTIFICATIONS', 1),
      ('NOTIFICATION_THROTTLE_MINUTES', '15', 'Minutos entre notificaciones del mismo tipo de error', 'number', 'NOTIFICATIONS', 1),
      ('PRINTING_ERROR_THRESHOLD', '3', 'Cantidad de errores consecutivos antes de alerta crítica', 'number', 'NOTIFICATIONS', 1),
      ('PRINT_MONITOR_ENABLED', 'true', 'Habilitar monitoreo automático de pedidos no impresos', 'boolean', 'NOTIFICATIONS', 1),
      ('PRINT_MONITOR_INTERVAL', '5', 'Intervalo en minutos para verificar pedidos no impresos', 'number', 'NOTIFICATIONS', 1),
      ('PRINT_TIMEOUT_MINUTES', '15', 'Minutos de espera antes de notificar pedido no impreso', 'number', 'NOTIFICATIONS', 1)
    `);
    logger.info('[DB Init] ✅ Configuraciones por defecto insertadas (incluye sistema de notificaciones)');
    
    // Crear tabla Mensajes (historial de chats)
    await pool.request().query(`
      CREATE TABLE Mensajes (
        MensajeID BIGINT PRIMARY KEY IDENTITY(1,1),
        NumeroTelefono NVARCHAR(30) NOT NULL,
        Tipo NVARCHAR(20) NOT NULL CHECK (Tipo IN ('recibido', 'enviado')),
        Contenido NVARCHAR(MAX) NOT NULL,
        TipoMensaje NVARCHAR(50) DEFAULT 'texto',
        MetadataWhatsApp NVARCHAR(MAX),
        Estado NVARCHAR(20) DEFAULT 'entregado',
        Fecha DATETIME2 NOT NULL DEFAULT SYSDATETIME()
      )
    `);
    logger.info('[DB Init] ✅ Tabla Mensajes creada');
    
    // Crear índices para Mensajes
    await pool.request().query(`
      CREATE INDEX IX_Mensajes_Telefono_Fecha ON Mensajes(NumeroTelefono, Fecha DESC);
      CREATE INDEX IX_Mensajes_Fecha ON Mensajes(Fecha DESC);
    `);
    logger.info('[DB Init] ✅ Índices de Mensajes creados');
    
    // Crear tabla NotificacionesLog (sistema de notificaciones de errores)
    await pool.request().query(`
      CREATE TABLE NotificacionesLog (
        NotificacionID BIGINT IDENTITY(1,1) PRIMARY KEY,
        TipoError NVARCHAR(50) NOT NULL,
        Severidad NVARCHAR(20) NOT NULL CHECK (Severidad IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL')),
        Mensaje NVARCHAR(MAX) NOT NULL,
        Destinatarios NVARCHAR(MAX) NOT NULL,
        Estado NVARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (Estado IN ('PENDIENTE', 'ENVIADO', 'ERROR', 'THROTTLED')),
        WhatsAppMessageID NVARCHAR(100) NULL,
        Metadata NVARCHAR(MAX) NULL,
        ErrorMensaje NVARCHAR(MAX) NULL,
        CreadoEn DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIME(),
        EnviadoEn DATETIMEOFFSET NULL
      )
    `);
    logger.info('[DB Init] ✅ Tabla NotificacionesLog creada');
    
    // Crear índices para NotificacionesLog
    await pool.request().query(`
      CREATE INDEX IX_NotificacionesLog_TipoError_CreadoEn ON NotificacionesLog(TipoError, CreadoEn DESC);
      CREATE INDEX IX_NotificacionesLog_Estado ON NotificacionesLog(Estado);
      CREATE INDEX IX_NotificacionesLog_Severidad ON NotificacionesLog(Severidad);
    `);
    logger.info('[DB Init] ✅ Índices de NotificacionesLog creados');
    
    // Crear índices adicionales para mejorar rendimiento
    await pool.request().query(`
      CREATE INDEX IX_Pedidos_ClienteID ON Pedidos(ClienteID);
      CREATE INDEX IX_Pedidos_Estado ON Pedidos(Estado);
      CREATE INDEX IX_Pedidos_Fecha ON Pedidos(Fecha);
      CREATE INDEX IX_Pedidos_EstadoImpresion ON Pedidos(EstadoImpresion);
      CREATE INDEX IX_Conversaciones_UltimaInteraccion ON Conversaciones(UltimaInteraccion);
      CREATE INDEX IX_Conversaciones_NumeroTelefono_Version ON Conversaciones(NumeroTelefono, Version);
    `);
    logger.info('[DB Init] ✅ Índices adicionales creados');
    
    // Crear índice filtrado para pedidos no impresos (monitoreo de impresión)
    await pool.request().query(`
      CREATE INDEX IX_Pedidos_EstadoImpresion_Fecha
      ON Pedidos(EstadoImpresion, Fecha)
      INCLUDE (PedidoID, Folio, NotificacionImpresionEnviada)
      WHERE EstadoImpresion IN ('Pendiente', 'Error');
    `);
    logger.info('[DB Init] ✅ Índice de monitoreo de impresión creado');
    
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
    
    // Cerrar el pool de la base de datos recién creada
    await pool.close();
    
  } catch (err) {
    logger.error('[DB Init] ❌ Error creando base de datos:', err.message);
    logger.error('[DB Init] Stack:', err.stack);
    throw err;
  }
}

/**
 * Crea tablas faltantes en una base de datos existente
 * @param {string} dbName - Nombre de la base de datos
 * @param {string[]} missingTables - Array de nombres de tablas faltantes
 */
async function createMissingTables(dbName, missingTables) {
  try {
    // Usar el pool compartido en lugar de crear uno nuevo
    const pool = await getPool();
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
              NumeroWhatsApp NVARCHAR(20) NULL,
              Activo BIT NOT NULL DEFAULT 1,
              FechaCreacion DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
              UltimoAcceso DATETIME2 NULL,
              CreadoPor NVARCHAR(50) NULL,
              CONSTRAINT CK_Usuarios_Rol CHECK (Rol IN ('admin', 'supervisor', 'editor', 'viewer'))
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
        
        case 'NotificacionesLog':
          await pool.request().query(`
            CREATE TABLE NotificacionesLog (
              NotificacionID BIGINT IDENTITY(1,1) PRIMARY KEY,
              TipoError NVARCHAR(50) NOT NULL,
              Severidad NVARCHAR(20) NOT NULL CHECK (Severidad IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL')),
              Mensaje NVARCHAR(MAX) NOT NULL,
              Destinatarios NVARCHAR(MAX) NOT NULL,
              Estado NVARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (Estado IN ('PENDIENTE', 'ENVIADO', 'ERROR', 'THROTTLED')),
              WhatsAppMessageID NVARCHAR(100) NULL,
              Metadata NVARCHAR(MAX) NULL,
              ErrorMensaje NVARCHAR(MAX) NULL,
              CreadoEn DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIME(),
              EnviadoEn DATETIMEOFFSET NULL
            )
          `);
          await pool.request().query(`
            CREATE INDEX IX_NotificacionesLog_TipoError_CreadoEn ON NotificacionesLog(TipoError, CreadoEn DESC);
            CREATE INDEX IX_NotificacionesLog_Estado ON NotificacionesLog(Estado);
            CREATE INDEX IX_NotificacionesLog_Severidad ON NotificacionesLog(Severidad);
          `);
          logger.info('[DB Init] ✅ Tabla NotificacionesLog creada');
          break;
          
        default:
          logger.warn('[DB Init] ⚠️  No hay script de creación para tabla: %s', tableName);
      }
    }
    
    logger.info('[DB Init] ✅ Tablas faltantes creadas');
  } catch (err) {
    logger.error('[DB Init] ❌ Error creando tablas faltantes:', err.message);
    throw err;
  }
  // No cerrar el pool compartido
}

/**
 * Verifica si las tablas necesarias existen
 * @param {string} dbName - Nombre de la base de datos
 * @returns {Promise<boolean>}
 */
async function checkTablesExist(dbName) {
  try {
    // Usar el pool compartido en lugar de crear uno nuevo
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT COUNT(*) as TableCount 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME IN ('Clientes', 'Pedidos', 'Conversaciones', 'TelefonosAtencion', 'Usuarios', 'LogAccesos', 'Configuraciones', 'Mensajes', 'NotificacionesLog')
    `);
    
    const expectedTables = 9; // Ahora esperamos 9 tablas (incluyendo NotificacionesLog)
    const foundTables = result.recordset[0].TableCount;
    
    if (foundTables < expectedTables) {
      logger.warn('[DB Init] ⚠️  Encontradas %d de %d tablas esperadas', foundTables, expectedTables);
      
      // Verificar cuáles tablas faltan
      const tablesCheck = await pool.request().query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME IN ('Clientes', 'Pedidos', 'Conversaciones', 'TelefonosAtencion', 'Usuarios', 'LogAccesos', 'Configuraciones', 'Mensajes', 'NotificacionesLog')
      `);
      
      const existingTables = tablesCheck.recordset.map(r => r.TABLE_NAME);
      const allTables = ['Clientes', 'Pedidos', 'Conversaciones', 'TelefonosAtencion', 'Usuarios', 'LogAccesos', 'Configuraciones', 'Mensajes', 'NotificacionesLog'];
      const missingTables = allTables.filter(t => !existingTables.includes(t));
      
      if (missingTables.length > 0) {
        logger.warn('[DB Init] 📋 Tablas faltantes: %s', missingTables.join(', '));
      }
    }
    
    return foundTables === expectedTables;
  } catch (err) {
    console.error('[DB Init] Error verificando tablas - ERROR COMPLETO:', err);
    logger.error('[DB Init] Error verificando tablas:', err.message);
    return false;
  }
  // No cerrar el pool compartido
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
      
      try {
        // Usar el pool compartido en lugar de crear uno nuevo
        const pool = await getPool();
        const tablesCheck = await pool.request().query(`
          SELECT TABLE_NAME 
          FROM INFORMATION_SCHEMA.TABLES 
          WHERE TABLE_NAME IN ('Clientes', 'Pedidos', 'Conversaciones', 'TelefonosAtencion', 'Usuarios', 'LogAccesos', 'Configuraciones', 'Mensajes', 'NotificacionesLog')
        `);
        
        const existingTables = tablesCheck.recordset.map(r => r.TABLE_NAME);
        const allTables = ['Clientes', 'Pedidos', 'Conversaciones', 'TelefonosAtencion', 'Usuarios', 'LogAccesos', 'Configuraciones', 'Mensajes', 'NotificacionesLog'];
        const missingTables = allTables.filter(t => !existingTables.includes(t));
        
        if (missingTables.length > 0) {
          logger.info('[DB Init] 📋 Creando tablas: %s', missingTables.join(', '));
          await createMissingTables(dbName, missingTables);
          logger.info('[DB Init] ✅ Tablas creadas exitosamente');
        }
      } catch (innerErr) {
        logger.error('[DB Init] Error verificando/creando tablas:', innerErr.message);
        throw innerErr;
      }
      // No cerrar el pool compartido
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
  }
  // NO cerrar el pool - mssql gestiona las conexiones internamente
}
