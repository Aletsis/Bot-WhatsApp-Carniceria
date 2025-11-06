/**
 * Migración 10 - Tabla de Configuraciones
 * 
 * Crea la tabla para almacenar configuraciones del sistema que pueden
 * ser modificadas desde el dashboard sin necesidad de reiniciar el servidor.
 * 
 * Categorías:
 * - PRINTER: Configuración de impresora ESC/POS
 * - WHATSAPP: Credenciales y configuración de WhatsApp API
 * - SYSTEM: Configuraciones del sistema (timeouts, límites)
 * - NOTIFICATIONS: Configuración de notificaciones automáticas
 */

-- Verificar si la tabla ya existe
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Configuraciones')
BEGIN
    CREATE TABLE Configuraciones (
        ConfigID INT PRIMARY KEY IDENTITY(1,1),
        Clave NVARCHAR(100) NOT NULL UNIQUE,
        Valor NVARCHAR(500) NOT NULL,
        Descripcion NVARCHAR(500),
        Tipo NVARCHAR(50) NOT NULL, -- 'string', 'number', 'boolean', 'secret'
        Categoria NVARCHAR(50) NOT NULL, -- 'PRINTER', 'WHATSAPP', 'SYSTEM', 'NOTIFICATIONS'
        Editable BIT NOT NULL DEFAULT 1, -- Permite deshabilitar edición de configs críticas
        FechaCreacion DATETIME DEFAULT SYSDATETIME(),
        FechaActualizacion DATETIME DEFAULT SYSDATETIME()
    );

    PRINT 'Tabla Configuraciones creada exitosamente';
END
ELSE
BEGIN
    PRINT 'La tabla Configuraciones ya existe, omitiendo creación';
END
GO

-- Crear índice para búsquedas rápidas por categoría
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Configuraciones_Categoria')
BEGIN
    CREATE INDEX IX_Configuraciones_Categoria ON Configuraciones(Categoria);
    PRINT 'Índice IX_Configuraciones_Categoria creado';
END
GO

-- Insertar configuraciones por defecto si no existen
IF NOT EXISTS (SELECT * FROM Configuraciones WHERE Clave = 'PRINTER_ENABLED')
BEGIN
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
    ('SESSION_TIMEOUT', '300000', 'Timeout de sesión en milisegundos (5 min default)', 'number', 'SYSTEM', 1),
    ('CONVERSATION_TIMEOUT', '1800000', 'Timeout de conversación en milisegundos (30 min default)', 'number', 'SYSTEM', 1),
    ('SESSION_TTL_MINUTES', '1440', 'Tiempo de vida de sesión HTTP en minutos (24h default)', 'number', 'SYSTEM', 1),
    
    -- === NOTIFICATIONS ===
    ('NOTIFICATIONS_ENABLED', 'true', 'Habilitar notificaciones automáticas a clientes', 'boolean', 'NOTIFICATIONS', 1);

    PRINT 'Configuraciones por defecto insertadas exitosamente';
END
ELSE
BEGIN
    PRINT 'Las configuraciones ya existen, omitiendo inserción';
END
GO

PRINT '✅ Migración 10_configuraciones completada';
