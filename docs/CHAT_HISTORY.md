# 💬 Sistema de Historial de Chats

Documentación completa del sistema de historial de conversaciones con persistencia y comunicación bidireccional.

---

## 📋 Tabla de Contenidos

- [Descripción General](#-descripción-general)
- [Arquitectura](#-arquitectura)
- [Base de Datos](#-base-de-datos)
- [Backend](#-backend)
- [Frontend](#-frontend)
- [Funcionalidades](#-funcionalidades)
- [API Endpoints](#-api-endpoints)
- [Scripts de Testing](#-scripts-de-testing)
- [Uso](#-uso)

---

## 📝 Descripción General

El sistema de historial de chats permite:

- **Persistencia total** de todos los mensajes (enviados y recibidos)
- **Visualización estilo WhatsApp Web** con burbujas diferenciadas
- **Búsqueda avanzada** multi-campo (nombre, teléfono, contenido)
- **Envío de mensajes** directos a clientes desde dashboard
- **Comunicación bidireccional** entre operadores y clientes
- **Metadata completa** de mensajes de WhatsApp
- **Estados de lectura** con badges visuales
- **Auto-actualización** después de enviar mensajes

---

## 🏗️ Arquitectura

```
┌─────────────────┐         ┌──────────────────┐         ┌────────────────┐
│   WhatsApp      │         │   Dashboard      │         │   SQL Server   │
│   Business API  │◄───────►│   (React)        │◄───────►│   Mensajes     │
└─────────────────┘         └──────────────────┘         └────────────────┘
        │                            │
        │                            │
        ▼                            ▼
┌─────────────────┐         ┌──────────────────┐
│   Webhook       │────────►│   Message        │
│   Controller    │         │   Service        │
└─────────────────┘         └──────────────────┘
```

### Flujo de Mensajes

#### Mensajes Entrantes (Cliente → Sistema):
1. WhatsApp Business API envía webhook
2. `webhookController.js` recibe mensaje
3. `messageService.saveMessage()` guarda en BD con metadata
4. Estado inicial: `recibido`, Leido: `false`

#### Mensajes Salientes (Sistema → Cliente):
1. Operador escribe mensaje en dashboard
2. `ChatsPage.jsx` llama a `POST /dashboard/chats/:telefono/send`
3. `dashboardController.sendMessageToClient()` valida y envía
4. `whatsappService.sendText()` envía por API
5. `messageService.saveMessage()` guarda automáticamente
6. Estado: `enviado`, tipo: `text`

---

## 🗄️ Base de Datos

### Tabla `Mensajes`

```sql
CREATE TABLE Mensajes (
    MensajeID INT PRIMARY KEY IDENTITY(1,1),
    NumeroTelefono VARCHAR(20) NOT NULL,
    Tipo VARCHAR(10) NOT NULL,           -- 'enviado' o 'recibido'
    Contenido NVARCHAR(MAX) NOT NULL,
    TipoMensaje VARCHAR(20) DEFAULT 'text', -- 'text', 'image', 'button', etc.
    MetadataWhatsApp NVARCHAR(MAX),      -- JSON con datos de WhatsApp
    Estado VARCHAR(20) DEFAULT 'enviado', -- 'enviado', 'entregado', 'leido', 'fallido'
    Leido BIT DEFAULT 0,                 -- Para mensajes recibidos
    Fecha DATETIME DEFAULT GETDATE(),
    
    INDEX IX_Mensajes_Telefono_Fecha (NumeroTelefono, Fecha DESC),
    INDEX IX_Mensajes_Fecha (Fecha DESC),
    INDEX IX_Mensajes_Leido (Leido, NumeroTelefono)
);
```

### Campos Metadata

El campo `MetadataWhatsApp` almacena JSON con:

```json
{
  "messageId": "wamid.xxx",           // ID de WhatsApp
  "from": "5218123456789",            // Remitente
  "timestamp": 1699282800,            // Unix timestamp
  "buttons": [                        // Si es mensaje con botones
    {"id": "btn_1", "title": "Opción 1"},
    {"id": "btn_2", "title": "Opción 2"}
  ],
  "buttonId": "btn_1",                // Si es respuesta a botón
  "buttonText": "Opción 1"            // Texto del botón pulsado
}
```

---

## ⚙️ Backend

### Servicio: `messageService.js`

Funciones principales:

#### `saveMessage(telefono, tipo, contenido, metadata = {})`
Guarda un mensaje en la base de datos.

**Parámetros:**
- `telefono`: Número del cliente
- `tipo`: `'enviado'` o `'recibido'`
- `contenido`: Texto del mensaje
- `metadata`: Objeto con metadata de WhatsApp (opcional)

**Retorna:** `{ success, messageId }`

#### `getMessageHistory(telefono, limit = 100, offset = 0)`
Obtiene historial de mensajes con un cliente.

**Retorna:** Array de mensajes ordenados del más antiguo al más reciente

#### `getConversations(limit = 50, offset = 0)`
Lista conversaciones con último mensaje y contador de no leídos.

**Retorna:** Array con:
```javascript
{
  NumeroTelefono,
  NombreCliente,
  UltimoMensaje,
  UltimaFecha,
  TipoUltimoMensaje,
  MensajesNoLeidos
}
```

#### `searchMessages(query, limit = 50)`
Busca en contenido de mensajes, nombre de cliente y teléfono.

**SQL:**
```sql
WHERE contenido LIKE @query 
   OR telefono LIKE @query 
   OR nombre LIKE @query
```

#### `searchConversations(query, limit = 50)`
Filtra conversaciones por nombre o teléfono.

**Usa CTE** para optimizar la búsqueda con DISTINCT.

#### `markMessagesAsRead(telefono)`
Marca todos los mensajes de una conversación como leídos.

**SQL:**
```sql
UPDATE Mensajes 
SET Leido = 1 
WHERE NumeroTelefono = @telefono 
  AND Tipo = 'recibido' 
  AND Leido = 0
```

---

### Controlador: `dashboardController.js`

#### `sendMessageToClient(req, res)`
Endpoint para enviar mensajes desde dashboard.

**Validaciones:**
- Teléfono no vacío
- Mensaje no vacío (después de trim)

**Flujo:**
1. Valida parámetros
2. Envía mensaje via `whatsappService.sendText()`
3. Auto-guarda mediante hook del servicio
4. Registra acción en logs con username
5. Retorna success con metadata

**Response:**
```json
{
  "success": true,
  "message": "Mensaje enviado exitosamente",
  "telefono": "5218123456789",
  "sentBy": "admin"
}
```

---

## 🎨 Frontend

### Componente: `ChatsPage.jsx`

Estado del componente:

```javascript
const [conversations, setConversations] = useState([]);
const [selectedPhone, setSelectedPhone] = useState(null);
const [messages, setMessages] = useState([]);
const [loading, setLoading] = useState(false);
const [searchTerm, setSearchTerm] = useState('');
const [searchMode, setSearchMode] = useState('conversations');
const [newMessage, setNewMessage] = useState('');
const [sending, setSending] = useState(false);
```

### Funciones Principales

#### `loadConversations()`
Carga lista de conversaciones al montar componente.

#### `loadMessages(telefono)`
Carga historial completo de un cliente y marca como leídos.

#### `handleSearch(e)`
Búsqueda dual-mode:
- **Mode: conversations** → Filtra por nombre/teléfono
- **Mode: messages** → Busca en contenido de mensajes

#### `sendMessage(e)`
Envía mensaje al cliente:
1. Valida que no esté vacío
2. POST a `/dashboard/chats/:telefono/send`
3. Limpia input
4. Recarga mensajes
5. Auto-scroll al final
6. Manejo de errores con alert

#### `renderMessageContent(msg)`
Renderiza contenido con formato especial para botones:

- **Mensajes con botones**: Lista de botones como `[Botones: Opción1, Opción2]`
- **Respuestas de botón**: Icono 🔘 + texto del botón seleccionado
- **Mensajes normales**: Texto plano

---

## ✨ Funcionalidades

### 1. Visualización de Conversaciones

**Lista lateral izquierda:**
- Avatar con inicial del nombre
- Nombre del cliente o número
- Preview del último mensaje (truncado)
- Timestamp (Hoy/Ayer/Fecha)
- Badge con número de mensajes no leídos
- Check mark (✓) para mensajes enviados

**CSS:** Estilo similar a WhatsApp Web con:
- Background #f0f2f5
- Hover effects
- Estado activo resaltado

### 2. Historial de Mensajes

**Burbujas diferenciadas:**
- **Mensajes enviados**: Alineados a la derecha, color verde (#d9fdd3)
- **Mensajes recibidos**: Alineados a la izquierda, color blanco
- **Timestamp**: Debajo de cada mensaje
- **Check marks**: ✓✓ en mensajes enviados

**Scroll automático:**
- Al cargar conversación
- Después de enviar mensaje
- Usa `useRef` y `scrollIntoView()`

### 3. Búsqueda Avanzada

**Toggle de modos:**
```jsx
<div className="search-mode-toggle">
  <button className={searchMode === 'conversations' ? 'active' : ''}>
    Contactos
  </button>
  <button className={searchMode === 'messages' ? 'active' : ''}>
    Mensajes
  </button>
</div>
```

**Búsqueda multi-campo:**
- En conversaciones: Nombre o teléfono
- En mensajes: Contenido, nombre o teléfono
- Resultados en tiempo real
- Botón "Limpiar" para volver a vista normal

### 4. Visualización de Botones Interactivos

**Mensajes con botones (enviados):**
```jsx
<div className="message-with-buttons">
  <div>{mensajePrincipal}</div>
  <div className="button-list">
    [Botones: {botones.map(b => b.title).join(', ')}]
  </div>
</div>
```

**Respuestas de botón (recibidas):**
```jsx
<div className="button-response">
  <span className="button-icon">🔘</span>
  <span className="button-text">{contenido}</span>
</div>
```

**CSS especial:**
- Botones en gris claro (#f5f5f5)
- Borde con border-radius
- Padding y margin controlados
- Respuestas con icono destacado

### 5. Envío de Mensajes

**UI de composición:**
```jsx
<div className="message-input-container">
  <form onSubmit={sendMessage}>
    <textarea
      value={newMessage}
      onChange={(e) => setNewMessage(e.target.value)}
      placeholder="Escribe un mensaje..."
      rows="3"
      disabled={sending}
    />
    <button type="submit" disabled={!newMessage.trim() || sending}>
      {sending ? '⏳ Enviando...' : '✉️ Enviar'}
    </button>
  </form>
</div>
```

**Características:**
- Textarea redimensionable (min: 42px, max: 120px)
- Atajo: **Ctrl+Enter** para enviar
- Botón deshabilitado si mensaje vacío
- Estado visual durante envío
- Limpieza automática después de enviar
- z-index correcto para interactividad

### 6. Estados de Carga

**Loading states:**
- Al cargar conversaciones
- Al cargar mensajes
- Al enviar mensaje
- Indicadores visuales en UI

---

## 🔌 API Endpoints

### GET `/api/dashboard/chats`
Lista de conversaciones.

**Query params:** `limit`, `offset`

### GET `/api/dashboard/chats/:telefono`
Historial de mensajes.

**Query params:** `limit`, `offset`

### POST `/api/dashboard/chats/:telefono/send`
Enviar mensaje al cliente.

**Body:** `{ mensaje: string }`

### POST `/api/dashboard/chats/:telefono/mark-read`
Marcar mensajes como leídos.

### GET `/api/dashboard/chats/search`
Buscar en mensajes.

**Query params:** `q`, `limit`

### GET `/api/dashboard/chats/search-conversations`
Buscar en conversaciones.

**Query params:** `q`, `limit`

**Ver documentación completa en:** [`docs/API.md`](./API.md)

---

## 🧪 Scripts de Testing

### `test-messages.js`
Prueba guardado de mensajes con diferentes tipos.

```bash
node scripts/test-messages.js
```

### `test-button-messages.js`
Prueba visualización de botones interactivos.

```bash
node scripts/test-button-messages.js
```

### `test-search.js`
Prueba búsqueda en conversaciones y mensajes.

```bash
node scripts/test-search.js
```

### `test-send-message.js`
Prueba envío de mensajes desde dashboard.

```bash
node scripts/test-send-message.js
```

**Nota:** Requiere autenticación. Configura username/password en el script.

---

## 📖 Uso

### Para Operadores

1. **Acceder al Historial:**
   - Navegar a "Historial de Chats" en el menú
   - Ver lista de conversaciones en panel izquierdo

2. **Ver Conversación:**
   - Clic en una conversación
   - Se cargan todos los mensajes
   - Scroll automático al último mensaje

3. **Buscar Conversaciones:**
   - Modo "Contactos": Por nombre o teléfono
   - Modo "Mensajes": Por contenido
   - Toggle entre modos según necesidad

4. **Enviar Mensajes:**
   - Seleccionar conversación
   - Escribir en campo de texto inferior
   - Clic en "Enviar" o **Ctrl+Enter**
   - Mensaje se envía y guarda automáticamente

5. **Ver Botones Interactivos:**
   - Mensajes con botones muestran lista de opciones
   - Respuestas de botón con icono 🔘

### Para Desarrolladores

#### Guardar mensaje manualmente:

```javascript
import * as messageService from './services/messageService.js';

await messageService.saveMessage(
  '5218123456789',
  'enviado',
  'Hola, ¿en qué puedo ayudarte?',
  {
    messageId: 'wamid.xxx',
    timestamp: Date.now()
  }
);
```

#### Obtener historial:

```javascript
const messages = await messageService.getMessageHistory('5218123456789');
console.log(`Se encontraron ${messages.length} mensajes`);
```

#### Buscar mensajes:

```javascript
const results = await messageService.searchMessages('pedido');
console.log(`${results.length} mensajes contienen "pedido"`);
```

---

## 🎯 Características Técnicas

### Performance
- **Índices optimizados** en BD para consultas rápidas
- **Paginación** con limit/offset
- **Lazy loading** de mensajes antiguos
- **Debouncing** en búsqueda (opcional)

### Seguridad
- **Validación** de inputs en backend
- **Sanitización** de contenido
- **Control de acceso** por roles
- **Rate limiting** en endpoints

### UX/UI
- **Responsive design** con Tailwind CSS
- **Loading states** en todas las operaciones
- **Error handling** con mensajes claros
- **Auto-scroll** inteligente
- **Keyboard shortcuts** (Ctrl+Enter)

### Escalabilidad
- **CTE queries** para optimización
- **Connection pooling** en BD
- **Async/await** en todas las operaciones
- **Manejo de errores** robusto

---

## 🚀 Mejoras Futuras

- [ ] Envío de imágenes y archivos
- [ ] Mensajes programados
- [ ] Plantillas de mensajes rápidos
- [ ] Búsqueda con filtros avanzados (fecha, tipo)
- [ ] Exportar conversaciones a PDF
- [ ] Notificaciones en tiempo real con WebSockets
- [ ] Indicador de "escribiendo..."
- [ ] Respuestas rápidas con atajos
- [ ] Archivar conversaciones
- [ ] Etiquetas y categorías

---

## 📚 Referencias

- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp)
- [Express.js Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
- [React Hooks Guide](https://react.dev/reference/react)
- [SQL Server Performance Tuning](https://learn.microsoft.com/en-us/sql/relational-databases/performance/)

---

**Última actualización:** 06/11/2025
**Versión:** 1.0.0
**Autor:** Aletsis
