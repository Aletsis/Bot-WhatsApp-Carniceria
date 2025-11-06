-- Migración: Agregar control de concurrencia con locking optimista
-- Fecha: 2025-01-06
-- Sprint 3 - Tarea 1: Prevenir race conditions

USE CarniceriaDB;
GO

-- Agregar columna Version a tabla Conversaciones (crítica para concurrencia)
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('Conversaciones') 
    AND name = 'Version'
)
BEGIN
    ALTER TABLE Conversaciones 
    ADD Version INT NOT NULL DEFAULT 0;
    
    PRINT '✅ Campo Version agregado a tabla Conversaciones';
END
ELSE
BEGIN
    PRINT 'ℹ️ Campo Version ya existe en tabla Conversaciones';
END
GO

-- Agregar columna Version a tabla Pedidos (crítica para actualizaciones concurrentes)
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('Pedidos') 
    AND name = 'Version'
)
BEGIN
    ALTER TABLE Pedidos 
    ADD Version INT NOT NULL DEFAULT 0;
    
    PRINT '✅ Campo Version agregado a tabla Pedidos';
END
ELSE
BEGIN
    PRINT 'ℹ️ Campo Version ya existe en tabla Pedidos';
END
GO

-- Crear índices para optimizar consultas con Version
IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'IX_Conversaciones_NumeroTelefono_Version' 
    AND object_id = OBJECT_ID('Conversaciones')
)
BEGIN
    CREATE INDEX IX_Conversaciones_NumeroTelefono_Version 
    ON Conversaciones(NumeroTelefono, Version);
    
    PRINT '✅ Índice IX_Conversaciones_NumeroTelefono_Version creado';
END
ELSE
BEGIN
    PRINT 'ℹ️ Índice IX_Conversaciones_NumeroTelefono_Version ya existe';
END
GO

PRINT '';
PRINT '🎉 Migración completada exitosamente';
PRINT '';
PRINT '📋 Control de Concurrencia:';
PRINT '   - Version en Conversaciones: Previene race conditions en actualizaciones de sesión';
PRINT '   - Version en Pedidos: Previene conflictos en actualizaciones de estado';
PRINT '   - Locking optimista: Solo actualiza si Version coincide';
PRINT '';
