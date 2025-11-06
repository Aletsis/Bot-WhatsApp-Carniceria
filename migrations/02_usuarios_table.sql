-- Migración: Tabla de Usuarios para Dashboard
-- Fecha: 2025-11-05
-- Descripción: Tabla para almacenar usuarios del dashboard con contraseñas hasheadas

USE CarniceriaDB;
GO

-- Crear tabla de usuarios
CREATE TABLE Usuarios (
    UsuarioID INT IDENTITY(1,1) PRIMARY KEY,
    Username NVARCHAR(50) UNIQUE NOT NULL,
    PasswordHash NVARCHAR(255) NOT NULL,
    Rol NVARCHAR(20) NOT NULL DEFAULT 'viewer',
    Nombre NVARCHAR(100) NULL,
    Email NVARCHAR(100) NULL,
    Activo BIT NOT NULL DEFAULT 1,
    FechaCreacion DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    UltimoAcceso DATETIME2 NULL,
    CreadoPor NVARCHAR(50) NULL,
    CONSTRAINT CK_Usuarios_Rol CHECK (Rol IN ('admin', 'editor', 'viewer'))
);
GO

-- Crear índices
CREATE INDEX IX_Usuarios_Username ON Usuarios(Username);
CREATE INDEX IX_Usuarios_Activo ON Usuarios(Activo);
GO

-- Insertar usuario administrador por defecto
-- Contraseña: admin123 (debe cambiarse en producción)
INSERT INTO Usuarios (Username, PasswordHash, Rol, Nombre, Email, Activo, CreadoPor)
VALUES (
    'admin',
    '$2b$10$S4rilO7yYF0KWuG0NPSRTujWWsjrOSh75oCpotGJ5cM8A0AYrTSyW',
    'admin',
    'Administrador',
    'admin@carniceria.com',
    1,
    'SYSTEM'
);
GO

-- Crear tabla de registro de accesos (opcional, para auditoría)
CREATE TABLE LogAccesos (
    LogID BIGINT IDENTITY(1,1) PRIMARY KEY,
    UsuarioID INT NOT NULL FOREIGN KEY REFERENCES Usuarios(UsuarioID),
    FechaHora DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    IP NVARCHAR(50) NULL,
    Exitoso BIT NOT NULL DEFAULT 1,
    Detalles NVARCHAR(500) NULL
);
GO

CREATE INDEX IX_LogAccesos_UsuarioID ON LogAccesos(UsuarioID);
CREATE INDEX IX_LogAccesos_FechaHora ON LogAccesos(FechaHora DESC);
GO

PRINT '✅ Tabla Usuarios creada exitosamente';
PRINT '👤 Usuario admin creado (password: admin123)';
PRINT '⚠️  IMPORTANTE: Cambiar la contraseña del admin en producción';
