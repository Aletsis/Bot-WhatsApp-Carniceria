-- Ejecutar este script en SQL Server Management Studio
-- Conectado como administrador (Windows Authentication)

-- 1. Crear el login AppUser
CREATE LOGIN [AppUser] WITH PASSWORD = 'Fina2017.', CHECK_POLICY = OFF;
GO

-- 2. Crear la base de datos si no existe
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'CarniceriaDB')
BEGIN
    CREATE DATABASE [CarniceriaDB];
END
GO

-- 3. Usar la base de datos
USE [CarniceriaDB];
GO

-- 4. Crear el usuario en la base de datos
CREATE USER [AppUser] FOR LOGIN [AppUser];
GO

-- 5. Otorgar permisos de dueño de la base de datos
ALTER ROLE [db_owner] ADD MEMBER [AppUser];
GO

PRINT '✅ Usuario AppUser creado exitosamente';
PRINT '✅ Permisos otorgados en CarniceriaDB';
PRINT '';
PRINT 'Ahora tu aplicación puede conectarse con:';
PRINT 'DB_HOST=localhost';
PRINT 'DB_PORT=1433';
PRINT 'DB_USER=AppUser';
PRINT 'DB_PASS=Fina2017.';
PRINT 'DB_NAME=CarniceriaDB';