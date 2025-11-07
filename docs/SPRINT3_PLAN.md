# Sprint 3 - Plan de Acción
## Dashboard Avanzado, Seguridad y Funcionalidades Críticas

---

## 🎯 Objetivos del Sprint

Mejorar la seguridad del sistema, agregar funcionalidades críticas de gestión, implementar notificaciones automáticas y optimizar el dashboard con visualización avanzada.

---

## 📋 Tareas Propuestas

### 🔴 Tarea 1: Concurrencia y Transacciones (CRÍTICA - Alta Prioridad) ✅ COMPLETADA
**Problema:** Si dos mensajes llegan simultáneamente, pueden sobrescribirse los cambios en BD.

**Objetivo:** Garantizar operaciones atómicas y prevenir race conditions

**Subtareas:**
- [x] Implementar transacciones SQL en operaciones críticas
- [x] Agregar locking optimista con columna `Version` en tablas críticas
- [x] Wrapper de transacciones para `updateSession()` y `createPedido()`
- [x] Pruebas de concurrencia con múltiples requests simultáneos
- [x] Manejo de deadlocks y retry automático

**Archivos Afectados:**
- ✅ `migrations/09_version_control.sql` - Columnas Version agregadas
- ✅ `src/services/transactionService.js` - Nuevo servicio con optimistic locking
- ✅ `src/services/sessionService.js` - updateSession() refactorizado con retry
- ✅ `src/controllers/dashboardController.js` - Funciones de pedidos actualizadas
- ✅ `scripts/test-concurrency.js` - Suite de tests (4/4 pasados)
- ✅ `docs/CONCURRENCY_CONTROL.md` - Documentación completa

**Resultado:** 🎉 Sistema completamente protegido contra race conditions con optimistic locking

**Estimación:** ~~2-3 horas~~ → **Tiempo real: 2.5 horas**

---

### 🔴 Tarea 2: Verificación de Firma de Webhook de Meta (CRÍTICA - Seguridad) ✅ COMPLETADA
**Objetivo:** Validar que los webhooks provengan realmente de Meta/WhatsApp

**Subtareas:**
- [x] Implementar verificación de firma HMAC SHA256
- [x] Middleware de validación de firma en ruta webhook
- [x] Logging de intentos de webhook no autorizados
- [x] Configuración de `APP_SECRET` en .env
- [x] Pruebas con payloads válidos e inválidos

**Archivos Afectados:**
- ✅ `src/middleware/webhookVerification.js` - Middleware con HMAC SHA256
- ✅ `src/routes/webhook.js` - Middleware aplicado en POST
- ✅ `app.js` - Captura de raw body y validación al inicio
- ✅ `.env` - APP_SECRET documentado
- ✅ `docs/WEBHOOK_SECURITY.md` - Documentación completa

**Resultado:** 🔒 Sistema protegido contra webhooks falsos con verificación HMAC SHA256

**Estimación:** ~~1.5 horas~~ → **Tiempo real: 1.5 horas**

---

### 🔥 Tarea 3: Notificaciones Automáticas a Clientes (Alta Prioridad) ✅ COMPLETADA
**Objetivo:** Enviar actualizaciones de estado de pedido automáticamente al cliente

**Subtareas:**
- [x] Función `notifyCustomerOrderStatus()` en whatsappService
- [x] Templates de mensajes por estado:
  - "En ruta" → "🚚 Tu pedido está en camino"
  - "Entregado" → "✅ Pedido entregado. ¡Gracias por tu compra!"
  - "Cancelado" → "❌ Tu pedido ha sido cancelado"
  - "En espera de surtir" → "⏳ Pedido recibido"
- [x] Trigger automático al cambiar estado desde dashboard
- [x] Configuración NOTIFICATIONS_ENABLED para habilitar/deshabilitar
- [x] Log de notificaciones enviadas y errores

**Archivos Afectados:**
- ✅ `src/services/whatsappService.js` - notifyCustomerOrderStatus() con 4 templates
- ✅ `src/controllers/dashboardController.js` - Integración en updateEstadoPedido/Nuevo
- ✅ `.env` y `.env.example` - NOTIFICATIONS_ENABLED configurado
- ✅ `docs/CUSTOMER_NOTIFICATIONS.md` - Documentación completa

**Resultado:** 📱 Clientes reciben notificaciones automáticas sobre estado de pedido

**Estimación:** ~~1.5-2 horas~~ → **Tiempo real: 1.5 horas**

---

### ✅ Tarea 4: Historial de Chats con Persistencia (Alta Prioridad) ✅ COMPLETADA
**Objetivo:** Guardar y visualizar todo el historial de conversaciones

**Estado:** ✅ COMPLETADA (Commit: e04770b - 06/11/2025)

**Subtareas Completadas:**
- [x] Crear tabla `Mensajes` en BD (migración 13):
  - `MensajeID, NumeroTelefono, Tipo, Contenido, TipoMensaje, MetadataWhatsApp, Estado, Fecha`
  - Índices optimizados: IX_Mensajes_Telefono_Fecha, IX_Mensajes_Fecha
- [x] Migración ejecutada exitosamente
- [x] Guardar mensajes entrantes en webhook con metadatos
- [x] Guardar mensajes salientes en whatsappService
- [x] Servicio completo `messageService.js` con 9 funciones
- [x] Endpoints API completos (8 endpoints):
  - `GET /dashboard/chats` - Lista conversaciones
  - `GET /dashboard/chats/:telefono` - Historial completo
  - `POST /dashboard/chats/:telefono/mark-read` - Marcar leídos
  - `GET /dashboard/chats/search` - Búsqueda en mensajes
  - `GET /dashboard/chats/search-conversations` - Búsqueda en conversaciones
  - `POST /dashboard/chats/:telefono/send` - Enviar mensaje desde dashboard
  - `GET /dashboard/chats/stats` - Estadísticas
- [x] Página `/dashboard/chats` con UI estilo WhatsApp
- [x] Componente de visualización de chat con burbujas diferenciadas
- [x] Búsqueda dual-mode (contactos vs mensajes) con toggle UI
- [x] Búsqueda multi-campo: nombre, teléfono y contenido de mensaje
- [x] Visualización de botones interactivos en historial
- [x] Envío de mensajes directos a clientes desde dashboard
- [x] Auto-actualización después de enviar mensaje
- [x] Atajo de teclado Ctrl+Enter para envío rápido
- [x] Paginación de mensajes antiguos
- [x] Badges de mensajes no leídos
- [x] Auto-scroll al último mensaje
- [x] Estados de carga y validación
- [x] Scripts de testing y migración

**Archivos Creados/Modificados:**
- ✅ `migrations/13_mensajes_table.sql`
- ✅ `src/services/messageService.js` (457 líneas, +90)
- ✅ `src/controllers/dashboardController.js` (+180 líneas)
- ✅ `src/controllers/webhookController.js` (integración guardado)
- ✅ `src/services/whatsappService.js` (integración guardado)
- ✅ `src/routes/dashboard.js` (+8 endpoints)
- ✅ `client/src/pages/ChatsPage.jsx` (465 líneas, +162)
- ✅ `client/src/pages/ChatsPage.css` (584 líneas, +137)
- ✅ `client/src/App.jsx` (nueva ruta)
- ✅ `client/src/components/layout/index.jsx` (enlace sidebar)
- ✅ `scripts/run-mensajes-migration.js`
- ✅ `scripts/test-messages.js`
- ✅ `scripts/test-button-messages.js`
- ✅ `scripts/test-search.js`
- ✅ `scripts/test-send-message.js`

**Características Implementadas:**
- 💬 Historial completo persistente de todos los mensajes
- 🔍 Búsqueda avanzada multi-campo (nombre, teléfono, contenido)
- 🎛️ Modo dual de búsqueda (conversaciones o mensajes)
- 🔘 Visualización de botones interactivos enviados al cliente
- ✉️ Envío de mensajes directos a clientes desde dashboard
- 📱 Interfaz estilo WhatsApp Web con burbujas diferenciadas
- 🔄 Auto-actualización y auto-scroll después de enviar
- ⌨️ Atajo Ctrl+Enter para envío rápido
- 📊 Estadísticas en tiempo real (24h, 7d, totales)
- ✓✓ Check marks en mensajes enviados
- 🔔 Badges de mensajes no leídos
- 🎨 UI moderna y responsive

**Resultado:** 💬 Sistema completo de comunicación bidireccional. Los operadores pueden ver historial completo, buscar en conversaciones y responder directamente desde el dashboard. Interfaz profesional similar a WhatsApp Web.

**Estimación:** ~~3-4 horas~~ → **Tiempo real: 4.5 horas** (incluyendo búsqueda avanzada y envío de mensajes)

---

### ✅ Tarea 5: Página de Configuración (Media-Alta Prioridad - COMPLETADA PREVIAMENTE)
**Objetivo:** Permitir configurar impresora, credenciales de WhatsApp y otros ajustes desde el dashboard

**Subtareas:**
- [ ] Crear tabla `Configuraciones` en BD:
  - `ConfigID, Clave, Valor, Tipo, Descripcion, ModificadoPor, FechaModificacion`
- [ ] Migración para crear tabla con valores iniciales
- [ ] Endpoint `/api/configuraciones` (GET/PUT) solo para admins
- [ ] Página `/configuraciones` en dashboard
- [ ] Secciones de configuración:
  - 🖨️ Impresora (PRINTER_HOST, PRINTER_PORT, PRINTER_ENABLED)
  - 📱 WhatsApp (PHONE_NUMBER_ID, WHATSAPP_TOKEN)
  - ⚙️ Sistema (timeouts, límites, etc.)
- [ ] Validación de campos (IP válida, puertos, tokens no vacíos)
- [ ] Reinicio automático de servicios al cambiar config
- [ ] Máscara para tokens sensibles (mostrar solo últimos 4 chars)
- [ ] Historial de cambios de configuración

**Archivos Afectados:**
- `migrations/06_configuraciones.sql` (nuevo)
- `src/services/configService.js` (nuevo)
- `src/controllers/dashboardController.js`
- `src/routes/dashboard.js`
- `client/src/pages/ConfiguracionesPage.jsx` (nuevo)

**Estimación:** 3-4 horas

---

### 🟡 Tarea 6: Rol de Usuario Supervisor (Media Prioridad)
**Objetivo:** Agregar rol intermedio entre admin y editor

**Subtareas:**
- [ ] Actualizar constraint de roles en tabla Usuarios:
  - Agregar 'supervisor' a roles válidos
- [ ] Migración para actualizar constraint
- [ ] Permisos de supervisor:
  - ✅ Ver todos los pedidos y clientes
  - ✅ Actualizar estado de pedidos
  - ✅ Reimprimir tickets
  - ✅ Ver conversaciones y chats
  - ❌ NO puede crear/editar usuarios
  - ❌ NO puede cambiar configuraciones del sistema
  - ✅ Recibe notificaciones de errores de impresión
- [ ] Actualizar middleware de autorización
- [ ] UI para seleccionar rol supervisor al crear usuarios
- [ ] Badge diferenciado para supervisores en dashboard

**Archivos Afectados:**
- `migrations/07_rol_supervisor.sql` (nuevo)
- `src/middleware/auth.js`
- `client/src/pages/UsuariosPage.jsx`

**Estimación:** 1.5 horas

---

### 🟡 Tarea 7: Notificaciones de Errores a Administrador (Media Prioridad)
**Objetivo:** Alertar a admins sobre errores críticos del sistema

**Subtareas:**
- [ ] Crear tabla `NotificacionesAdmin`:
  - `NotificacionID, Tipo, Severidad, Mensaje, FechaHora, Leida, UsuarioID`
- [ ] Migración para crear tabla
- [ ] Service para registrar notificaciones críticas
- [ ] Tipos de notificaciones:
  - 🔥 Error de impresión recurrente (3+ en 10 min)
  - 🔥 Fallo de conexión a BD
  - 🔥 Webhook no autorizado (intento de ataque)
  - ⚠️ Timeout masivo de sesiones
  - ⚠️ Rate limit de WhatsApp API alcanzado
- [ ] Endpoint `/api/notificaciones` para admins
- [ ] Badge en navbar con contador de no leídas
- [ ] Panel de notificaciones en dashboard
- [ ] Envío de notificación push (opcional - Web Push API)

**Archivos Afectados:**
- `migrations/08_notificaciones_admin.sql` (nuevo)
- `src/services/notificationService.js` (nuevo)
- `src/controllers/dashboardController.js`
- `client/src/components/NotificationBell.jsx` (nuevo)

**Estimación:** 2-3 horas

---

### 🟡 Tarea 8: Notificación de Pedido No Impreso a Supervisor (Media Prioridad)
**Objetivo:** Alertar a supervisores cuando un pedido no se imprimió correctamente

**Subtareas:**
- [ ] Detectar pedidos con `EstadoImpresion = 'Error'` o `'Pendiente'` > 5 min
- [ ] Job periódico (cada 5 min) que revisa pedidos no impresos
- [ ] Enviar notificación a usuarios con rol supervisor o admin
- [ ] Incluir folio, cliente y error en la notificación
- [ ] Botón de acción rápida "Reimprimir" en la notificación
- [ ] No notificar el mismo pedido múltiples veces (flag `NotificacionEnviada`)

**Archivos Afectados:**
- `src/services/printMonitorService.js` (nuevo)
- `app.js` (iniciar job)
- Tabla `Pedidos` (agregar campo `NotificacionImpresionEnviada`)

**Estimación:** 1.5-2 horas

---

### ✅ Tarea 9: Gráficas de Estadísticas (Media Prioridad)
**Objetivo:** Visualizar datos de pedidos y tendencias con gráficas interactivas

**Subtareas:**
- [ ] Instalar Recharts
- [ ] Endpoint `/api/estadisticas` con datos agregados:
  - Pedidos por día (últimos 7 días)
  - Pedidos por estado (actual)
  - Clientes nuevos por mes
  - Tasa de éxito de impresión
- [ ] Página `/estadisticas` en dashboard
- [ ] Gráfica de línea: Pedidos por día
- [ ] Gráfica de pie: Pedidos por estado
- [ ] Gráfica de barra: Clientes nuevos por mes
- [ ] KPIs destacados (total pedidos, pendientes, tasa de entrega)

**Archivos Afectados:**
- `src/controllers/dashboardController.js`
- `client/src/pages/EstadisticasPage.jsx` (nuevo)

**Estimación:** 2-3 horas

---

### ✅ Tarea 10: Búsqueda y Filtros Avanzados (Media Prioridad)
**Objetivo:** Permitir búsqueda rápida de pedidos y clientes

**Subtareas:**
- [ ] Agregar búsqueda por folio en pedidos
- [ ] Agregar búsqueda por nombre/teléfono de cliente
- [ ] Implementar búsqueda en tiempo real (debounce 300ms)
- [ ] Búsqueda en backend con SQL LIKE + índices
- [ ] Persistir filtros en localStorage
- [ ] Indicador visual de filtros activos

**Archivos Afectados:**
- `src/controllers/dashboardController.js`
- `client/src/pages/PedidosPage.jsx`
- `client/src/pages/ClientesPage.jsx`

**Estimación:** 1.5-2 horas

---

### ✅ Tarea 11: Exportación de Reportes (Baja Prioridad)
**Objetivo:** Permitir exportar datos a Excel/CSV

**Subtareas:**
- [ ] Instalar librería xlsx
- [ ] Botón "Exportar a Excel" en pedidos y clientes
- [ ] Incluir filtros activos en la exportación
- [ ] Formatear Excel con encabezados y estilos básicos
- [ ] Nombre de archivo con fecha: `pedidos_2025-01-06.xlsx`

**Archivos Afectados:**
- `client/src/pages/PedidosPage.jsx`
- `client/src/pages/ClientesPage.jsx`
- `client/src/utils/excelExport.js` (nuevo)

**Estimación:** 1-1.5 horas

---

### ✅ Tarea 12: Modo Oscuro (Baja Prioridad)
**Objetivo:** Reducir fatiga visual con tema oscuro

**Subtareas:**
- [ ] Configurar Tailwind para dark mode
- [ ] Agregar toggle en navbar
- [ ] Persistir preferencia en localStorage
- [ ] Aplicar tema a todos los componentes existentes
- [ ] Transiciones suaves entre temas

**Archivos Afectados:**
- `client/tailwind.config.js`
- `client/src/components/layout/index.jsx`
- Todos los componentes (agregar clases dark:)

**Estimación:** 1.5-2 horas

---

## 🎯 Priorización Actualizada

### 🔴 CRÍTICA (Implementar PRIMERO - Seguridad y Estabilidad)
1. **Tarea 1:** Concurrencia y transacciones (race conditions)
2. **Tarea 2:** Verificación de firma de webhook (seguridad)

### 🔥 ALTA (Funcionalidades Esenciales)
3. **Tarea 3:** Notificaciones automáticas a clientes
4. **Tarea 4:** Historial de chats con persistencia
5. **Tarea 5:** Página de configuración

### 🟡 MEDIA (Mejoras Importantes)
6. **Tarea 6:** Rol de usuario supervisor
7. **Tarea 7:** Notificaciones de errores a admin
8. **Tarea 8:** Notificación de pedidos no impresos
9. **Tarea 9:** Gráficas de estadísticas
10. **Tarea 10:** Búsqueda y filtros avanzados

### 🟢 BAJA (Nice to Have)
11. **Tarea 11:** Exportación de reportes
12. **Tarea 12:** Modo oscuro

---

## 📊 Estimación Total Actualizada
- **Críticas (Tareas 1-2):** 3.5-4.5 horas
- **Altas (Tareas 3-5):** 8-10 horas
- **Medias (Tareas 6-10):** 9-12 horas
- **Bajas (Tareas 11-12):** 2.5-3.5 horas
- **TOTAL COMPLETO:** 23-30 horas

---

## 🚀 Enfoque Recomendado por Sesiones

### 🔴 Sesión 1: CRÍTICA - Seguridad y Estabilidad (3.5-4.5h)
- ✅ Tarea 1: Concurrencia y transacciones
- ✅ Tarea 2: Verificación firma webhook

### 🔥 Sesión 2: Notificaciones y Comunicación (3-3.5h)
- ✅ Tarea 3: Notificaciones automáticas a clientes
- ✅ Tarea 6: Rol supervisor (adelantar para Tarea 8)

### 🔥 Sesión 3: Chats e Historial (3-4h)
- ✅ Tarea 4: Historial de chats completo

### 🔥 Sesión 4: Configuración del Sistema (3-4h)
- ✅ Tarea 5: Página de configuración

### 🟡 Sesión 5: Sistema de Notificaciones (3.5-5h)
- ✅ Tarea 7: Notificaciones de errores a admin
- ✅ Tarea 8: Notificación pedidos no impresos

### 🟡 Sesión 6: Dashboard Avanzado (3.5-5h)
- ✅ Tarea 9: Gráficas de estadísticas
- ✅ Tarea 10: Búsqueda y filtros avanzados

### 🟢 Sesión 7: Extras Opcionales (2.5-3.5h)
- ✅ Tarea 11: Exportación de reportes
- ✅ Tarea 12: Modo oscuro

---

## 📝 Tecnologías a Utilizar

### Frontend
- **Gráficas:** Recharts (React nativo, ligero)
- **Exportación:** xlsx o react-csv
- **Notificaciones:** react-hot-toast o sonner
- **Búsqueda:** Debounce con lodash o custom hook

### Backend
- **Paginación:** SQL Server OFFSET/FETCH
- **Búsqueda:** SQL LIKE con índices

---

## ✅ Criterios de Éxito

### Tarea 1: Gráficas
- [ ] 3 tipos de gráficas funcionando
- [ ] Datos en tiempo real desde API
- [ ] Responsive y visualmente atractivo
- [ ] Tooltips informativos

### Tarea 2: Búsqueda
- [ ] Búsqueda instantánea (<500ms)
- [ ] Resultados relevantes
- [ ] Sin impacto en performance
- [ ] Persistencia de filtros

### Tarea 3: Exportación
- [ ] Excel generado correctamente
- [ ] Todos los campos incluidos
- [ ] Formato legible y profesional

### Tarea 4: Notificaciones
- [ ] Notificaciones no intrusivas
- [ ] Sistema toast funcional
- [ ] Badge actualizado automáticamente

### Tarea 5: Paginación
- [ ] Carga rápida de páginas
- [ ] Navegación intuitiva
- [ ] Info de registros totales

### Tarea 6: Modo Oscuro
- [ ] Toggle funcional
- [ ] Todos los componentes soportan dark mode
- [ ] Preferencia persistente

---

**Fecha de Inicio:** 2025-01-06  
**Sprint:** 3  
**Estado:** 📋 Planificado

---

## 🤔 ¿Por dónde empezamos?

**Recomendación:** Comenzar con **Tarea 1: Gráficas de Estadísticas** ya que:
1. Alto impacto visual en el dashboard
2. Proporciona valor inmediato a los usuarios
3. Fundamento para futuras métricas
4. Relativamente independiente de otras tareas
