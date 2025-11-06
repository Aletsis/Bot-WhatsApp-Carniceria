-- Script de validación de esquema de base de datos
-- Verifica que todas las columnas necesarias existan

USE CarniceriaDB;
GO

PRINT '=== VALIDACIÓN DE ESQUEMA DE BASE DE DATOS ===';
PRINT '';

-- Validar tabla Pedidos
PRINT '📋 Validando tabla Pedidos...';
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Pedidos') AND name = 'EstadoImpresion')
    PRINT '  ✅ EstadoImpresion existe'
ELSE
    PRINT '  ❌ EstadoImpresion NO EXISTE';

IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Pedidos') AND name = 'FechaImpresion')
    PRINT '  ✅ FechaImpresion existe'
ELSE
    PRINT '  ❌ FechaImpresion NO EXISTE';

IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Pedidos') AND name = 'ErrorImpresion')
    PRINT '  ✅ ErrorImpresion existe'
ELSE
    PRINT '  ❌ ErrorImpresion NO EXISTE';

-- Validar constraint de EstadoImpresion
IF EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_Pedidos_EstadoImpresion')
    PRINT '  ✅ Constraint CK_Pedidos_EstadoImpresion existe'
ELSE
    PRINT '  ❌ Constraint CK_Pedidos_EstadoImpresion NO EXISTE';

PRINT '';

-- Validar tabla Conversaciones
PRINT '💬 Validando tabla Conversaciones...';
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Conversaciones') AND name = 'TimeoutExpiraEn')
    PRINT '  ✅ TimeoutExpiraEn existe'
ELSE
    PRINT '  ❌ TimeoutExpiraEn NO EXISTE';

PRINT '';

-- Validar índices
PRINT '📊 Validando índices...';
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Pedidos_EstadoImpresion')
    PRINT '  ✅ IX_Pedidos_EstadoImpresion existe'
ELSE
    PRINT '  ❌ IX_Pedidos_EstadoImpresion NO EXISTE';

IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Conversaciones_TimeoutExpiraEn')
    PRINT '  ✅ IX_Conversaciones_TimeoutExpiraEn existe'
ELSE
    PRINT '  ❌ IX_Conversaciones_TimeoutExpiraEn NO EXISTE';

PRINT '';

-- Mostrar todas las columnas de Pedidos
PRINT '📋 Columnas de tabla Pedidos:';
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Pedidos'
ORDER BY ORDINAL_POSITION;

PRINT '';

-- Mostrar todas las columnas de Conversaciones
PRINT '💬 Columnas de tabla Conversaciones:';
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Conversaciones'
ORDER BY ORDINAL_POSITION;

PRINT '';
PRINT '=== VALIDACIÓN COMPLETA ===';
