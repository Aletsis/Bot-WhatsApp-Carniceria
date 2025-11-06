-- Migración: Agregar campo TimeoutExpiraEn a tabla Conversaciones
-- Fecha: 2025-11-06
-- Sprint 2 - Tarea 6: Persistencia de timeouts

USE CarniceriaDB;
GO

-- Verificar si la columna ya existe
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('Conversaciones') 
    AND name = 'TimeoutExpiraEn'
)
BEGIN
    ALTER TABLE Conversaciones 
    ADD TimeoutExpiraEn DATETIME2 NULL;
    
    PRINT '✅ Campo TimeoutExpiraEn agregado a tabla Conversaciones';
END
ELSE
BEGIN
    PRINT 'ℹ️ Campo TimeoutExpiraEn ya existe en tabla Conversaciones';
END
GO

-- Crear índice para optimizar consultas de timeouts expirados
IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'IX_Conversaciones_TimeoutExpiraEn' 
    AND object_id = OBJECT_ID('Conversaciones')
)
BEGIN
    CREATE INDEX IX_Conversaciones_TimeoutExpiraEn 
    ON Conversaciones(TimeoutExpiraEn)
    WHERE TimeoutExpiraEn IS NOT NULL;
    
    PRINT '✅ Índice IX_Conversaciones_TimeoutExpiraEn creado';
END
ELSE
BEGIN
    PRINT 'ℹ️ Índice IX_Conversaciones_TimeoutExpiraEn ya existe';
END
GO

PRINT '';
PRINT '🎉 Migración completada exitosamente';
PRINT '';
