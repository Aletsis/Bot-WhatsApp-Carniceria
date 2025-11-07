/**
 * Migración 18: Agregar Rol 'supervisor'
 * 
 * Agrega el rol 'supervisor' al sistema, con permisos intermedios entre
 * 'admin' y 'editor'. Los supervisores pueden gestionar pedidos y clientes
 * pero no tienen acceso a configuraciones del sistema ni gestión de usuarios.
 * 
 * Permisos del Supervisor:
 * - ✅ Ver todos los pedidos y clientes
 * - ✅ Actualizar estado de pedidos
 * - ✅ Reimprimir tickets
 * - ✅ Ver conversaciones y chats
 * - ✅ Recibir notificaciones de errores
 * - ❌ NO crear/editar usuarios
 * - ❌ NO cambiar configuraciones del sistema
 * 
 * Fecha: 07/11/2025
 */

USE CarniceriaDB;
GO

-- ============================================
-- 1. Eliminar constraint actual de roles
-- ============================================

PRINT '🔧 Eliminando constraint actual de roles...';

-- Buscar el nombre exacto del constraint
DECLARE @ConstraintName NVARCHAR(256);
SELECT @ConstraintName = name
FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID('dbo.Usuarios')
  AND definition LIKE '%Rol%';

IF @ConstraintName IS NOT NULL
BEGIN
    DECLARE @SQL NVARCHAR(MAX);
    SET @SQL = 'ALTER TABLE dbo.Usuarios DROP CONSTRAINT ' + QUOTENAME(@ConstraintName);
    EXEC sp_executesql @SQL;
    PRINT '✅ Constraint eliminado: ' + @ConstraintName;
END
ELSE
BEGIN
    PRINT '⚠️  Constraint de roles no encontrado';
END
GO

-- ============================================
-- 2. Crear nuevo constraint con 'supervisor'
-- ============================================

PRINT '🔧 Creando nuevo constraint con rol supervisor...';

ALTER TABLE dbo.Usuarios
ADD CONSTRAINT CK_Usuarios_Rol 
CHECK (Rol IN ('admin', 'supervisor', 'editor', 'viewer'));
GO

PRINT '✅ Constraint creado con roles: admin, supervisor, editor, viewer';
GO

-- ============================================
-- 3. Verificar que no hay roles inválidos
-- ============================================

PRINT '🔍 Verificando roles existentes en la tabla...';

DECLARE @InvalidRoles INT;
SELECT @InvalidRoles = COUNT(*)
FROM dbo.Usuarios
WHERE Rol NOT IN ('admin', 'supervisor', 'editor', 'viewer');

IF @InvalidRoles > 0
BEGIN
    PRINT '⚠️  Encontrados ' + CAST(@InvalidRoles AS VARCHAR(10)) + ' usuarios con roles inválidos';
    
    -- Mostrar usuarios con roles inválidos
    SELECT 
        UsuarioID,
        Username,
        Rol,
        'INVALID ROLE' AS Advertencia
    FROM dbo.Usuarios
    WHERE Rol NOT IN ('admin', 'supervisor', 'editor', 'viewer');
    
    -- No actualizar automáticamente, mejor fallar para revisión manual
    RAISERROR('❌ Existen usuarios con roles inválidos. Corrígelos manualmente antes de aplicar esta migración.', 16, 1);
END
ELSE
BEGIN
    PRINT '✅ Todos los roles existentes son válidos';
END
GO

-- ============================================
-- 4. Mostrar resumen de usuarios por rol
-- ============================================

PRINT '📊 Resumen de usuarios por rol:';

SELECT 
    Rol,
    COUNT(*) AS CantidadUsuarios,
    CAST(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () AS DECIMAL(5,2)) AS Porcentaje
FROM dbo.Usuarios
WHERE Activo = 1
GROUP BY Rol
ORDER BY 
    CASE Rol
        WHEN 'admin' THEN 1
        WHEN 'supervisor' THEN 2
        WHEN 'editor' THEN 3
        WHEN 'viewer' THEN 4
    END;
GO

-- ============================================
-- 5. Crear usuario supervisor de ejemplo (OPCIONAL)
-- ============================================

/*
-- Descomentar para crear un usuario supervisor de prueba
-- Contraseña: Supervisor123!

DECLARE @Salt NVARCHAR(MAX) = '$2b$10$abcdefghijklmnopqrstuv';
DECLARE @Hash NVARCHAR(MAX) = '$2b$10$abcdefghijklmnopqrstuv.1234567890123456789012';

INSERT INTO dbo.Usuarios (Username, PasswordHash, Rol, Activo, CreadoEn)
VALUES ('supervisor', @Hash, 'supervisor', 1, GETDATE());

PRINT '✅ Usuario supervisor de prueba creado';
PRINT '   Username: supervisor';
PRINT '   Password: Supervisor123!';
PRINT '   ⚠️  CAMBIAR CONTRASEÑA EN PRODUCCIÓN';
*/

-- ============================================
-- 6. Documentar permisos por rol
-- ============================================

PRINT '';
PRINT '📋 PERMISOS POR ROL:';
PRINT '';
PRINT '🔴 ADMIN:';
PRINT '   - Acceso total al sistema';
PRINT '   - Gestión de usuarios';
PRINT '   - Configuraciones del sistema';
PRINT '   - Gestión de pedidos y clientes';
PRINT '';
PRINT '🟡 SUPERVISOR:';
PRINT '   - Ver todos los pedidos y clientes';
PRINT '   - Actualizar estado de pedidos';
PRINT '   - Reimprimir tickets';
PRINT '   - Ver conversaciones y chats';
PRINT '   - Recibir notificaciones de errores';
PRINT '   - NO puede crear/editar usuarios';
PRINT '   - NO puede cambiar configuraciones';
PRINT '';
PRINT '🟢 EDITOR:';
PRINT '   - Crear y editar pedidos';
PRINT '   - Crear y editar clientes';
PRINT '   - Ver conversaciones';
PRINT '   - NO puede eliminar ni configurar';
PRINT '';
PRINT '🔵 VIEWER:';
PRINT '   - Solo lectura';
PRINT '   - Ver pedidos y clientes';
PRINT '   - NO puede modificar nada';
PRINT '';

PRINT '✅ Migración 18 completada exitosamente';
PRINT '⏰ ' + CONVERT(VARCHAR(20), GETDATE(), 120);
GO

-- ============================================
-- 7. Verificación final
-- ============================================

-- Verificar que el constraint existe
IF EXISTS (
    SELECT 1 
    FROM sys.check_constraints 
    WHERE name = 'CK_Usuarios_Rol' 
      AND parent_object_id = OBJECT_ID('dbo.Usuarios')
)
BEGIN
    PRINT '';
    PRINT '✅ VERIFICACIÓN FINAL: Constraint CK_Usuarios_Rol creado correctamente';
    
    -- Mostrar definición del constraint
    SELECT 
        name AS ConstraintName,
        definition AS ConstraintDefinition
    FROM sys.check_constraints
    WHERE name = 'CK_Usuarios_Rol';
END
ELSE
BEGIN
    PRINT '';
    PRINT '❌ ERROR: Constraint CK_Usuarios_Rol no fue creado';
END
GO
