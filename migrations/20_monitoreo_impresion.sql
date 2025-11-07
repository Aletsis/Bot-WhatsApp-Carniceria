-- =============================================
-- Migración 20: Sistema de Monitoreo de Pedidos No Impresos
-- =============================================
-- Fecha: 2025-11-07
-- Descripción: 
--   1. Agrega campo NotificacionImpresionEnviada a tabla Pedidos
--   2. Agrega configuraciones para el sistema de monitoreo
--   3. Permite trackear si ya se notificó un pedido no impreso
--
-- Propósito:
--   Alertar a supervisores/admins cuando un pedido no se imprime en tiempo razonable:
--   - Detectar pedidos con EstadoImpresion = 'Error' o 'Pendiente'
--   - Verificar que han pasado más de X minutos desde creación
--   - Enviar notificación ORDER_NOT_PRINTED vía WhatsApp
--   - Evitar notificaciones duplicadas del mismo pedido
--
-- Seguridad:
--   - Solo administradores y supervisores reciben notificaciones
--   - Campo NotificacionImpresionEnviada es nullable (no afecta pedidos existentes)
--   - Configurable desde tabla Configuraciones
-- =============================================

USE CarniceriaDB;
GO

-- =============================================
-- PASO 1: Agregar campo NotificacionImpresionEnviada a tabla Pedidos
-- =============================================

PRINT '📋 Agregando campo NotificacionImpresionEnviada a tabla Pedidos...';
GO

-- Verificar si la columna ya existe
IF NOT EXISTS (
    SELECT 1 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'Pedidos' 
      AND COLUMN_NAME = 'NotificacionImpresionEnviada'
)
BEGIN
    ALTER TABLE dbo.Pedidos
    ADD NotificacionImpresionEnviada DATETIMEOFFSET NULL;
    
    PRINT '✅ Columna NotificacionImpresionEnviada agregada';
END
ELSE
BEGIN
    PRINT '⚠️  Columna NotificacionImpresionEnviada ya existe, omitiendo...';
END
GO

-- Agregar comentario a la columna (solo si no existe)
IF NOT EXISTS (
    SELECT 1
    FROM sys.extended_properties ep
    INNER JOIN sys.columns c ON ep.major_id = c.object_id AND ep.minor_id = c.column_id
    WHERE c.object_id = OBJECT_ID('dbo.Pedidos')
      AND c.name = 'NotificacionImpresionEnviada'
      AND ep.name = 'MS_Description'
)
BEGIN
    EXEC sp_addextendedproperty 
        @name = N'MS_Description',
        @value = N'Timestamp de cuando se envió notificación de impresión pendiente. NULL si no se ha notificado. Evita notificaciones duplicadas del mismo pedido.',
        @level0type = N'SCHEMA', @level0name = 'dbo',
        @level1type = N'TABLE',  @level1name = 'Pedidos',
        @level2type = N'COLUMN', @level2name = 'NotificacionImpresionEnviada';
    
    PRINT '✅ Descripción de columna NotificacionImpresionEnviada agregada';
END
ELSE
BEGIN
    PRINT '⚠️  Descripción ya existe para NotificacionImpresionEnviada';
END
GO

PRINT '';
GO

-- =============================================
-- PASO 2: Agregar índice para consultas de monitoreo
-- =============================================

PRINT '📊 Creando índice para monitoreo de impresión...';
GO

-- Índice compuesto para consultas eficientes de pedidos no impresos
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Pedidos_EstadoImpresion_Fecha')
BEGIN
    CREATE INDEX IX_Pedidos_EstadoImpresion_Fecha
    ON dbo.Pedidos(EstadoImpresion, Fecha)
    INCLUDE (PedidoID, Folio, NotificacionImpresionEnviada)
    WHERE EstadoImpresion IN ('Pendiente', 'Error');
    
    PRINT '✅ Índice IX_Pedidos_EstadoImpresion_Fecha creado';
END
ELSE
BEGIN
    PRINT '⚠️  Índice IX_Pedidos_EstadoImpresion_Fecha ya existe';
END
GO

PRINT '';
GO

-- =============================================
-- PASO 3: Agregar configuraciones del sistema
-- =============================================

PRINT '⚙️  Agregando configuraciones de monitoreo de impresión...';
GO

-- Habilitar/deshabilitar monitoreo de pedidos no impresos
IF NOT EXISTS (SELECT 1 FROM dbo.Configuraciones WHERE Clave = 'PRINT_MONITOR_ENABLED')
BEGIN
    INSERT INTO dbo.Configuraciones (Clave, Valor, Tipo, Categoria, Descripcion, Editable)
    VALUES (
        'PRINT_MONITOR_ENABLED',
        'true',
        'boolean',
        'NOTIFICATIONS',
        'Habilitar monitoreo automático de pedidos no impresos',
        1
    );
    PRINT '✅ Config PRINT_MONITOR_ENABLED creada';
END
ELSE
BEGIN
    PRINT '⚠️  Config PRINT_MONITOR_ENABLED ya existe';
END
GO

-- Intervalo del job de monitoreo (minutos)
IF NOT EXISTS (SELECT 1 FROM dbo.Configuraciones WHERE Clave = 'PRINT_MONITOR_INTERVAL')
BEGIN
    INSERT INTO dbo.Configuraciones (Clave, Valor, Tipo, Categoria, Descripcion, Editable)
    VALUES (
        'PRINT_MONITOR_INTERVAL',
        '5',
        'number',
        'NOTIFICATIONS',
        'Intervalo en minutos para verificar pedidos no impresos',
        1
    );
    PRINT '✅ Config PRINT_MONITOR_INTERVAL creada';
END
ELSE
BEGIN
    PRINT '⚠️  Config PRINT_MONITOR_INTERVAL ya existe';
END
GO

-- Timeout para considerar un pedido como "no impreso" (minutos)
IF NOT EXISTS (SELECT 1 FROM dbo.Configuraciones WHERE Clave = 'PRINT_TIMEOUT_MINUTES')
BEGIN
    INSERT INTO dbo.Configuraciones (Clave, Valor, Tipo, Categoria, Descripcion, Editable)
    VALUES (
        'PRINT_TIMEOUT_MINUTES',
        '15',
        'number',
        'NOTIFICATIONS',
        'Minutos de espera antes de notificar pedido no impreso',
        1
    );
    PRINT '✅ Config PRINT_TIMEOUT_MINUTES creada';
END
ELSE
BEGIN
    PRINT '⚠️  Config PRINT_TIMEOUT_MINUTES ya existe';
END
GO

PRINT '';
GO

-- =============================================
-- PASO 4: Verificación y resumen
-- =============================================

PRINT '';
PRINT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
PRINT '📊 VERIFICACIÓN DE MIGRACIÓN';
PRINT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
PRINT '';
GO

-- Verificar columna NotificacionImpresionEnviada
PRINT '1️⃣  Verificando columna NotificacionImpresionEnviada:';
SELECT 
    TABLE_NAME AS Tabla,
    COLUMN_NAME AS Columna,
    DATA_TYPE AS Tipo,
    IS_NULLABLE AS Nullable
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Pedidos' 
  AND COLUMN_NAME = 'NotificacionImpresionEnviada';
GO

PRINT '';
PRINT '2️⃣  Verificando índice de monitoreo:';
SELECT 
    i.name AS NombreIndice,
    i.type_desc AS Tipo,
    i.filter_definition AS Filtro
FROM sys.indexes i
WHERE i.object_id = OBJECT_ID('dbo.Pedidos')
  AND i.name = 'IX_Pedidos_EstadoImpresion_Fecha';
GO

PRINT '';
PRINT '3️⃣  Configuraciones de monitoreo de impresión:';
SELECT 
    Clave,
    Valor,
    Tipo,
    Descripcion
FROM dbo.Configuraciones
WHERE Clave IN ('PRINT_MONITOR_ENABLED', 'PRINT_MONITOR_INTERVAL', 'PRINT_TIMEOUT_MINUTES')
ORDER BY Clave;
GO

PRINT '';
PRINT '4️⃣  Pedidos pendientes de impresión (últimos 24 horas):';
SELECT 
    COUNT(*) AS TotalPendientes,
    SUM(CASE WHEN EstadoImpresion = 'Pendiente' THEN 1 ELSE 0 END) AS Pendientes,
    SUM(CASE WHEN EstadoImpresion = 'Error' THEN 1 ELSE 0 END) AS ConError,
    SUM(CASE WHEN DATEDIFF(MINUTE, Fecha, SYSDATETIME()) > 15 THEN 1 ELSE 0 END) AS MayorA15Min
FROM dbo.Pedidos
WHERE EstadoImpresion IN ('Pendiente', 'Error')
  AND Fecha >= DATEADD(day, -1, SYSDATETIME());
GO

PRINT '';
PRINT '5️⃣  Ejemplo de consulta que usará el monitoreo:';
PRINT '';
SELECT TOP 5
    PedidoID,
    Folio,
    EstadoImpresion,
    Fecha,
    DATEDIFF(MINUTE, Fecha, SYSDATETIME()) AS MinutosSinImprimir,
    NotificacionImpresionEnviada,
    CASE 
        WHEN NotificacionImpresionEnviada IS NULL THEN 'Sin notificar'
        ELSE 'Ya notificado en ' + CONVERT(VARCHAR, NotificacionImpresionEnviada, 120)
    END AS EstadoNotificacion
FROM dbo.Pedidos
WHERE EstadoImpresion IN ('Pendiente', 'Error')
  AND DATEDIFF(MINUTE, Fecha, SYSDATETIME()) > 15
  AND NotificacionImpresionEnviada IS NULL
ORDER BY Fecha;
GO

PRINT '';
PRINT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
PRINT '✅ MIGRACIÓN 20 COMPLETADA EXITOSAMENTE';
PRINT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
PRINT '';
PRINT '📝 SIGUIENTE PASO:';
PRINT '   1. Implementar printMonitorService.js con job periódico';
PRINT '';
PRINT '   2. El job debe:';
PRINT '      - Ejecutarse cada 5 minutos (configurable)';
PRINT '      - Buscar pedidos con EstadoImpresion IN (''Pendiente'', ''Error'')';
PRINT '      - Filtrar por Fecha > 15 minutos atrás';
PRINT '      - Excluir pedidos ya notificados (NotificacionImpresionEnviada IS NULL)';
PRINT '      - Enviar notificación ORDER_NOT_PRINTED';
PRINT '      - Actualizar NotificacionImpresionEnviada = SYSDATETIME()';
PRINT '';
PRINT '   3. Integrar en app.js:';
PRINT '      import { startPrintMonitor } from ''./services/printMonitorService.js'';';
PRINT '      await startPrintMonitor();';
PRINT '';
PRINT '   4. Probar con script test-print-monitor.js';
PRINT '';
PRINT '💡 QUERY ÚTIL PARA DEBUGGING:';
PRINT '   -- Ver pedidos que serían notificados';
PRINT '   SELECT * FROM Pedidos';
PRINT '   WHERE EstadoImpresion IN (''Pendiente'', ''Error'')';
PRINT '     AND DATEDIFF(MINUTE, Fecha, SYSDATETIME()) > 15';
PRINT '     AND NotificacionImpresionEnviada IS NULL;';
PRINT '';
PRINT '   -- Resetear notificación de un pedido (para testing)';
PRINT '   UPDATE Pedidos SET NotificacionImpresionEnviada = NULL WHERE PedidoID = X;';
PRINT '';
GO
