# 🔐 Migración de Autenticación a Base de Datos

## 📋 Resumen

Se ha migrado el sistema de autenticación de usuarios hardcodeados en el código a una base de datos SQL Server, mejorando la seguridad y permitiendo la gestión dinámica de usuarios.

## 🎯 Cambios Realizados

### 1. Nueva Tabla en BD
- Tabla `Usuarios` con campos: Username, PasswordHash, Rol, Nombre, Email, Activo
- Tabla `LogAccesos` para auditoría (opcional)
- Índices para optimizar consultas

### 2. Nuevo Servicio
- `src/services/userService.js`: CRUD completo de usuarios
- Funciones para autenticación, creación, actualización, activación/desactivación

### 3. Middleware Actualizado
- `src/middleware/auth.js`: Ahora usa BD en lugar de array hardcodeado
- Nueva función `requireRole()` para control de acceso basado en roles
- Registro de último acceso automático

### 4. Scripts de Gestión
- `scripts/manage-users.js`: CLI interactiva para gestionar usuarios
- `migrations/02_usuarios_table.sql`: Script SQL para crear tablas

### 5. API Endpoints
- `GET /dashboard/api/usuarios` - Listar usuarios (solo admin)
- `POST /dashboard/api/usuarios` - Crear usuario (solo admin)
- `PUT /dashboard/api/usuarios/:id/password` - Cambiar contraseña (solo admin)
- `PUT /dashboard/api/usuarios/:id/toggle` - Activar/desactivar (solo admin)

---

## 🚀 Pasos de Migración

### Paso 1: Ejecutar Migración SQL

Conecta a tu SQL Server y ejecuta el script:

```bash
# En SQL Server Management Studio o Azure Data Studio
# Abrir y ejecutar: migrations/02_usuarios_table.sql
```

O usando sqlcmd:
```bash
sqlcmd -S localhost -d CarniceriaDB -i migrations/02_usuarios_table.sql
```

Esto creará:
- ✅ Tabla `Usuarios`
- ✅ Tabla `LogAccesos` 
- ✅ Usuario admin por defecto (username: `admin`, password: `admin123`)

### Paso 2: Verificar que la migración fue exitosa

Conecta a la BD y verifica:
```sql
SELECT * FROM Usuarios;
-- Deberías ver el usuario 'admin'
```

### Paso 3: Reiniciar la aplicación

```bash
npm start
```

### Paso 4: Probar el login

Accede a `http://localhost:3000/login` con:
- **Usuario**: `admin`
- **Contraseña**: `admin123`

⚠️ **IMPORTANTE**: Cambia la contraseña del admin en producción

---

## 🔧 Gestión de Usuarios

### Opción 1: CLI Interactiva (Recomendada)

Ejecuta el script de gestión:

```bash
npm run manage-users
```

Menú disponible:
```
1. 📋 Listar usuarios
2. ➕ Crear usuario
3. 🔑 Cambiar contraseña
4. 🚫 Desactivar usuario
5. ✅ Activar usuario
6. 🔐 Generar hash de contraseña
0. 🚪 Salir
```

### Opción 2: Directamente en SQL

**Crear usuario nuevo:**
```sql
-- Primero genera el hash de la contraseña
-- Usa el script: node scripts/generate-password.js tu_password

INSERT INTO Usuarios (Username, PasswordHash, Rol, Nombre, Email, Activo)
VALUES (
    'juan',
    '$2b$10$...',  -- Hash generado
    'editor',
    'Juan Pérez',
    'juan@example.com',
    1
);
```

**Cambiar contraseña:**
```sql
-- Genera el hash primero, luego:
UPDATE Usuarios 
SET PasswordHash = '$2b$10$...'
WHERE Username = 'admin';
```

**Desactivar usuario:**
```sql
UPDATE Usuarios 
SET Activo = 0 
WHERE Username = 'juan';
```

### Opción 3: Desde el Dashboard (próximamente)

Se puede implementar una interfaz web en el dashboard para gestionar usuarios.

---

## 👥 Roles Disponibles

| Rol | Descripción | Permisos |
|-----|-------------|----------|
| `admin` | Administrador | Acceso completo, gestión de usuarios |
| `editor` | Editor | Puede modificar pedidos y clientes |
| `viewer` | Visualizador | Solo lectura, no puede modificar |

---

## 🔒 Seguridad

### Contraseñas
- ✅ Hasheadas con bcrypt (10 salt rounds)
- ✅ Nunca se almacenan en texto plano
- ✅ No se envían en respuestas API

### Sesiones
- ✅ Almacenadas en memoria del servidor
- ✅ Cookie httpOnly (no accesible desde JS)
- ✅ Cookie secure en producción (solo HTTPS)
- ✅ Timeout de 24 horas

### Auditoría
- ✅ Registro de último acceso
- ✅ Tabla `LogAccesos` para auditoría completa
- ✅ Logs detallados de intentos fallidos

---

## 📊 Estructura de Datos

### Tabla Usuarios
```sql
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
    CreadoPor NVARCHAR(50) NULL
);
```

### Tabla LogAccesos (auditoría)
```sql
CREATE TABLE LogAccesos (
    LogID BIGINT IDENTITY(1,1) PRIMARY KEY,
    UsuarioID INT NOT NULL FOREIGN KEY REFERENCES Usuarios(UsuarioID),
    FechaHora DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    IP NVARCHAR(50) NULL,
    Exitoso BIT NOT NULL DEFAULT 1,
    Detalles NVARCHAR(500) NULL
);
```

---

## 🧪 Testing

### Probar autenticación
```bash
# Login correcto
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin123"

# Login incorrecto
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=wrong"
```

### Probar API de usuarios (necesitas estar autenticado)
```bash
# Listar usuarios
curl http://localhost:3000/dashboard/api/usuarios \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

---

## ⚠️ Importante en Producción

1. **Cambiar contraseña del admin**
   ```bash
   npm run manage-users
   # Seleccionar opción 3: Cambiar contraseña
   ```

2. **Configurar SESSION_SECRET**
   ```bash
   # En .env
   SESSION_SECRET=un-secreto-muy-largo-y-aleatorio-de-al-menos-32-caracteres
   ```

3. **Usar HTTPS**
   - Las cookies solo se marcan como `secure` si `NODE_ENV=production`

4. **Backups regulares**
   - Incluir tabla `Usuarios` en backups de BD

5. **Monitorear intentos fallidos**
   - Revisar tabla `LogAccesos` regularmente
   - Considerar bloqueo temporal después de N intentos fallidos

---

## 🔄 Rollback (Si hay problemas)

Si necesitas volver al sistema anterior temporalmente:

1. No ejecutes la migración SQL
2. Revierte los cambios en git:
   ```bash
   git revert HEAD
   ```

3. O manualmente, restaura estos archivos a su versión anterior:
   - `src/middleware/auth.js`
   - `src/controllers/authController.js`

---

## 📝 Próximas Mejoras

- [ ] Interfaz web en dashboard para gestión de usuarios
- [ ] Reset de contraseña por email
- [ ] Autenticación de dos factores (2FA)
- [ ] Bloqueo automático después de intentos fallidos
- [ ] Historial de cambios de usuarios
- [ ] Permisos más granulares

---

## 🆘 Troubleshooting

### Error: "Table 'Usuarios' doesn't exist"
**Solución**: Ejecuta la migración SQL `migrations/02_usuarios_table.sql`

### Error: "Login failed"
**Solución**: Verifica que el usuario existe en la BD:
```sql
SELECT * FROM Usuarios WHERE Username = 'admin';
```

### Error: "Cannot connect to database"
**Solución**: Verifica variables de entorno en `.env`:
```
DB_HOST=localhost
DB_USER=sa
DB_PASS=tu_password
DB_NAME=CarniceriaDB
```

### Usuario se desloguea constantemente
**Solución**: Configura `SESSION_SECRET` en `.env`:
```
SESSION_SECRET=un-secreto-unico-y-seguro
```

---

## 📚 Referencias

- [bcrypt](https://www.npmjs.com/package/bcrypt) - Librería de hashing
- [express-session](https://www.npmjs.com/package/express-session) - Gestión de sesiones
- [SQL Server Authentication](https://learn.microsoft.com/en-us/sql/relational-databases/security/authentication-access/authentication-access)
