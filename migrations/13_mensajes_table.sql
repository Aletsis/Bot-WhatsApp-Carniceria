/**
 * Migración 13 - Tabla de Mensajes (Historial de Chats)
 * 
 * Crea la tabla para almacenar todo el historial de conversaciones
 * entre el bot y los clientes, permitiendo visualización y auditoría.
 */

USE CarniceriaDB;
GO

-- Verificar si la tabla ya existe
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Mensajes')
BEGIN
    CREATE TABLE Mensajes (
        MensajeID BIGINT PRIMARY KEY IDENTITY(1,1),
        NumeroTelefono NVARCHAR(30) NOT NULL,
        Tipo NVARCHAR(20) NOT NULL CHECK (Tipo IN ('recibido', 'enviado')),
        Contenido NVARCHAR(MAX) NOT NULL,
        TipoMensaje NVARCHAR(50) DEFAULT 'texto', -- texto, boton, imagen, etc.
        MetadataWhatsApp NVARCHAR(MAX), -- JSON con datos adicionales de WhatsApp
        Estado NVARCHAR(20) DEFAULT 'entregado', -- enviando, entregado, leido, fallido
        Fecha DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        
        -- Índice para búsquedas rápidas por teléfono y fecha
        INDEX IX_Mensajes_Telefono_Fecha (NumeroTelefono, Fecha DESC)
    );

    PRINT '✅ Tabla Mensajes creada exitosamente';
END
ELSE
BEGIN
    PRINT '⚠️  La tabla Mensajes ya existe, omitiendo creación';
END
GO

-- Crear índice adicional para búsquedas por fecha
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Mensajes_Fecha')
BEGIN
    CREATE INDEX IX_Mensajes_Fecha ON Mensajes(Fecha DESC);
    PRINT '✅ Índice IX_Mensajes_Fecha creado';
END
GO

PRINT '';
PRINT '========================================';
PRINT ' ✅ MIGRACIÓN 13 COMPLETADA';
PRINT '========================================';
PRINT '';
PRINT '📊 Tabla Mensajes lista para almacenar historial de conversaciones';
PRINT '   - Soporta mensajes enviados y recibidos';
PRINT '   - Índices optimizados para consultas rápidas';
PRINT '   - Metadatos de WhatsApp en formato JSON';
PRINT '';
