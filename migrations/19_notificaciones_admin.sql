-- =============================================
-- Migración 19: Sistema de Notificaciones de Errores a Administradores
-- =============================================
-- Fecha: 2025-11-06
-- Descripción: 
--   1. Agrega campo NumeroWhatsApp a tabla Usuarios para notificaciones
--   2. Crea tabla NotificacionesLog para tracking y throttling
--   3. Previene spam con últimas notificaciones enviadas
--
-- Propósito:
--   Enviar alertas vía WhatsApp a administradores cuando ocurren errores críticos:
--   - Errores de impresión recurrentes
--   - Fallos de base de datos
--   - Errores de WhatsApp API
--   - Webhooks inválidos
--   - Pedidos no impresos por más de X minutos
--
-- Seguridad:
--   - Solo administradores pueden recibir notificaciones
--   - NumeroWhatsApp es opcional (NULL permitido)
--   - Throttling evita spam (max 1 del mismo tipo cada X minutos)
-- =============================================

USE CarniceriaDB;
GO

-- =============================================
-- PASO 1: Agregar campo NumeroWhatsApp a tabla Usuarios
-- =============================================

PRINT '📱 Agregando campo NumeroWhatsApp a tabla Usuarios...';
GO

-- Verificar si la columna ya existe
IF NOT EXISTS (
    SELECT 1 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'Usuarios' 
      AND COLUMN_NAME = 'NumeroWhatsApp'
)
BEGIN
    ALTER TABLE dbo.Usuarios
    ADD NumeroWhatsApp NVARCHAR(20) NULL;
    
    PRINT '✅ Columna NumeroWhatsApp agregada';
END
ELSE
BEGIN
    PRINT '⚠️  Columna NumeroWhatsApp ya existe, omitiendo...';
END
GO

-- Agregar comentario a la columna (solo si no existe)
IF NOT EXISTS (
    SELECT 1
    FROM sys.extended_properties ep
    INNER JOIN sys.columns c ON ep.major_id = c.object_id AND ep.minor_id = c.column_id
    WHERE c.object_id = OBJECT_ID('dbo.Usuarios')
      AND c.name = 'NumeroWhatsApp'
      AND ep.name = 'MS_Description'
)
BEGIN
    EXEC sp_addextendedproperty 
        @name = N'MS_Description',
        @value = N'Número de WhatsApp del usuario para recibir notificaciones de errores críticos (solo admins). Formato: 52XXXXXXXXXX (sin + ni espacios)',
        @level0type = N'SCHEMA', @level0name = 'dbo',
        @level1type = N'TABLE',  @level1name = 'Usuarios',
        @level2type = N'COLUMN', @level2name = 'NumeroWhatsApp';
    
    PRINT '✅ Descripción de columna NumeroWhatsApp agregada';
END
ELSE
BEGIN
    PRINT '⚠️  Descripción ya existe para NumeroWhatsApp';
END
GO

PRINT '';
GO

-- =============================================
-- PASO 2: Crear tabla NotificacionesLog
-- =============================================

PRINT '📋 Creando tabla NotificacionesLog...';
GO

-- Verificar si la tabla ya existe
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'NotificacionesLog')
BEGIN
    CREATE TABLE dbo.NotificacionesLog (
        NotificacionID INT IDENTITY(1,1) PRIMARY KEY,
        
        -- Tipo de error notificado
        TipoError NVARCHAR(50) NOT NULL,
        
        -- Severidad del error
        Severidad NVARCHAR(20) NOT NULL DEFAULT 'ERROR',
        CHECK (Severidad IN ('CRITICAL', 'ERROR', 'WARNING', 'INFO')),
        
        -- Mensaje de la notificación
        Mensaje NVARCHAR(MAX) NOT NULL,
        
        -- Destinatarios (números de WhatsApp separados por comas)
        Destinatarios NVARCHAR(500) NOT NULL,
        
        -- Estado del envío
        Estado NVARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
        CHECK (Estado IN ('PENDIENTE', 'ENVIADO', 'ERROR', 'THROTTLED')),
        
        -- ID del mensaje de WhatsApp (si se envió exitosamente)
        WhatsAppMessageID NVARCHAR(255) NULL,
        
        -- Información adicional en formato JSON
        Metadata NVARCHAR(MAX) NULL,
        
        -- Timestamp de creación
        CreadoEn DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIME(),
        
        -- Timestamp de envío
        EnviadoEn DATETIMEOFFSET NULL,
        
        -- Error si el envío falló
        ErrorMensaje NVARCHAR(MAX) NULL
    );
    
    PRINT '✅ Tabla NotificacionesLog creada';
END
ELSE
BEGIN
    PRINT '⚠️  Tabla NotificacionesLog ya existe, omitiendo...';
END
GO

-- Agregar comentario a la tabla (solo si no existe)
IF NOT EXISTS (
    SELECT 1
    FROM sys.extended_properties ep
    WHERE ep.major_id = OBJECT_ID('dbo.NotificacionesLog')
      AND ep.minor_id = 0
      AND ep.name = 'MS_Description'
)
BEGIN
    EXEC sp_addextendedproperty 
        @name = N'MS_Description',
        @value = N'Registro de notificaciones de errores enviadas a administradores. Usado para tracking y throttling (evitar spam).',
        @level0type = N'SCHEMA', @level0name = 'dbo',
        @level1type = N'TABLE',  @level1name = 'NotificacionesLog';
    
    PRINT '✅ Descripción de tabla NotificacionesLog agregada';
END
ELSE
BEGIN
    PRINT '⚠️  Descripción ya existe para NotificacionesLog';
END
GO

PRINT '';
GO

-- =============================================
-- PASO 3: Crear índices para NotificacionesLog
-- =============================================

PRINT '📊 Creando índices para NotificacionesLog...';
GO

-- Índice para búsquedas por tipo de error y fecha (throttling)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_NotificacionesLog_TipoError_CreadoEn')
BEGIN
    CREATE INDEX IX_NotificacionesLog_TipoError_CreadoEn
    ON dbo.NotificacionesLog(TipoError, CreadoEn DESC);
    
    PRINT '✅ Índice IX_NotificacionesLog_TipoError_CreadoEn creado';
END
ELSE
BEGIN
    PRINT '⚠️  Índice IX_NotificacionesLog_TipoError_CreadoEn ya existe';
END
GO

-- Índice para búsquedas por estado
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_NotificacionesLog_Estado')
BEGIN
    CREATE INDEX IX_NotificacionesLog_Estado
    ON dbo.NotificacionesLog(Estado, CreadoEn DESC);
    
    PRINT '✅ Índice IX_NotificacionesLog_Estado creado';
END
ELSE
BEGIN
    PRINT '⚠️  Índice IX_NotificacionesLog_Estado ya existe';
END
GO

-- Índice para búsquedas por severidad
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_NotificacionesLog_Severidad')
BEGIN
    CREATE INDEX IX_NotificacionesLog_Severidad
    ON dbo.NotificacionesLog(Severidad, CreadoEn DESC);
    
    PRINT '✅ Índice IX_NotificacionesLog_Severidad creado';
END
ELSE
BEGIN
    PRINT '⚠️  Índice IX_NotificacionesLog_Severidad ya existe';
END
GO

PRINT '';
GO

-- =============================================
-- PASO 4: Agregar configuraciones del sistema
-- =============================================

PRINT '⚙️  Agregando configuraciones de notificaciones...';
GO

-- Configuración de throttling (minutos entre notificaciones del mismo tipo)
IF NOT EXISTS (SELECT 1 FROM dbo.Configuraciones WHERE Clave = 'NOTIFICATION_THROTTLE_MINUTES')
BEGIN
    INSERT INTO dbo.Configuraciones (Clave, Valor, Tipo, Categoria, Descripcion, Editable)
    VALUES (
        'NOTIFICATION_THROTTLE_MINUTES',
        '15',
        'number',
        'NOTIFICATIONS',
        'Minutos mínimos entre notificaciones del mismo tipo (evita spam)',
        1
    );
    PRINT '✅ Config NOTIFICATION_THROTTLE_MINUTES creada';
END
ELSE
BEGIN
    PRINT '⚠️  Config NOTIFICATION_THROTTLE_MINUTES ya existe';
END
GO

-- Habilitar/deshabilitar notificaciones de errores
IF NOT EXISTS (SELECT 1 FROM dbo.Configuraciones WHERE Clave = 'ERROR_NOTIFICATIONS_ENABLED')
BEGIN
    INSERT INTO dbo.Configuraciones (Clave, Valor, Tipo, Categoria, Descripcion, Editable)
    VALUES (
        'ERROR_NOTIFICATIONS_ENABLED',
        'true',
        'boolean',
        'NOTIFICATIONS',
        'Habilitar notificaciones de errores a administradores vía WhatsApp',
        1
    );
    PRINT '✅ Config ERROR_NOTIFICATIONS_ENABLED creada';
END
ELSE
BEGIN
    PRINT '⚠️  Config ERROR_NOTIFICATIONS_ENABLED ya existe';
END
GO

-- Límite de errores de impresión antes de notificar
IF NOT EXISTS (SELECT 1 FROM dbo.Configuraciones WHERE Clave = 'PRINTING_ERROR_THRESHOLD')
BEGIN
    INSERT INTO dbo.Configuraciones (Clave, Valor, Tipo, Categoria, Descripcion, Editable)
    VALUES (
        'PRINTING_ERROR_THRESHOLD',
        '3',
        'number',
        'NOTIFICATIONS',
        'Cantidad de errores de impresión consecutivos antes de notificar',
        1
    );
    PRINT '✅ Config PRINTING_ERROR_THRESHOLD creada';
END
ELSE
BEGIN
    PRINT '⚠️  Config PRINTING_ERROR_THRESHOLD ya existe';
END
GO

PRINT '';
GO

-- =============================================
-- PASO 5: Verificación y resumen
-- =============================================

PRINT '';
PRINT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
PRINT '📊 VERIFICACIÓN DE MIGRACIÓN';
PRINT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
PRINT '';
GO

-- Verificar columna NumeroWhatsApp
PRINT '1️⃣  Verificando columna NumeroWhatsApp:';
SELECT 
    TABLE_NAME AS Tabla,
    COLUMN_NAME AS Columna,
    DATA_TYPE AS Tipo,
    IS_NULLABLE AS Nullable,
    CHARACTER_MAXIMUM_LENGTH AS MaxLength
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Usuarios' 
  AND COLUMN_NAME = 'NumeroWhatsApp';
GO

PRINT '';
PRINT '2️⃣  Verificando tabla NotificacionesLog:';
SELECT 
    TABLE_NAME AS Tabla,
    TABLE_TYPE AS Tipo
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME = 'NotificacionesLog';
GO

PRINT '';
PRINT '3️⃣  Columnas de NotificacionesLog:';
SELECT 
    COLUMN_NAME AS Columna,
    DATA_TYPE AS Tipo,
    IS_NULLABLE AS Nullable
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'NotificacionesLog'
ORDER BY ORDINAL_POSITION;
GO

PRINT '';
PRINT '4️⃣  Índices de NotificacionesLog:';
SELECT 
    i.name AS Indice,
    i.type_desc AS Tipo,
    STRING_AGG(c.name, ', ') AS Columnas
FROM sys.indexes i
INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
WHERE i.object_id = OBJECT_ID('dbo.NotificacionesLog')
GROUP BY i.name, i.type_desc, i.index_id
ORDER BY i.index_id;
GO

PRINT '';
PRINT '5️⃣  Configuraciones de notificaciones:';
SELECT 
    Clave,
    Valor,
    Tipo,
    Categoria,
    Descripcion
FROM dbo.Configuraciones
WHERE Categoria = 'NOTIFICATIONS'
ORDER BY Clave;
GO

PRINT '';
PRINT '6️⃣  Administradores activos (pueden recibir notificaciones):';
SELECT 
    UsuarioID,
    Username,
    Nombre,
    NumeroWhatsApp,
    CASE 
        WHEN NumeroWhatsApp IS NULL THEN '❌ Sin WhatsApp'
        ELSE '✅ Configurado'
    END AS EstadoNotificaciones
FROM dbo.Usuarios
WHERE Rol = 'admin' 
  AND Activo = 1
ORDER BY UsuarioID;
GO

PRINT '';
PRINT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
PRINT '✅ MIGRACIÓN 19 COMPLETADA EXITOSAMENTE';
PRINT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
PRINT '';
PRINT '📝 SIGUIENTE PASO:';
PRINT '   1. Actualizar NumeroWhatsApp de administradores en tabla Usuarios';
PRINT '      UPDATE dbo.Usuarios SET NumeroWhatsApp = ''52XXXXXXXXXX'' WHERE UsuarioID = X;';
PRINT '';
PRINT '   2. Implementar notificationService.js para enviar notificaciones';
PRINT '';
PRINT '   3. Integrar en puntos críticos:';
PRINT '      - printingService.js (errores de impresión)';
PRINT '      - whatsappService.js (errores de API)';
PRINT '      - dbService.js (fallos de conexión)';
PRINT '      - webhookController.js (webhooks inválidos)';
PRINT '';
PRINT '💡 TIPOS DE ERROR SUGERIDOS:';
PRINT '   - PRINTING_ERROR      : Error de impresión';
PRINT '   - PRINTING_RECURRING  : 3+ errores de impresión en 10 min';
PRINT '   - WHATSAPP_API_ERROR  : Error de WhatsApp API';
PRINT '   - DATABASE_ERROR      : Error de conexión a BD';
PRINT '   - WEBHOOK_INVALID     : Webhook con firma inválida';
PRINT '   - ORDER_NOT_PRINTED   : Pedido sin imprimir por X minutos';
PRINT '';
GO
