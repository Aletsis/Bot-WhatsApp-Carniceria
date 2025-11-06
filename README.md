# 🥩 Bot WhatsApp Carnicería

Bot automatizado de WhatsApp Business para gestión de pedidos de carnicería con dashboard web integrado, base de datos SQL Server y sistema de autenticación.

---

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Arquitectura](#-arquitectura)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Uso](#-uso)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Dashboard Web](#-dashboard-web)
- [API y Webhooks](#-api-y-webhooks)
- [Base de Datos](#-base-de-datos)
- [Gestión de Usuarios](#-gestión-de-usuarios)
- [Configuración de Impresión](#️-configuración-de-impresión)
- [Desarrollo](#-desarrollo)
- [Contribución](#-contribución)
- [Licencia](#-licencia)

---

## ✨ Características

### 🤖 Bot de WhatsApp
- **Conversaciones interactivas** con máquina de estados
- **Recepción automática de pedidos** 24/7
- **Validación de clientes** y direcciones de entrega
- **Generación automática de folios** únicos por pedido
- **Mensajes contextuales** y confirmaciones de pedido
- **Manejo de sesiones persistente** con timeouts configurables
- **Botones interactivos** para menú principal
- **Gestión de estado de pedidos** (En espera, En ruta, Entregado)
- **Impresión automática de tickets** en impresoras térmicas ESC/POS

### 📊 Dashboard Web
- **Interfaz moderna y responsive** para administración
- **Vista de pedidos en tiempo real** con filtros por estado
- **Gestión completa de clientes** (agregar, editar, desactivar)
- **Consulta de conversaciones** activas y historial
- **Gestión de usuarios** con roles (admin, editor, viewer)
- **Auditoría de accesos** al dashboard
- **Métricas y estadísticas** de pedidos
- **Autenticación segura** con bcrypt

### 🗄️ Base de Datos
- **SQL Server** como motor de base de datos
- **Inicialización automática** de esquema al arrancar
- **6 tablas principales**: Clientes, Pedidos, Conversaciones, TelefonosAtencion, Usuarios, LogAccesos
- **Índices optimizados** para consultas rápidas
- **Migraciones automáticas** de tablas faltantes
- **Datos iniciales** precargados (admin user, teléfonos)

### 🔒 Seguridad
- **Autenticación basada en sesiones** con express-session
- **Hashing de contraseñas** con bcrypt (10 rounds)
- **Control de acceso basado en roles** (RBAC)
- **Rate limiting** para prevenir abusos
- **Logs de auditoría** de todos los accesos
- **Validación de entradas** y sanitización
- **Variables de entorno** para credenciales sensibles

### 🖨️ Impresión Automática
- **Impresoras térmicas ESC/POS** compatibles (58mm/80mm)
- **Impresión automática** al confirmar pedido
- **Conexión por red (Network)** TCP/IP
- **Configuración flexible** (habilitar/deshabilitar)
- **Tickets formateados** con folio, cliente, dirección y detalle
- **Manejo robusto de errores** (no bloquea el pedido si falla impresión)

---

## 🏗️ Arquitectura

```
┌─────────────────┐         ┌──────────────────┐         ┌────────────────┐
│   WhatsApp      │         │   Dashboard      │         │   SQL Server   │
│   Business API  │◄───────►│   Web (Express)  │◄───────►│   Database     │
└─────────────────┘         └──────────────────┘         └────────────────┘
        │                            │
        │                            │
        ▼                            ▼
┌─────────────────┐         ┌──────────────────┐
│   Webhook       │         │   Session        │
│   /webhook      │         │   Management     │
└─────────────────┘         └──────────────────┘
```

### Componentes Principales

- **Express.js Server**: Backend API y servidor de archivos estáticos
- **WhatsApp Webhook**: Recibe mensajes entrantes de WhatsApp Business API
- **State Machine**: Gestiona el flujo de conversación con el cliente
- **Session Service**: Manejo de sesiones con timeout automático
- **Database Service**: Capa de abstracción para SQL Server
- **Authentication Middleware**: Protección de rutas del dashboard
- **Logger**: Sistema de logs estructurado con Pino

---

## 📦 Requisitos Previos

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **SQL Server** (2017 o superior) o **SQL Server Express**
- **Cuenta de WhatsApp Business API** con token de acceso
- **ngrok** o túnel similar para exponer webhook (desarrollo)

---

## 🚀 Instalación

### 1. Clonar el Repositorio

```bash
git clone https://github.com/Aletsis/Bot-WhatsApp-Carniceria.git
cd Bot-WhatsApp-Carniceria
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# Puerto del servidor
PORT=3000

# Configuración de SQL Server
DB_HOST=localhost
DB_USER=tu_usuario
DB_PASS=tu_contraseña
DB_NAME=WhatsAppBotDB
DB_PORT=1433

# WhatsApp Business API
WHATSAPP_API_TOKEN=tu_token_de_acceso
WHATSAPP_PHONE_NUMBER_ID=tu_phone_number_id
WHATSAPP_VERIFY_TOKEN=tu_token_de_verificacion

# Sesión (producción)
SESSION_SECRET=genera_una_clave_secreta_segura

# Timeouts (milisegundos)
SESSION_TIMEOUT=300000
CONVERSATION_TIMEOUT=1800000

# Impresión ESC/POS (opcional)
PRINTER_ENABLED=false
PRINTER_HOST=192.168.0.100
PRINTER_PORT=9100

# Ambiente
NODE_ENV=development
```

### 4. Inicializar Base de Datos

```bash
npm run init-db
```

Esto creará automáticamente:
- Base de datos `WhatsAppBotDB`
- 6 tablas con índices optimizados
- Usuario admin por defecto (`admin` / `admin123`)
- Teléfonos de atención iniciales

---

## ⚙️ Configuración

### Configurar Webhook de WhatsApp

1. Inicia el servidor: `npm start`
2. Expón tu servidor local con ngrok: `ngrok http 3000`
3. En el panel de WhatsApp Business API, configura:
   - **Callback URL**: `https://tu-url-ngrok.io/webhook`
   - **Verify Token**: El valor de `WHATSAPP_VERIFY_TOKEN` en tu `.env`
   - **Suscripciones**: Activa `messages`

### Cambiar Contraseña de Admin (Producción)

```bash
npm run manage-users
# Selecciona opción: Cambiar contraseña de usuario
```

---

## 🎯 Uso

### Iniciar el Servidor

```bash
# Desarrollo (con auto-reload)
npm run dev

# Producción
npm run prod
```

El servidor estará disponible en: `http://localhost:3000`

### Acceder al Dashboard

1. Navega a: `http://localhost:3000`
2. Credenciales por defecto:
   - **Usuario**: `admin`
   - **Contraseña**: `admin123`

### Flujo de Conversación del Bot

```
Cliente: Hola
Bot: Menú interactivo con botones

Cliente: Selecciona "🛒 Hacer pedido"
Bot: ¿Cuál es tu nombre?

Cliente: Juan Pérez
Bot: Guardado. ¿Dirección de entrega?

Cliente: Av. Principal 123
Bot: Perfecto. Escribe tu pedido...

Cliente: 1kg de bistec, 500g de chorizo
Bot: Confirmación con folio y datos completos

Cliente: Confirmar
Bot: ✅ Pedido registrado con Folio XYZ
```

---

## 📁 Estructura del Proyecto

```
Bot-WhatsApp-Carniceria/
├── app.js                      # Punto de entrada principal
├── package.json
├── .env                        # Variables de entorno (no versionado)
├── README.md
├── LICENSE
│
├── migrations/                 # Scripts SQL de migraciones
│   ├── 01_schema.sql
│   └── 02_usuarios_table.sql
│
├── scripts/                    # Scripts de utilidad
│   ├── init-db.js             # Inicialización de BD
│   ├── manage-users.js        # Gestión de usuarios CLI
│   └── generate-password.js   # Generador de hashes
│
└── src/
    ├── logger.js              # Configuración de Pino logger
    │
    ├── controllers/           # Lógica de negocio
    │   ├── authController.js  # Autenticación dashboard
    │   ├── dashboardController.js  # API del dashboard
    │   └── webhookController.js    # Webhook de WhatsApp
    │
    ├── handlers/              # Manejadores de eventos
    │   ├── stateHandlers.js   # Lógica de estados del bot
    │   └── buttonHandlers.js  # Manejo de botones interactivos
    │
    ├── helpers/
    │   └── shutdownHelper.js  # Cierre graceful de conexiones
    │
    ├── middleware/
    │   └── auth.js            # Middleware de autenticación
    │
    ├── public/                # Archivos estáticos del dashboard
    │   ├── index.html
    │   ├── css/
    │   │   └── dashboard.css
    │   └── js/
    │       └── dashboard.js
    │
    ├── routes/                # Definición de rutas
    │   ├── auth.js            # Rutas de login/logout
    │   ├── dashboard.js       # Rutas de API del dashboard
    │   └── webhook.js         # Ruta del webhook de WhatsApp
    │
    ├── services/              # Capa de servicios
    │   ├── dbService.js       # Consultas a BD
    │   ├── dbInitService.js   # Inicialización de BD
    │   ├── sessionService.js  # Gestión de sesiones de conversación
    │   ├── sessionTimeoutService.js  # Timeouts automáticos
    │   ├── userService.js     # CRUD de usuarios
    │   └── whatsappService.js # Comunicación con WhatsApp API
    │
    └── utils/
        └── validators.js      # Validadores de entrada
```

---

## 🎨 Dashboard Web

### Características del Dashboard

#### 🔐 Autenticación
- Login con usuario y contraseña
- Sesiones persistentes con express-session
- Logout manual o automático por inactividad
- Auditoría de accesos (IP, fecha/hora, resultado)

#### 📊 Vista de Pedidos
- Tabla paginada con todos los pedidos
- Filtros por estado: Todos, En espera, En ruta, Entregado
- Búsqueda por folio, cliente o contenido
- Visualización de detalles completos del pedido
- Actualización de estado de pedido
- Indicador de pedidos nuevos en tiempo real

#### 👥 Gestión de Clientes
- Listado completo de clientes registrados
- Agregar nuevos clientes manualmente
- Editar nombre y dirección
- Desactivar clientes (soft delete)
- Búsqueda por nombre o teléfono

#### 💬 Conversaciones
- Vista de conversaciones activas
- Historial de interacciones
- Estado actual de cada conversación
- Última interacción registrada

#### 👤 Gestión de Usuarios (Solo Admin)
- Crear nuevos usuarios con roles
- Listar todos los usuarios
- Cambiar contraseñas
- Activar/desactivar usuarios
- Roles disponibles: admin, editor, viewer

### Roles y Permisos

| Permiso | Admin | Editor | Viewer |
|---------|-------|--------|--------|
| Ver pedidos | ✅ | ✅ | ✅ |
| Ver clientes | ✅ | ✅ | ✅ |
| Ver conversaciones | ✅ | ✅ | ✅ |
| Actualizar estado de pedidos | ✅ | ✅ | ❌ |
| Agregar/editar clientes | ✅ | ✅ | ❌ |
| Gestionar usuarios | ✅ | ❌ | ❌ |
| Ver logs de acceso | ✅ | ❌ | ❌ |

---

## 🔌 API y Webhooks

### Webhook de WhatsApp

**Endpoint**: `POST /webhook`

Recibe mensajes entrantes de WhatsApp Business API.

```javascript
// Payload de ejemplo
{
  "object": "whatsapp_business_account",
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{
          "from": "5218123456789",
          "type": "text",
          "text": { "body": "Hola" }
        }]
      }
    }]
  }]
}
```

### Endpoints del Dashboard

#### Autenticación
- `GET /` - Página de login
- `POST /auth/login` - Autenticar usuario
- `POST /auth/logout` - Cerrar sesión

#### Pedidos
- `GET /dashboard/pedidos` - Listar pedidos (filtros: estado)
- `PUT /dashboard/pedidos/:id/estado` - Actualizar estado

#### Clientes
- `GET /dashboard/clientes` - Listar clientes
- `POST /dashboard/clientes` - Crear cliente
- `PUT /dashboard/clientes/:id` - Actualizar cliente
- `DELETE /dashboard/clientes/:id` - Desactivar cliente

#### Conversaciones
- `GET /dashboard/conversaciones` - Listar conversaciones activas

#### Usuarios (Solo Admin)
- `GET /dashboard/usuarios` - Listar usuarios
- `POST /dashboard/usuarios` - Crear usuario
- `PUT /dashboard/usuarios/:id/password` - Cambiar contraseña
- `PUT /dashboard/usuarios/:id/estado` - Activar/desactivar

---

## 🗄️ Base de Datos

### Esquema de Tablas

#### Clientes
```sql
- ClienteID (PK, IDENTITY)
- NumeroTelefono (UNIQUE)
- Nombre
- Direccion
- FechaAlta (DEFAULT: SYSDATETIME())
- Activo (BIT, DEFAULT: 1)
```

#### Pedidos
```sql
- PedidoID (PK, IDENTITY)
- ClienteID (FK -> Clientes)
- Folio (Único, formato: YYYYMMDD-0001)
- Contenido (Texto completo del pedido)
- Estado (En espera/En ruta/Entregado)
- Fecha (DEFAULT: SYSDATETIME())
- Notas
```

#### Conversaciones
```sql
- NumeroTelefono (PK)
- Estado (START/MENU/ASK_NAME/ASK_ADDRESS/TAKING_ORDER/AWAITING_CONFIRM)
- Buffer (Texto acumulado del pedido)
- NombreTemporal
- UltimaInteraccion (DEFAULT: SYSDATETIME())
```

#### TelefonosAtencion
```sql
- TelefonoID (PK, IDENTITY)
- Etiqueta (ej: Sucursal 8)
- Telefono
```

#### Usuarios
```sql
- UsuarioID (PK, IDENTITY)
- Username (UNIQUE)
- PasswordHash (bcrypt)
- Rol (admin/editor/viewer)
- Nombre
- Email
- Activo (BIT, DEFAULT: 1)
- FechaCreacion (DEFAULT: SYSDATETIME())
- UltimoAcceso
- CreadoPor
```

#### LogAccesos
```sql
- LogID (PK, IDENTITY)
- UsuarioID (FK -> Usuarios)
- FechaHora (DEFAULT: SYSDATETIME())
- IP
- Exitoso (BIT)
- Detalles
```

### Índices Optimizados

- `IX_Pedidos_ClienteID` - Consultas de pedidos por cliente
- `IX_Pedidos_Estado` - Filtros por estado
- `IX_Pedidos_Fecha` - Ordenamiento cronológico
- `IX_Conversaciones_UltimaInteraccion` - Limpieza de sesiones expiradas
- `IX_Usuarios_Username` - Login rápido
- `IX_LogAccesos_FechaHora` - Auditoría ordenada

---

## 👥 Gestión de Usuarios

### CLI de Gestión

```bash
npm run manage-users
```

**Opciones del menú interactivo:**
1. Listar usuarios
2. Crear nuevo usuario
3. Cambiar contraseña
4. Desactivar usuario
5. Activar usuario
6. Generar hash de contraseña
7. Salir

### Crear Usuario Mediante Script

```bash
node scripts/manage-users.js
# Seleccionar opción 2: Crear nuevo usuario
```

### Generar Hash de Contraseña

```bash
node scripts/generate-password.js
# Ingresar contraseña para obtener hash bcrypt
```

---

## �️ Configuración de Impresión

### Requisitos de Hardware

- **Impresora térmica** compatible con comandos ESC/POS
- Ancho de papel: **58mm o 80mm**
- Conexión: **Red Ethernet o WiFi** (TCP/IP)
- Marcas compatibles: Epson TM, Star TSP, Bixolon, Citizen, y genéricas

### Configuración en .env

```env
# Habilitar o deshabilitar impresión
PRINTER_ENABLED=true

# Dirección IP de la impresora en la red local
PRINTER_HOST=192.168.0.100

# Puerto TCP (generalmente 9100 para ESC/POS)
PRINTER_PORT=9100
```

### Encontrar la IP de la Impresora

**Opción 1: Impresión de configuración**
- La mayoría de impresoras tienen un botón para imprimir configuración de red
- Busca el valor de "IP Address"

**Opción 2: Desde el panel de administración**
- Accede al panel web de la impresora desde el navegador
- La dirección generalmente se muestra en la pantalla LCD de la impresora

**Opción 3: Buscar en la red**
```bash
# Windows (PowerShell)
arp -a

# Linux/Mac
nmap -sn 192.168.0.0/24
```

### Formato del Ticket Impreso

```
        CARNICERÍA
          PEDIDO
================================
Folio: 20251106-0001
Fecha: 06/11/2025 14:30:45

Cliente: Juan Pérez
Telefono: 5218123456789
Direccion: Av. Principal 123, Col. Centro

================================
DETALLE DEL PEDIDO:
================================
1kg de bistec
500g de chorizo
2 piezas de pollo
Observaciones: Sin grasa

================================
   Gracias por su preferencia
```

### Solución de Problemas

**La impresora no imprime:**
1. Verificar que `PRINTER_ENABLED=true` en `.env`
2. Comprobar conectividad: `ping 192.168.0.100`
3. Verificar puerto abierto: `telnet 192.168.0.100 9100`
4. Revisar logs en consola para mensajes de error
5. Confirmar que la impresora está encendida y con papel

**El ticket se imprime con caracteres extraños:**
- Verificar que la impresora soporte comandos ESC/POS
- Comprobar configuración de codificación en la impresora

**Comportamiento del Sistema:**
- ✅ **Si impresión falla**: El pedido SE REGISTRA en base de datos y el cliente recibe confirmación
- 🖨️ **Error de impresión**: Solo se registra en logs, no afecta el flujo
- 📊 **Dashboard**: Muestra todos los pedidos independientemente del estado de impresión

### Deshabilitar Impresión

Para operar sin impresora (solo registro en BD y dashboard):

```env
PRINTER_ENABLED=false
```

---

## �🛠️ Desarrollo

### Scripts Disponibles

```bash
# Iniciar en modo desarrollo (auto-reload)
npm run dev

# Iniciar en modo producción
npm run prod

# Inicializar base de datos
npm run init-db

# Gestionar usuarios (CLI)
npm run manage-users

# Linting con ESLint
npm run lint

# Formateo con Prettier
npm run format
```

### Configuración de ESLint

El proyecto usa **ESLint 9** con configuración plana (`eslint.config.js`):

```javascript
export default [
  {
    files: ['**/*.js'],
    rules: {
      'semi': ['error', 'always'],
      'quotes': ['error', 'single']
    }
  }
];
```

### Logs

El proyecto usa **Pino** para logging estructurado:

```javascript
logger.info('Mensaje informativo');
logger.warn('Advertencia');
logger.error('Error crítico', error);
logger.debug('Información de depuración');
```

En desarrollo, los logs se muestran con formato legible gracias a `pino-pretty`.

---

## 🤝 Contribución

Las contribuciones son bienvenidas! Por favor sigue estos pasos:

1. **Fork** el proyecto
2. Crea una **rama** para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. **Commit** tus cambios (`git commit -m 'feat: agregar nueva funcionalidad'`)
4. **Push** a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un **Pull Request**

### Convenciones de Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` Nueva funcionalidad
- `fix:` Corrección de bug
- `docs:` Cambios en documentación
- `refactor:` Refactorización de código
- `test:` Agregar o modificar tests
- `chore:` Tareas de mantenimiento

---

## 📄 Licencia

Este proyecto está bajo la licencia **MIT**. Consulta el archivo [LICENSE](LICENSE) para más detalles.

---

## 📞 Soporte

Para reportar bugs o solicitar nuevas funcionalidades, por favor abre un [issue en GitHub](https://github.com/Aletsis/Bot-WhatsApp-Carniceria/issues).

---

## 🙏 Agradecimientos

- **WhatsApp Business API** por la plataforma de mensajería
- **Microsoft SQL Server** como motor de base de datos confiable
- Comunidad de **Node.js** y **Express.js**

---

<div align="center">
  <strong>Hecho con ❤️ para optimizar la gestión de pedidos de carnicería</strong>
</div>