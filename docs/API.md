# 📡 API Documentation

Documentación completa de los endpoints de la API del Bot WhatsApp Carnicería.

---

## 🔐 Autenticación

Todas las rutas del dashboard requieren autenticación mediante sesiones. Las sesiones se mantienen mediante cookies `httpOnly`.

### POST `/api/auth/login`

Autentica un usuario y crea una sesión.

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Login exitoso",
  "user": {
    "UsuarioID": 1,
    "Username": "admin",
    "Rol": "admin",
    "Nombre": "Administrador",
    "Email": "admin@carniceria.com"
  }
}
```

**Response Error (401):**
```json
{
  "success": false,
  "message": "Credenciales inválidas"
}
```

---

### POST `/api/auth/logout`

Cierra la sesión del usuario actual.

**Response (200):**
```json
{
  "success": true,
  "message": "Sesión cerrada"
}
```

---

### GET `/api/check-auth`

Verifica si hay una sesión activa. **No requiere autenticación**.

**Response Success (200):**
```json
{
  "user": {
    "UsuarioID": 1,
    "Username": "admin",
    "Rol": "admin"
  }
}
```

**Response Error (401):**
```json
{
  "error": "No autenticado"
}
```

---

## 📦 Pedidos

### GET `/api/pedidos`

Obtiene la lista de pedidos. Opcionalmente puede filtrar por estado.

**Query Parameters:**
- `estado` (opcional): Filtrar por estado ("En espera de surtir", "En ruta", "Entregado")
- `limit` (opcional): Número máximo de pedidos (default: 20)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "PedidoID": 1,
      "Folio": "20241106-0001",
      "Estado": "En espera de surtir",
      "Fecha": "2024-11-06T10:30:00",
      "Contenido": "1kg de bistec, 500g de chorizo",
      "Notas": null,
      "NombreCliente": "Juan Pérez",
      "NumeroTelefono": "5218123456789",
      "DireccionCliente": "Av. Principal 123"
    }
  ]
}
```

---

### PUT `/api/pedidos/:id/estado`

Actualiza el estado de un pedido. **Requiere rol: editor o admin**

**URL Parameters:**
- `id`: ID del pedido

**Request Body:**
```json
{
  "nuevoEstado": "En ruta"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Estado actualizado correctamente"
}
```

---

## 👥 Clientes

### GET `/api/clientes`

Obtiene la lista de todos los clientes activos.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "ClienteID": 1,
      "NumeroTelefono": "5218123456789",
      "Nombre": "Juan Pérez",
      "Direccion": "Av. Principal 123",
      "FechaAlta": "2024-11-01T00:00:00",
      "Activo": true
    }
  ]
}
```

---

### POST `/api/clientes`

Crea un nuevo cliente. **Requiere rol: editor o admin**

**Request Body:**
```json
{
  "NumeroTelefono": "5218123456789",
  "Nombre": "Juan Pérez",
  "Direccion": "Av. Principal 123"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Cliente creado exitosamente",
  "clienteId": 1
}
```

---

### PUT `/api/clientes/:id`

Actualiza los datos de un cliente. **Requiere rol: editor o admin**

**URL Parameters:**
- `id`: ID del cliente

**Request Body:**
```json
{
  "Nombre": "Juan Pérez García",
  "Direccion": "Av. Principal 456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Cliente actualizado exitosamente"
}
```

---

### DELETE `/api/clientes/:id`

Desactiva un cliente (soft delete). **Requiere rol: editor o admin**

**URL Parameters:**
- `id`: ID del cliente

**Response (200):**
```json
{
  "success": true,
  "message": "Cliente desactivado exitosamente"
}
```

---

## 💬 Conversaciones

### GET `/api/conversaciones`

Obtiene la lista de conversaciones activas.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "NumeroTelefono": "5218123456789",
      "Estado": "TAKING_ORDER",
      "Buffer": "1kg de bistec",
      "NombreTemporal": "Juan Pérez",
      "UltimaInteraccion": "2024-11-06T10:30:00"
    }
  ]
}
```

---

## � Historial de Chats

Endpoints para gestionar el historial completo de mensajes y conversaciones.

### GET `/api/dashboard/chats`

Obtiene la lista de conversaciones con su último mensaje.

**Query Parameters:**
- `limit` (opcional): Número máximo de conversaciones (default: 50)
- `offset` (opcional): Desplazamiento para paginación (default: 0)

**Response (200):**
```json
{
  "success": true,
  "conversations": [
    {
      "NumeroTelefono": "5218123456789",
      "NombreCliente": "Juan Pérez",
      "UltimoMensaje": "Hola, quiero hacer un pedido",
      "UltimaFecha": "2024-11-06T10:30:00",
      "TipoUltimoMensaje": "recibido",
      "MensajesNoLeidos": 2
    }
  ]
}
```

---

### GET `/api/dashboard/chats/:telefono`

Obtiene el historial completo de mensajes con un cliente específico.

**Path Parameters:**
- `telefono`: Número de teléfono del cliente

**Query Parameters:**
- `limit` (opcional): Número máximo de mensajes (default: 100)
- `offset` (opcional): Desplazamiento para paginación (default: 0)

**Response (200):**
```json
{
  "success": true,
  "messages": [
    {
      "MensajeID": 123,
      "NumeroTelefono": "5218123456789",
      "Tipo": "recibido",
      "Contenido": "Hola, quiero hacer un pedido",
      "Fecha": "2024-11-06T10:30:00",
      "Leido": true,
      "MetadataWhatsApp": {
        "messageId": "wamid.xxx",
        "from": "5218123456789"
      }
    }
  ]
}
```

---

### GET `/api/dashboard/chats/search`

Busca mensajes por contenido, nombre de cliente o número de teléfono.

**Query Parameters:**
- `q`: Término de búsqueda
- `limit` (opcional): Número máximo de resultados (default: 50)

**Response (200):**
```json
{
  "success": true,
  "results": [
    {
      "MensajeID": 123,
      "NumeroTelefono": "5218123456789",
      "NombreCliente": "Juan Pérez",
      "Tipo": "recibido",
      "Contenido": "Hola, quiero hacer un pedido",
      "Fecha": "2024-11-06T10:30:00"
    }
  ]
}
```

---

### GET `/api/dashboard/chats/search-conversations`

Filtra conversaciones por nombre de cliente o número de teléfono.

**Query Parameters:**
- `q`: Término de búsqueda
- `limit` (opcional): Número máximo de resultados (default: 50)

**Response (200):**
```json
{
  "success": true,
  "conversations": [
    {
      "NumeroTelefono": "5218123456789",
      "NombreCliente": "Juan Pérez",
      "UltimoMensaje": "Gracias por su pedido",
      "UltimaFecha": "2024-11-06T10:30:00",
      "TipoUltimoMensaje": "enviado",
      "MensajesNoLeidos": 0
    }
  ]
}
```

---

### POST `/api/dashboard/chats/:telefono/send`

Envía un mensaje de texto al cliente desde el dashboard.

**Path Parameters:**
- `telefono`: Número de teléfono del cliente

**Request Body:**
```json
{
  "mensaje": "Hola, su pedido está en camino"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Mensaje enviado exitosamente",
  "telefono": "5218123456789",
  "sentBy": "admin"
}
```

**Response Error (400):**
```json
{
  "success": false,
  "error": "Mensaje no puede estar vacío"
}
```

---

### POST `/api/dashboard/chats/:telefono/mark-read`

Marca todos los mensajes de una conversación como leídos.

**Path Parameters:**
- `telefono`: Número de teléfono del cliente

**Response (200):**
```json
{
  "success": true,
  "message": "Mensajes marcados como leídos"
}
```

---

## �👤 Usuarios

Todos los endpoints de usuarios **requieren rol: admin**

### GET `/api/usuarios`

Obtiene la lista de todos los usuarios.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "UsuarioID": 1,
      "Username": "admin",
      "Rol": "admin",
      "Nombre": "Administrador",
      "Email": "admin@carniceria.com",
      "Activo": true,
      "FechaCreacion": "2024-01-01T00:00:00",
      "UltimoAcceso": "2024-11-06T10:30:00"
    }
  ]
}
```

---

### POST `/api/usuarios`

Crea un nuevo usuario.

**Request Body:**
```json
{
  "username": "editor1",
  "password": "password123",
  "rol": "editor",
  "nombre": "Editor Uno",
  "email": "editor@carniceria.com"
}
```

**Roles válidos:** `admin`, `editor`, `viewer`

**Response (201):**
```json
{
  "success": true,
  "message": "Usuario creado exitosamente",
  "usuarioId": 2
}
```

---

### POST `/api/usuarios/:id/cambiar-password`

Cambia la contraseña de un usuario.

**URL Parameters:**
- `id`: ID del usuario

**Request Body:**
```json
{
  "password": "nueva_password_123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Contraseña actualizada exitosamente"
}
```

---

### PUT `/api/usuarios/:id/toggle`

Activa o desactiva un usuario.

**URL Parameters:**
- `id`: ID del usuario

**Response (200):**
```json
{
  "success": true,
  "message": "Usuario actualizado exitosamente"
}
```

---

## 📨 Webhook de WhatsApp

### POST `/webhook`

Recibe mensajes entrantes de WhatsApp Business API.

**Request Body (ejemplo):**
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "15550000000",
              "phone_number_id": "PHONE_NUMBER_ID"
            },
            "messages": [
              {
                "from": "5218123456789",
                "id": "wamid.XXX",
                "timestamp": "1699000000",
                "type": "text",
                "text": {
                  "body": "Hola"
                }
              }
            ]
          }
        }
      ]
    }
  ]
}
```

**Response (200):**
```json
{
  "status": "received"
}
```

---

### GET `/webhook`

Verifica el webhook de WhatsApp.

**Query Parameters:**
- `hub.mode`: Debe ser "subscribe"
- `hub.verify_token`: Token de verificación configurado en `.env`
- `hub.challenge`: Desafío a responder

**Response (200):**
El valor de `hub.challenge` como texto plano.

---

## 🔒 Códigos de Error

| Código | Descripción |
|--------|-------------|
| 200 | OK - Solicitud exitosa |
| 201 | Created - Recurso creado exitosamente |
| 400 | Bad Request - Datos inválidos |
| 401 | Unauthorized - No autenticado |
| 403 | Forbidden - Sin permisos suficientes |
| 404 | Not Found - Recurso no encontrado |
| 429 | Too Many Requests - Rate limit excedido |
| 500 | Internal Server Error - Error del servidor |

---

## 🎯 Rate Limiting

- **Global**: 1000 requests / 15 minutos (desarrollo), 100 requests / 15 minutos (producción)
- **Webhook**: 30 requests / 1 minuto
- **Desarrollo**: Rate limiting deshabilitado para localhost (::1, 127.0.0.1)

---

## 🔑 Roles y Permisos

| Endpoint | Admin | Editor | Viewer |
|----------|-------|--------|--------|
| GET /api/pedidos | ✅ | ✅ | ✅ |
| PUT /api/pedidos/:id/estado | ✅ | ✅ | ❌ |
| GET /api/clientes | ✅ | ✅ | ✅ |
| POST /api/clientes | ✅ | ✅ | ❌ |
| PUT /api/clientes/:id | ✅ | ✅ | ❌ |
| DELETE /api/clientes/:id | ✅ | ✅ | ❌ |
| GET /api/conversaciones | ✅ | ✅ | ✅ |
| GET /api/dashboard/chats | ✅ | ✅ | ✅ |
| GET /api/dashboard/chats/:telefono | ✅ | ✅ | ✅ |
| GET /api/dashboard/chats/search | ✅ | ✅ | ✅ |
| GET /api/dashboard/chats/search-conversations | ✅ | ✅ | ✅ |
| POST /api/dashboard/chats/:telefono/send | ✅ | ✅ | ❌ |
| POST /api/dashboard/chats/:telefono/mark-read | ✅ | ✅ | ✅ |
| GET /api/usuarios | ✅ | ❌ | ❌ |
| POST /api/usuarios | ✅ | ❌ | ❌ |
| POST /api/usuarios/:id/cambiar-password | ✅ | ❌ | ❌ |
| PUT /api/usuarios/:id/toggle | ✅ | ❌ | ❌ |
