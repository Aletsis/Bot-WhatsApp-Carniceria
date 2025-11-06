-- Migración: Agregar campo EstadoImpresion a tabla Pedidos
-- Fecha: 2025-01-06
-- Sprint 2 - Tarea 9: Estado de impresión con funcionalidad de reimpresión

USE CarniceriaDB;
GO

-- Verificar si la columna ya existe
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('Pedidos') 
    AND name = 'EstadoImpresion'
)
BEGIN
    ALTER TABLE Pedidos 
    ADD EstadoImpresion NVARCHAR(50) NOT NULL DEFAULT 'Pendiente';
    
    PRINT '✅ Campo EstadoImpresion agregado a tabla Pedidos';
END
ELSE
BEGIN
    PRINT 'ℹ️ Campo EstadoImpresion ya existe en tabla Pedidos';
END
GO

-- Verificar si la columna FechaImpresion existe
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('Pedidos') 
    AND name = 'FechaImpresion'
)
BEGIN
    ALTER TABLE Pedidos 
    ADD FechaImpresion DATETIME2 NULL;
    
    PRINT '✅ Campo FechaImpresion agregado a tabla Pedidos';
END
ELSE
BEGIN
    PRINT 'ℹ️ Campo FechaImpresion ya existe en tabla Pedidos';
END
GO

-- Verificar si la columna ErrorImpresion existe
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('Pedidos') 
    AND name = 'ErrorImpresion'
)
BEGIN
    ALTER TABLE Pedidos 
    ADD ErrorImpresion NVARCHAR(500) NULL;
    
    PRINT '✅ Campo ErrorImpresion agregado a tabla Pedidos';
END
ELSE
BEGIN
    PRINT 'ℹ️ Campo ErrorImpresion ya existe en tabla Pedidos';
END
GO

-- Crear índice para optimizar consultas de pedidos por estado de impresión
IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'IX_Pedidos_EstadoImpresion' 
    AND object_id = OBJECT_ID('Pedidos')
)
BEGIN
    CREATE INDEX IX_Pedidos_EstadoImpresion 
    ON Pedidos(EstadoImpresion);
    
    PRINT '✅ Índice IX_Pedidos_EstadoImpresion creado';
END
ELSE
BEGIN
    PRINT 'ℹ️ Índice IX_Pedidos_EstadoImpresion ya existe';
END
GO

-- Agregar constraint para valores válidos de EstadoImpresion
IF NOT EXISTS (
    SELECT * FROM sys.check_constraints 
    WHERE name = 'CK_Pedidos_EstadoImpresion'
)
BEGIN
    ALTER TABLE Pedidos
    ADD CONSTRAINT CK_Pedidos_EstadoImpresion 
    CHECK (EstadoImpresion IN ('Pendiente', 'Impreso', 'Error', 'NoRequerida', 'Reimprimiendo'));
    
    PRINT '✅ Constraint CK_Pedidos_EstadoImpresion creado';
END
ELSE
BEGIN
    PRINT 'ℹ️ Constraint CK_Pedidos_EstadoImpresion ya existe';
END
GO

PRINT '';
PRINT '🎉 Migración completada exitosamente';
PRINT '';
PRINT '📋 Estados de impresión disponibles:';
PRINT '   - Pendiente: Pedido creado, esperando impresión';
PRINT '   - Impreso: Impresión exitosa';
PRINT '   - Error: Error durante la impresión';
PRINT '   - NoRequerida: Pedido no requiere impresión';
PRINT '   - Reimprimiendo: Reimpresión en proceso';
PRINT '';
