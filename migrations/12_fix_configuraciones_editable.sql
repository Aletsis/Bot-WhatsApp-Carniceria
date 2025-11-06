/**
 * Migración 12 - Diagnóstico y Corrección de Configuraciones
 * 
 * Este script:
 * 1. Verifica el estado actual de las configuraciones
 * 2. Corrige el campo Editable para permitir edición desde dashboard
 * 3. Muestra el estado final para confirmar
 */

USE CarniceriaDB;
GO

PRINT '========================================';
PRINT ' DIAGNÓSTICO DE CONFIGURACIONES';
PRINT '========================================';
PRINT '';

-- 1. Verificar si la tabla existe
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Configuraciones')
BEGIN
    PRINT '❌ ERROR: La tabla Configuraciones no existe.';
    PRINT '   Por favor ejecute primero: migrations/10_configuraciones.sql';
END
ELSE
BEGIN
    PRINT '✅ Tabla Configuraciones encontrada';
    PRINT '';
    
    -- 2. Mostrar estado actual
    PRINT '--- Estado actual de configuraciones ---';
    SELECT 
        ConfigID,
        Clave,
        Valor = CASE 
            WHEN Tipo = 'secret' AND LEN(Valor) > 4 THEN '****' + RIGHT(Valor, 4)
            ELSE Valor 
        END,
        Tipo,
        Categoria,
        Editable,
        FechaActualizacion
    FROM Configuraciones 
    ORDER BY Categoria, Clave;
    
    PRINT '';
    PRINT '--- Resumen por Editable ---';
    SELECT 
        Editable,
        Cantidad = COUNT(*)
    FROM Configuraciones
    GROUP BY Editable;
    
    PRINT '';
    
    -- 3. Corregir configuraciones no editables
    DECLARE @RowsUpdated INT;
    
    UPDATE Configuraciones 
    SET Editable = 1 
    WHERE Editable = 0 OR Editable IS NULL;
    
    SET @RowsUpdated = @@ROWCOUNT;
    
    IF @RowsUpdated > 0
    BEGIN
        PRINT '✅ Se actualizaron ' + CAST(@RowsUpdated AS NVARCHAR) + ' configuraciones a Editable = 1';
    END
    ELSE
    BEGIN
        PRINT '✅ Todas las configuraciones ya eran editables';
    END
    
    PRINT '';
    PRINT '--- Estado final ---';
    SELECT 
        ConfigID,
        Clave,
        Tipo,
        Categoria,
        Editable,
        Descripcion
    FROM Configuraciones 
    ORDER BY Categoria, Clave;
    
    PRINT '';
    PRINT '========================================';
    PRINT ' ✅ MIGRACIÓN 12 COMPLETADA';
    PRINT '========================================';
END
GO
