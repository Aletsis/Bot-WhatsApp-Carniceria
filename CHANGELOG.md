# 📝 Changelog

Todos los cambios notables del proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

---

## [2.0.0] - 2024-11-06

### 🎉 Added - Dashboard React Completo

- **Frontend React moderno** con Vite 7 y React 19
- **Tailwind CSS v4** para diseño responsive y profesional
- **React Router v6** para navegación con rutas protegidas
- **Context API** para gestión de estado global de autenticación
- **Página de Pedidos** con filtros, modal de detalles y actualización de estado
- **Página de Clientes** con CRUD completo, estadísticas y búsqueda
- **Página de Conversaciones** para ver chats activos
- **Página de Usuarios** con gestión completa (solo admin)
- **Componentes reutilizables**: Button, Input, Select, Card, Badge, Modal, Loading
- **Layout components**: Navbar, Sidebar, DashboardLayout
- **Sistema de autenticación** con login/logout y verificación de sesión
- **Hot Module Replacement (HMR)** para desarrollo rápido
- **Scripts npm** para desarrollo simultáneo backend + frontend
- **Documentación completa** de API, desarrollo, impresión

### 🔧 Changed

- Refactorizado `userService` de `export default` a `named exports`
- Actualizado endpoints de API con prefijo `/api` para React
- Mejorado manejo de rate limiting (deshabilitado para localhost en desarrollo)
- Normalizado nombres de campos en queries SQL
- Separado rutas legacy (`/auth`, `/dashboard`) de rutas API (`/api/auth`, `/api/dashboard`)

### 🐛 Fixed

- Corregido problema de contexto `this` en `userService.authenticateUser()`
- Corregido interceptor Axios que causaba loop infinito en `/check-auth`
- Corregido estructura de respuesta en servicios del frontend
- Agregado validación para campos `null` en componentes React
- Corregido rate limiting excesivo en desarrollo

### 📚 Documentation

- Agregado `docs/API.md` - Documentación completa de endpoints
- Agregado `docs/DEVELOPMENT.md` - Guía de desarrollo
- Agregado `docs/PRINTING.md` - Sistema de impresión ESC/POS
- Actualizado `README.md` con información de React
- Actualizado `client/README.md` con documentación del frontend
- Agregado `CHANGELOG.md` para seguimiento de cambios

---

## [1.2.0] - 2024-11-05

### 🎉 Added

- **Sistema de impresión automática** de tickets ESC/POS
- `printingService.js` con soporte para impresoras térmicas de red
- Configuración de impresora en variables de entorno
- Impresión automática al confirmar pedido
- Manejo robusto de errores de impresión (fail-safe)

### 🔧 Changed

- Integrado `printTicket()` en flujo de confirmación de pedidos
- Actualizado `.env.example` con variables de impresora

### 📚 Documentation

- Agregado sección de impresión en README
- Documentado configuración de impresoras ESC/POS

---

## [1.1.0] - 2024-11-04

### 🎉 Added

- **Sistema de autenticación** con base de datos
- Tabla `Usuarios` con roles (admin, editor, viewer)
- Tabla `LogAccesos` para auditoría
- `userService.js` con funciones de gestión de usuarios
- Middleware de autenticación y autorización por roles
- Dashboard con control de acceso basado en roles
- Scripts de gestión de usuarios (`manage-users.js`)
- Generador de contraseñas hasheadas (`generate-password.js`)

### 🔧 Changed

- Migrado autenticación de hardcoded a base de datos
- Mejorado `dbInitService` para auto-crear tablas faltantes
- Actualizado dashboard con permisos por rol

### 🗑️ Removed

- Tabla `DetallePedidos` (simplificado a campo `Contenido` en `Pedidos`)
- Credenciales hardcoded del código

### 📚 Documentation

- Agregado `docs/MIGRATION_AUTH.md` - Guía de migración de autenticación
- Agregado `docs/ERROR_HANDLING.md` - Sistema de manejo de errores
- Actualizado README con sistema de usuarios

---

## [1.0.0] - 2024-11-03

### 🎉 Added - Lanzamiento Inicial

- **Bot de WhatsApp** completamente funcional
- **Máquina de estados** para conversaciones
- **Dashboard web** con autenticación básica
- **Base de datos SQL Server** con auto-inicialización
- Tablas: `Clientes`, `Pedidos`, `Conversaciones`, `TelefonosAtencion`
- **Gestión de pedidos** con folios únicos (formato: YYYYMMDD-0001)
- **Gestión de clientes** con números de teléfono
- **Estados de pedidos**: En espera de surtir, En ruta, Entregado
- **Timeouts de sesión** configurables
- **Logging estructurado** con Pino
- **Rate limiting** para protección de APIs
- **Webhook de WhatsApp** para mensajes entrantes
- **Botones interactivos** en WhatsApp
- **Validación de datos** de entrada
- **Manejo graceful de shutdown**
- Scripts de inicialización de BD

### 🛠️ Technical Stack

- **Backend**: Node.js 18+ con Express.js
- **Base de Datos**: SQL Server 2017+
- **Logging**: Pino
- **Sesiones**: express-session
- **Autenticación**: bcrypt
- **Rate Limiting**: express-rate-limit
- **WhatsApp**: WhatsApp Business API

### 📚 Documentation

- README completo con instrucciones de instalación
- Documentación de arquitectura
- Guía de configuración de variables de entorno
- Estructura del proyecto
- Licencia MIT

---

## Tipos de Cambios

- `Added` - Para nuevas funcionalidades
- `Changed` - Para cambios en funcionalidades existentes
- `Deprecated` - Para funcionalidades que serán removidas
- `Removed` - Para funcionalidades removidas
- `Fixed` - Para correcciones de bugs
- `Security` - Para correcciones de vulnerabilidades

---

## Versionado

El proyecto usa [Semantic Versioning](https://semver.org/lang/es/):

- **MAJOR** (X.0.0): Cambios incompatibles con versiones anteriores
- **MINOR** (0.X.0): Nuevas funcionalidades compatibles
- **PATCH** (0.0.X): Correcciones de bugs compatibles
