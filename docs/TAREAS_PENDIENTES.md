# 📋 Tareas Pendientes - Resumen Ejecutivo

**Fecha de revisión:** 06/11/2025  
**Sprints revisados:** Sprint 1, Sprint 2, Sprint 3, Sprint 4  
**Última auditoría del código:** 06/11/2025

---

## 🔍 Descubrimientos de la Auditoría de Código

Durante la revisión completa del proyecto, se identificaron varias tareas que están **ya implementadas** o **parcialmente completadas** pero no estaban documentadas correctamente:

### ✅ Implementaciones Descubiertas:

1. **Sistema de Configuración (Tarea 5)** - 🟡 **80% COMPLETADO**
   - Backend completamente funcional (370 líneas en `configService.js`)
   - Base de datos con tabla Configuraciones (migration 10)
   - Endpoints API implementados
   - Solo falta: Frontend UI (`ConfiguracionesPage.jsx`)

2. **Índices de Base de Datos (Tarea 14)** - 🟡 **60% COMPLETADO**
   - 13 índices ya creados en tablas críticas
   - Solo faltan: 3-4 índices adicionales recomendados

3. **Job de Limpieza de Sesiones** - ✅ **100% COMPLETADO**
   - `startCleanupJob()` implementado en Sprint 2
   - Se ejecuta cada hora automáticamente
   - Ya documentado en Sprint 2

4. **Reconexión a BD** - ✅ **100% COMPLETADO**
   - Implementado en Sprint 1 (Tarea 3)
   - Ya documentado

5. **Soft Delete de Usuarios** - ✅ **100% COMPLETADO**
   - Campo `Activo` en tabla Clientes
   - Implementado con botón "Desactivar"
   - Ya funcional en el sistema

6. **JSDoc Parcial** - 🟡 **30% COMPLETADO**
   - `validators.js` tiene JSDoc completo
   - Algunos servicios tienen JSDoc parcial
   - Faltan: controllers, handlers, helpers

7. **Scripts de Testing** - 🟡 **40% COMPLETADO**
   - Existen 7 scripts de testing manual en `scripts/test-*.js`
   - NO son tests automatizados (Jest/Vitest)
   - Son útiles para pruebas manuales

### ❌ Confirmadas como NO Implementadas:

- Health endpoint (`/health`)
- Toast notifications (react-hot-toast/sonner)
- WebSockets (Socket.IO)
- Tests automatizados (Jest)
- CI/CD (GitHub Actions)
- Sistema de métricas (Prometheus)
- Backup automático de BD
- Rotación de logs
- ErrorBoundary en React
- Media handling (imágenes/ubicaciones)

---

## ✅ Estado General

### Sprint 1 (Seguridad Básica)
**Estado:** ✅ **100% COMPLETADO**

- ✅ Tarea 1: Seguridad de Sesiones
- ✅ Tarea 2: Prevención de SQL Injection
- ✅ Tarea 3: Reconexión Automática de Base de Datos
- ✅ Tarea 4: Validación de WEBHOOK_VERIFY_TOKEN

---

### Sprint 2 (Resiliencia y Mantenibilidad)
**Estado:** ✅ **100% COMPLETADO**

- ✅ Tarea 5: Reintentos Automáticos para WhatsApp API
- ✅ Tarea 6: Persistencia de Timeouts en BD
- ✅ Tarea 7: Validación de Transiciones de Estado
- ✅ Tarea 9: Estado de Impresión con Reimpresión

---

### Sprint 3 (Dashboard Avanzado y Funcionalidades Críticas)
**Estado:** 🟡 **42% COMPLETADO** (5 de 12 tareas) ⬆️ **+4% desde última revisión**

#### ✅ Completadas (5)
- ✅ Tarea 1: Concurrencia y Transacciones (optimistic locking)
- ✅ Tarea 2: Verificación de Firma de Webhook
- ✅ Tarea 3: Notificaciones Automáticas a Clientes
- ✅ Tarea 4: Historial de Chats con Persistencia
- ✅ Tarea 5: Página de Configuración ⭐ **NUEVO - 100% COMPLETO**

#### ❌ Pendientes (7)
- ❌ Tarea 6: Rol de Usuario Supervisor
- ❌ Tarea 7: Notificaciones de Errores a Administrador
- ❌ Tarea 8: Notificación de Pedido No Impreso
- ❌ Tarea 9: Gráficas de Estadísticas
- ❌ Tarea 10: Búsqueda y Filtros Avanzados
- ❌ Tarea 11: Exportación de Reportes
- ❌ Tarea 12: Modo Oscuro

---

## 🔴 TAREAS CRÍTICAS PENDIENTES

### ✅ Tarea 5: Página de Configuración del Sistema
**Prioridad:** 🔥 ALTA  
**Estimación:** ~~1-1.5 horas~~ → **0 horas** 
**Estado actual:** ✅ **100% COMPLETADO**

**✅ IMPLEMENTACIÓN COMPLETA:**

**Backend (100%):**
- ✅ Tabla `Configuraciones` creada (migration 10) con 20+ configs iniciales
- ✅ Service `configService.js` implementado (370 líneas)
  - getAllConfigs() con agrupación por categoría (PRINTER, WHATSAPP, SYSTEM, NOTIFICATIONS)
  - updateMultipleConfigs() con validación de tipos
  - Máscaras de seguridad (tokens muestran últimos 4 chars: `****1234`)
  - Validación completa (IP, puertos, tokens, booleans, números)
- ✅ Endpoints `/api/configuraciones` funcionales (GET/PUT)
  - `GET /dashboard/configuraciones` - Obtener todas
  - `GET /dashboard/configuraciones/:categoria` - Por categoría
  - `PUT /dashboard/configuraciones` - Actualizar múltiples
- ✅ Protección: Solo admins (`requireRole('admin')`)
- ✅ Índice `IX_Configuraciones_Categoria` creado

**Frontend (100%):**
- ✅ Página `ConfiguracionPage.jsx` implementada (312 líneas)
- ✅ UI profesional con Tailwind CSS
- ✅ Formularios por categoría (PRINTER, WHATSAPP, SYSTEM, NOTIFICATIONS)
- ✅ Inputs dinámicos según tipo:
  - `boolean` → Checkbox con estado visible
  - `number` → Input numérico con min/max
  - `secret` → Password con placeholder para mantener valor
  - `string` → Input de texto
- ✅ Badges de tipo de dato (color-coded)
- ✅ Validación client-side
- ✅ Mensajes de éxito/error inline (con auto-dismiss a 3s)
- ✅ Estados de carga (loading spinner)
- ✅ Botones Guardar/Cancelar por categoría
- ✅ Campos no editables marcados visualmente
- ✅ Ruta `/dashboard/configuracion` protegida (solo admins)
- ✅ Enlace en Sidebar (solo visible para admins)

**Integración (100%):**
- ✅ Rutas en `App.jsx` configuradas
- ✅ Servicio `configuracionesService` en `api/services.js`
- ✅ Protección con `ProtectedRoute`
- ✅ Menú en `Sidebar` solo para admins

**✨ Características Implementadas:**
- 🔒 Seguridad: Solo admins pueden acceder
- 🎨 UI profesional con gradientes y colores
- 🔄 Actualización sin reiniciar servidor
- 🎯 Validación completa frontend + backend
- 🔐 Enmascaramiento de secrets
- 📝 Descripciones de cada configuración
- ⚡ Actualización por categoría (eficiente)
- 🚫 Previene actualización de campos no editables
- ✅ Feedback visual inmediato

**⚠️ MEJORA OPCIONAL (No crítica):**
- [ ] Reemplazar mensajes inline por toast notifications (react-hot-toast)
  - Actualmente usa divs de éxito/error (funcionan perfectamente)
  - Toast sería una mejora cosmética menor

**Archivos implementados:**
- ✅ `migrations/10_configuraciones.sql` 
- ✅ `src/services/configService.js` (370 líneas)
- ✅ `src/controllers/dashboardController.js` (controllers implementados)
- ✅ `src/routes/dashboard.js` (rutas configuradas)
- ✅ `client/src/pages/ConfiguracionPage.jsx` (312 líneas) ⭐ **COMPLETO**
- ✅ `client/src/api/services.js` (configuracionesService)
- ✅ `client/src/App.jsx` (ruta protegida)
- ✅ `client/src/components/layout/index.jsx` (menú sidebar)

---

## 🟡 TAREAS IMPORTANTES PENDIENTES

### ❌ Tarea 6: Rol de Usuario Supervisor
**Prioridad:** 🟡 MEDIA  
**Estimación:** 1.5 horas

**Objetivo:** Rol intermedio entre admin y editor

**Permisos del Supervisor:**
- ✅ Ver todos los pedidos y clientes
- ✅ Actualizar estado de pedidos
- ✅ Reimprimir tickets
- ✅ Ver conversaciones y chats
- ❌ NO crear/editar usuarios
- ❌ NO cambiar configuraciones
- ✅ Recibir notificaciones de errores

**Subtareas:**
- [ ] Migración para agregar rol 'supervisor' al constraint
- [ ] Actualizar middleware de autorización
- [ ] UI para seleccionar rol supervisor
- [ ] Badge diferenciado en dashboard

**Archivos:**
- `migrations/15_rol_supervisor.sql`
- `src/middleware/auth.js`
- `client/src/pages/UsuariosPage.jsx`

---

### ❌ Tarea 7: Sistema de Notificaciones a Administrador
**Prioridad:** 🟡 MEDIA-ALTA  
**Estimación:** 2-3 horas

**Objetivo:** Alertar a admins sobre errores críticos del sistema

**Tipos de Notificaciones:**
- 🔥 Error de impresión recurrente (3+ en 10 min)
- 🔥 Fallo de conexión a BD
- 🔥 Webhook no autorizado (intento de ataque)
- ⚠️ Timeout masivo de sesiones
- ⚠️ Rate limit de WhatsApp API alcanzado

**Subtareas:**
- [ ] Crear tabla `NotificacionesAdmin`
- [ ] Service `notificationService.js`
- [ ] Endpoint `/api/notificaciones` para admins
- [ ] Badge en navbar con contador
- [ ] Panel de notificaciones en dashboard
- [ ] Integrar en servicios críticos

**Archivos:**
- `migrations/16_notificaciones_admin.sql`
- `src/services/notificationService.js`
- `src/controllers/dashboardController.js`
- `client/src/components/NotificationBell.jsx`

---

### ❌ Tarea 8: Notificación de Pedidos No Impresos
**Prioridad:** 🟡 MEDIA  
**Estimación:** 1.5-2 horas

**Objetivo:** Alertar a supervisores cuando un pedido no se imprime

**Subtareas:**
- [ ] Job periódico (cada 5 min) revisa pedidos no impresos
- [ ] Detectar `EstadoImpresion = 'Error'/'Pendiente'` > 5 min
- [ ] Enviar notificación a supervisores/admins
- [ ] Botón "Reimprimir" en notificación
- [ ] Flag para no notificar múltiples veces

**Archivos:**
- `src/services/printMonitorService.js`
- `app.js` (iniciar job)
- Migración para campo `NotificacionImpresionEnviada`

---

### ❌ Tarea 9: Gráficas de Estadísticas
**Prioridad:** 🟡 MEDIA  
**Estimación:** 2-3 horas

**Objetivo:** Visualizar datos y tendencias con gráficas interactivas

**Gráficas:**
- 📊 Línea: Pedidos por día (últimos 7 días)
- 🥧 Pie: Pedidos por estado actual
- 📊 Barra: Clientes nuevos por mes
- 📈 KPIs: Total pedidos, pendientes, tasa de entrega

**Subtareas:**
- [ ] Instalar Recharts
- [ ] Endpoint `/api/estadisticas` con datos agregados
- [ ] Página `/estadisticas` en dashboard
- [ ] 3+ tipos de gráficas
- [ ] KPIs destacados

**Archivos:**
- `src/controllers/dashboardController.js`
- `client/src/pages/EstadisticasPage.jsx`

---

### ❌ Tarea 10: Búsqueda y Filtros Avanzados
**Prioridad:** 🟡 MEDIA  
**Estimación:** 1.5-2 horas

**Objetivo:** Búsqueda rápida de pedidos y clientes

**Funcionalidades:**
- 🔍 Búsqueda por folio en pedidos
- 🔍 Búsqueda por nombre/teléfono de cliente
- ⚡ Búsqueda en tiempo real (debounce 300ms)
- 💾 Persistir filtros en localStorage
- 🏷️ Indicador visual de filtros activos

**Subtareas:**
- [ ] Búsqueda en backend con SQL LIKE + índices
- [ ] Implementar en PedidosPage
- [ ] Implementar en ClientesPage
- [ ] Debounce en búsqueda
- [ ] Persistencia en localStorage

**Archivos:**
- `src/controllers/dashboardController.js`
- `client/src/pages/PedidosPage.jsx`
- `client/src/pages/ClientesPage.jsx`

---

## 🟢 TAREAS OPCIONALES (Nice to Have)

### ❌ Tarea 11: Exportación de Reportes
**Prioridad:** 🟢 BAJA  
**Estimación:** 1-1.5 horas

**Objetivo:** Exportar datos a Excel/CSV

**Funcionalidades:**
- 📊 Exportar pedidos a Excel
- 👥 Exportar clientes a Excel
- 🔧 Incluir filtros activos
- 📅 Nombre con fecha: `pedidos_2025-11-06.xlsx`

**Subtareas:**
- [ ] Instalar librería xlsx
- [ ] Botón "Exportar a Excel" en páginas
- [ ] Formatear Excel con estilos
- [ ] Incluir filtros activos

---

### ❌ Tarea 12: Modo Oscuro
**Prioridad:** 🟢 BAJA  
**Estimación:** 1.5-2 horas

**Objetivo:** Reducir fatiga visual con tema oscuro

**Funcionalidades:**
- 🌙 Toggle en navbar
- 💾 Persistir preferencia en localStorage
- 🎨 Aplicar a todos los componentes
- ✨ Transiciones suaves

**Subtareas:**
- [ ] Configurar Tailwind dark mode
- [ ] Toggle en navbar
- [ ] Persistencia en localStorage
- [ ] Aplicar clases dark: a componentes

---

## 📊 Resumen de Estimaciones

| Prioridad | Tareas | Tiempo Estimado |
|-----------|--------|-----------------|
| 🔥 ALTA | 1 | 3-4 horas |
| 🟡 MEDIA | 5 | 10.5-13 horas |
| 🟢 BAJA | 2 | 2.5-3.5 horas |
| **TOTAL** | **8** | **16-20.5 horas** |

---

## 🎯 Roadmap Recomendado

### 📅 Fase 1: Configuración y Gestión (4.5-5.5h)
**Objetivo:** Facilitar administración del sistema

1. **Tarea 5:** Página de Configuración (3-4h)
2. **Tarea 6:** Rol Supervisor (1.5h)

**Beneficio:** Sistema más manejable y roles definidos

---

### 📅 Fase 2: Sistema de Alertas (4-5h)
**Objetivo:** Monitoreo proactivo de errores

3. **Tarea 7:** Notificaciones a Admin (2-3h)
4. **Tarea 8:** Alertas de Impresión (1.5-2h)

**Beneficio:** Detección temprana de problemas

---

### 📅 Fase 3: Dashboard Avanzado (4-5h)
**Objetivo:** Mejor visualización y navegación

5. **Tarea 9:** Gráficas de Estadísticas (2-3h)
6. **Tarea 10:** Búsqueda Avanzada (1.5-2h)

**Beneficio:** Insights y productividad mejorada

---

### 📅 Fase 4: Extras Opcionales (2.5-3.5h)
**Objetivo:** Pulir experiencia de usuario

7. **Tarea 11:** Exportación de Reportes (1-1.5h)
8. **Tarea 12:** Modo Oscuro (1.5-2h)

**Beneficio:** UX mejorada y funcionalidades adicionales

---

## 🚀 Orden de Implementación Sugerido

### Semana 1 - Gestión y Control
```
Día 1: Tarea 5 (Configuración) - 3-4h
Día 2: Tarea 6 (Supervisor) + Tarea 8 (Alertas Impresión) - 3-3.5h
```

### Semana 2 - Monitoreo y Análisis
```
Día 1: Tarea 7 (Notificaciones Admin) - 2-3h
Día 2: Tarea 9 (Gráficas) - 2-3h
```

### Semana 3 - UX y Productividad
```
Día 1: Tarea 10 (Búsqueda Avanzada) - 1.5-2h
Día 2: Tarea 11 (Exportación) + Tarea 12 (Modo Oscuro) - 2.5-3.5h
```

---

## 💡 Notas Importantes

### Dependencias entre Tareas
- **Tarea 8** requiere **Tarea 6** (rol supervisor para notificaciones)
- **Tarea 7** facilita **Tarea 8** (sistema de notificaciones)
- **Tarea 10** mejora **Tarea 11** (filtros en exportación)

### Tareas que Pueden Hacerse en Paralelo
- Tareas 5 y 6 (diferentes áreas)
- Tareas 9 y 10 (frontend vs backend)
- Tareas 11 y 12 (independientes)

### Recomendaciones
1. **Empezar por Tarea 5** - Base para otras configuraciones
2. **Tarea 6 antes de Tarea 8** - Necesita rol supervisor
3. **Tareas 11 y 12 al final** - Son opcionales y no bloquean otras

---

## ✅ Criterios de Éxito por Tarea

### Tarea 5: Configuración
- [ ] Todas las configs visibles en UI
- [ ] Cambios persisten en BD
- [ ] Validaciones funcionan
- [ ] Servicios se reinician automáticamente

### Tarea 6: Supervisor
- [ ] Rol creado en BD
- [ ] Permisos correctos aplicados
- [ ] UI muestra rol correctamente

### Tarea 7: Notificaciones Admin
- [ ] Badge muestra contador correcto
- [ ] Panel de notificaciones funcional
- [ ] Notificaciones se generan automáticamente

### Tarea 8: Alertas Impresión
- [ ] Job detecta pedidos no impresos
- [ ] Notificaciones llegan a supervisores
- [ ] No hay notificaciones duplicadas

### Tarea 9: Gráficas
- [ ] 3+ gráficas visibles
- [ ] Datos en tiempo real
- [ ] Responsive en móvil

### Tarea 10: Búsqueda
- [ ] Búsqueda instantánea (<500ms)
- [ ] Resultados relevantes
- [ ] Filtros persisten

### Tarea 11: Exportación
- [ ] Excel generado correctamente
- [ ] Formato profesional
- [ ] Incluye todos los campos

### Tarea 12: Modo Oscuro
- [ ] Toggle funciona
- [ ] Tema aplicado globalmente
- [ ] Preferencia persiste

---

---

## 🆕 NUEVAS TAREAS IDENTIFICADAS (Sprint 4)

### 🔴 CRÍTICAS - Infraestructura y Estabilidad

#### ❌ Tarea 13: Endpoint /health para Monitoreo
**Prioridad:** 🔴 CRÍTICA  
**Estimación:** 1 hora

**Objetivo:** Healthcheck robusto para monitoreo de servicios

**Subtareas:**
- [ ] Endpoint `GET /health` público (sin autenticación)
- [ ] Verificar estado de BD (conexión activa)
- [ ] Verificar estado de WhatsApp API (token válido)
- [ ] Verificar espacio en disco
- [ ] Verificar memoria disponible
- [ ] Tiempo de respuesta de servicios críticos
- [ ] Formato JSON con detalles por servicio
- [ ] HTTP 200 si todo OK, 503 si hay fallos

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-06T10:30:00Z",
  "uptime": 86400,
  "services": {
    "database": { "status": "up", "responseTime": 45 },
    "whatsapp": { "status": "up", "responseTime": 120 },
    "disk": { "status": "ok", "usage": "45%" },
    "memory": { "status": "ok", "usage": "62%" }
  }
}
```

**Archivos:**
- `src/routes/health.js`
- `src/controllers/healthController.js`

---

#### 🟡 Tarea 14: Optimización de Base de Datos
**Prioridad:** 🔴 CRÍTICA  
**Estimación:** 1-2 horas (índices adicionales)  
**Estado actual:** 🟡 **~60% COMPLETADO**

**✅ ÍNDICES YA CREADOS:**
- ✅ `IX_Pedidos_ClienteID` - Pedidos por cliente
- ✅ `IX_Pedidos_Estado` - Filtros estado
- ✅ `IX_Pedidos_Fecha` - Ordenamiento fecha
- ✅ `IX_Pedidos_EstadoImpresion` - Filtros impresión
- ✅ `IX_Conversaciones_UltimaInteraccion` - Timeouts
- ✅ `IX_Conversaciones_TimeoutExpiraEn` - Cleanup
- ✅ `IX_Usuarios_Username` - Login
- ✅ `IX_Usuarios_Activo` - Filtros usuarios
- ✅ `IX_LogAccesos_UsuarioID` - Auditoría
- ✅ `IX_LogAccesos_FechaHora` - Logs
- ✅ `IX_Mensajes_Telefono_Fecha` - Chat history
- ✅ `IX_Mensajes_Fecha` - Mensajes ordenados
- ✅ `IX_Configuraciones_Categoria` - Config agrupada

**❌ ÍNDICES ADICIONALES RECOMENDADOS:**
- [ ] Análisis queries lentas (Query Store)
- [ ] Índice en `Pedidos.Folio` (búsquedas)
- [ ] Índice en `Clientes.Nombre` (búsquedas texto)
- [ ] Índice compuesto `Conversaciones(NumeroTelefono, Estado)`
- [ ] Actualizar estadísticas BD

**Migración:**
- `migrations/17_indices_adicionales.sql`

**Objetivo:** Agregar índices para mejorar performance

---

#### ❌ Tarea 15: Rotación y Gestión de Logs
**Prioridad:** 🔴 CRÍTICA  
**Estimación:** 1.5 horas

**Objetivo:** Prevenir que logs llenen el disco

**Subtareas:**
- [ ] Configurar `pino-pretty` con rotación
- [ ] Logs por día: `logs/app-2025-11-06.log`
- [ ] Retención: 30 días
- [ ] Compresión de logs antiguos (.gz)
- [ ] Limpieza automática de logs >30 días
- [ ] Separar logs por nivel (info, error, warn)
- [ ] Configuración en .env: `LOG_LEVEL`, `LOG_RETENTION_DAYS`

**Archivos:**
- `src/logger.js`
- `package.json` (agregar pino-rotating-file-stream)

---

#### ❌ Tarea 16: Backup Automático de Base de Datos
**Prioridad:** 🔴 CRÍTICA  
**Estimación:** 2 horas

**Objetivo:** Proteger datos con backups automáticos

**Subtareas:**
- [ ] Script de backup con SQL Server BACKUP DATABASE
- [ ] Backup completo diario (3 AM)
- [ ] Backup diferencial cada 6 horas
- [ ] Retención: 7 días completos, 30 días diferenciales
- [ ] Verificación de integridad de backup
- [ ] Notificación si backup falla
- [ ] Compresión de backups
- [ ] Configurar cron job o Windows Task Scheduler

**Archivos:**
- `scripts/backup-database.js`
- `scripts/verify-backup.js`

---

### 🟡 IMPORTANTES - Funcionalidades y Mejoras

#### ❌ Tarea 17: Sistema de Notificaciones Toast en Frontend
**Prioridad:** 🟡 ALTA  
**Estimación:** 1.5 horas

**Objetivo:** Feedback visual inmediato de acciones

**Subtareas:**
- [ ] Instalar `react-hot-toast` o `sonner`
- [ ] Configurar Toaster en App.jsx
- [ ] Tipos: success, error, warning, info
- [ ] Posición: top-right
- [ ] Duración: 3-5 segundos
- [ ] Implementar en todas las páginas:
  - ✅ Pedido actualizado
  - ✅ Cliente guardado
  - ✅ Usuario creado
  - ❌ Error de red
  - ⚠️ Advertencias

**Archivos:**
- `client/src/App.jsx`
- Todas las páginas (reemplazar alerts)

---

#### ❌ Tarea 18: Notificaciones en Tiempo Real con WebSockets
**Prioridad:** 🟡 ALTA  
**Estimación:** 3-4 horas

**Objetivo:** Actualización instantánea de nuevos pedidos

**Subtareas:**
- [ ] Instalar `socket.io` y `socket.io-client`
- [ ] Configurar servidor Socket.IO en Express
- [ ] Eventos:
  - `new_order` - Nuevo pedido recibido
  - `order_updated` - Estado actualizado
  - `message_received` - Nuevo mensaje en chat
- [ ] Cliente React escucha eventos
- [ ] Actualizar UI automáticamente sin refresh
- [ ] Badge de notificación en navbar
- [ ] Sonido opcional de notificación

**Archivos:**
- `app.js` (Socket.IO server)
- `src/services/socketService.js`
- `client/src/hooks/useSocket.js`
- `client/src/contexts/SocketContext.jsx`

---

#### ❌ Tarea 19: Confirmación de Lectura de Mensajes
**Prioridad:** 🟡 MEDIA  
**Estimación:** 2 horas

**Objetivo:** Marcar mensajes como leídos en WhatsApp

**Subtareas:**
- [ ] Endpoint de WhatsApp API para marcar como leído
- [ ] Marcar automáticamente al abrir chat en dashboard
- [ ] Actualizar estado `Leido` en BD
- [ ] Sincronizar con campo `read_status` de WhatsApp
- [ ] Check azul (✓✓) cuando cliente lee mensaje

**Archivos:**
- `src/services/whatsappService.js`
- `src/controllers/dashboardController.js`
- `client/src/pages/ChatsPage.jsx`

---

#### ❌ Tarea 20: Manejo de Media (Imágenes/Ubicaciones)
**Prioridad:** 🟡 MEDIA  
**Estimación:** 4-5 horas

**Objetivo:** Soportar mensajes multimedia

**Subtareas:**
- [ ] Recibir imágenes en webhook
- [ ] Descargar y guardar imágenes localmente
- [ ] Tabla `MediaMensajes` (MensajeID, TipoMedia, URL, RutaLocal)
- [ ] Mostrar imágenes en historial de chats
- [ ] Recibir ubicaciones (lat, long)
- [ ] Mostrar mapa en dashboard (Google Maps/Mapbox)
- [ ] Enviar imágenes desde dashboard (opcional)

**Archivos:**
- `migrations/18_media_mensajes.sql`
- `src/services/mediaService.js`
- `src/controllers/webhookController.js`
- `client/src/pages/ChatsPage.jsx`

---

### 🟢 CALIDAD DE CÓDIGO - Testing y Documentación

#### 🟡 Tarea 21: Tests Unitarios Completos
**Prioridad:** 🟢 ALTA (Calidad)  
**Estimación:** 4-5 horas (ajustado)  
**Estado actual:** 🟡 **~30% - Tests manuales existen**

**✅ SCRIPTS DE TESTING MANUAL:**
- ✅ `scripts/test-search.js` - Búsquedas
- ✅ `scripts/test-messages.js` - Mensajes
- ✅ `scripts/test-config.js` - Configuración
- ✅ `scripts/test-concurrency.js` - Concurrencia
- ✅ `scripts/test-button-messages.js` - Botones
- ✅ `scripts/test-update-estado.js` - Estados
- ✅ `scripts/test-send-message.js` - Envío

**❌ TESTS AUTOMATIZADOS NO IMPLEMENTADOS:**

**Objetivo:** Cobertura de código >80% con tests automatizados

**Subtareas:**
- [ ] Configurar Jest + Supertest (backend) o Vitest (si frontend)
- [ ] Tests para `sessionService.js`
- [ ] Tests para `whatsappService.js`
- [ ] Tests para `messageService.js`
- [ ] Tests para `configService.js`
- [ ] Tests para endpoints de API
- [ ] Tests para componentes React (React Testing Library)
- [ ] Mock de BD y API de WhatsApp
- [ ] Script `npm test` con coverage report
- [ ] Integrar con CI/CD

**Archivos:**
- `jest.config.js` (o vitest.config.js)
- `tests/unit/` (directorio nuevo)
- `tests/integration/` (directorio nuevo)
- `package.json` (scripts de test)

---

#### 🟡 Tarea 22: JSDoc Completo
**Prioridad:** 🟢 MEDIA (Calidad)  
**Estimación:** 2-3 horas (ajustado)  
**Estado actual:** 🟡 **~30% COMPLETADO**

**✅ JSDoc YA IMPLEMENTADO:**
- ✅ `src/utils/validators.js` - 100% documentado con @param, @returns
- ✅ Algunas funciones en `whatsappService.js` - Parcial
- ✅ Algunas funciones en otros servicios - Parcial

**❌ JSDoc PENDIENTE:**

**Objetivo:** Documentación inline de todo el código

**Subtareas:**
- [ ] JSDoc completo en todos los servicios (dbService, sessionService, etc.)
- [ ] JSDoc completo en todos los controllers
- [ ] JSDoc en funciones helpers
- [ ] JSDoc en handlers (stateHandlers, buttonHandlers)
- [ ] Tipos de parámetros y returns completos
- [ ] Ejemplos de uso en funciones complejas
- [ ] Generar HTML docs con `jsdoc` (opcional)
- [ ] Configurar VSCode para IntelliSense mejorado

**Archivos:**
- Todos los `.js` en `src/services/`
- Todos los `.js` en `src/controllers/`
- Todos los `.js` en `src/handlers/`
- `jsdoc.config.json` (opcional para generar docs HTML)

---

#### ❌ Tarea 23: Mejorar Configuración de ESLint
**Prioridad:** 🟢 MEDIA (Calidad)  
**Estimación:** 1 hora

**Objetivo:** Estándar de código consistente

**Subtareas:**
- [ ] Configurar ESLint con Airbnb style guide
- [ ] Reglas para async/await
- [ ] Reglas para promesas
- [ ] Detectar variables no usadas
- [ ] Detectar imports no usados
- [ ] Formateo automático con Prettier
- [ ] Pre-commit hook con Husky

**Archivos:**
- `eslint.config.js`
- `.prettierrc`
- `package.json` (husky, lint-staged)

---

### 🔧 REFACTORIZACIÓN Y OPTIMIZACIÓN

#### ❌ Tarea 24: Externalizar Mensajes a Configuración
**Prioridad:** � MEDIA  
**Estimación:** 2 horas

**Objetivo:** Mensajes centralizados y editables

**Subtareas:**
- [ ] Archivo `config/messages.json` con todos los textos
- [ ] Refactorizar `stateHandlers.js` para usar config
- [ ] Refactorizar `buttonHandlers.js` para usar config
- [ ] Función helper `getMessage(key, params)`
- [ ] Soporte para plantillas con variables: `{nombre}`, `{folio}`
- [ ] Mensajes en español e inglés (i18n futuro)

**Archivos:**
- `config/messages.json`
- `src/utils/messageHelper.js`
- `src/handlers/stateHandlers.js`
- `src/handlers/buttonHandlers.js`

---

#### ❌ Tarea 25: Refactorizar Mensajes de Bienvenida Duplicados
**Prioridad:** 🟢 BAJA  
**Estimación:** 1 hora

**Objetivo:** DRY - Eliminar duplicación de código

**Subtareas:**
- [ ] Identificar mensajes duplicados
- [ ] Crear función `sendWelcomeMessage(telefono, nombre)`
- [ ] Consolidar lógica de bienvenida
- [ ] Usar en todos los handlers

**Archivos:**
- `src/handlers/stateHandlers.js`
- `src/utils/messageHelper.js`

---

#### 🟡 Tarea 26: Soft Delete Mejorado para Clientes
**Prioridad:** 🟢 BAJA  
**Estimación:** 1 hora (ajustado)  
**Estado actual:** 🟡 **~60% COMPLETADO**

**✅ YA IMPLEMENTADO:**
- ✅ Campo `Activo BIT` en tabla Clientes (migration 01)
- ✅ Soft delete funcional con SET Activo = 0
- ✅ Endpoint DELETE implementado
- ✅ UI con botón "Desactivar" en dashboard
- ✅ Filtros en queries WHERE Activo = 1

**❌ MEJORAS OPCIONALES:**

**Objetivo:** Mejorar auditoría de eliminaciones

**Subtareas opcionales:**
- [ ] Agregar campo `EliminadoEn DATETIME2` (timestamp)
- [ ] Agregar campo `EliminadoPor INT` (FK a Usuarios) para auditoría
- [ ] UI para "Papelera" de clientes desactivados
- [ ] Botón "Restaurar" para clientes desactivados
- [ ] Mostrar quién y cuándo desactivó

**Archivos:**
- `migrations/19_soft_delete_mejorado.sql` (opcional)
- `src/controllers/dashboardController.js` (mejorar)
- `client/src/pages/ClientesPage.jsx` (papelera opcional)

**Nota:** El soft delete básico ya funciona correctamente. Estas son solo mejoras de auditoría.

---

### 🚀 DEVOPS Y CI/CD

#### ❌ Tarea 27: CI/CD con GitHub Actions
**Prioridad:** 🟡 ALTA  
**Estimación:** 2-3 horas

**Objetivo:** Automatizar testing y deployment

**Subtareas:**
- [ ] Workflow de CI:
  - Lint con ESLint
  - Tests con Jest
  - Build de frontend
  - Verificar migraciones
- [ ] Workflow de CD:
  - Deploy automático a servidor
  - Backup antes de deploy
  - Ejecutar migraciones
  - Reiniciar servicios
- [ ] Branch protection rules
- [ ] Status badges en README

**Archivos:**
- `.github/workflows/ci.yml`
- `.github/workflows/cd.yml`

---

#### ❌ Tarea 28: Sistema de Métricas y Monitoring
**Prioridad:** 🟡 MEDIA  
**Estimación:** 3-4 horas

**Objetivo:** Monitorear performance y uso

**Subtareas:**
- [ ] Instalar Prometheus client
- [ ] Métricas:
  - Requests por endpoint
  - Tiempo de respuesta
  - Errores por tipo
  - Mensajes procesados
  - Pedidos por día/hora
  - Uso de memoria/CPU
- [ ] Endpoint `/metrics` para Prometheus
- [ ] Dashboard con Grafana (opcional)
- [ ] Alertas configurables

**Archivos:**
- `src/middleware/metrics.js`
- `src/routes/metrics.js`
- `prometheus.yml` (config)

---

## 📊 Resumen Actualizado de Estimaciones

### ⚠️ AJUSTE POST-AUDITORÍA

**Tiempo original estimado:** 49-63 horas  
**Tiempo reducido por implementaciones existentes:** 5-7 horas  
**Tiempo real pendiente:** **44-56 horas**

### Sprint 3 (Original)
| Estado | Tareas | Tiempo Estimado |
|--------|--------|-----------------|
| � Parcial | 1 (Config 80%) | 1-1.5 horas |
| ❌ Pendientes | 7 | 15-19 horas |
| **Subtotal Sprint 3** | **8** | **16-20.5 horas** ➔ **16-20.5h** |

### Sprint 4 (Nuevo - Ajustado)
| Prioridad | Tareas | Tiempo Original | Tiempo Ajustado |
|-----------|--------|-----------------|-----------------|
| 🔴 CRÍTICA | 4 | 6.5-8h | 5.5-7h ⬇️ |
| 🟡 ALTA | 4 | 10-14h | 10-14h |
| 🟢 MEDIA-ALTA | 4 | 11-14h | 9-11h ⬇️ |
| 🟢 BAJA | 4 | 5.5-6.5h | 3-4.5h ⬇️ |
| **Subtotal Sprint 4** | **16** | **33-42.5h** | **27.5-36.5h** |

### TOTAL GENERAL (AJUSTADO)
| Sprint | Tareas | Tiempo Real Pendiente |
|--------|--------|----------------------|
| Sprint 3 | 8 (1 parcial) | 16-20.5 horas |
| Sprint 4 | 16 (varios parciales) | 27.5-36.5 horas |
| **TOTAL** | **24** | **43.5-57 horas** |

**Ahorro identificado:** ~12.5 horas (26% reducción) - ConfiguracionPage 100% completo ✅

---

## 🎯 Roadmap Actualizado con Prioridades

### 🔴 FASE CRÍTICA (Sprint 4 - Infraestructura)
**Estimación ajustada:** 5.5-7 horas (antes: 6.5-8h)

**Orden sugerido:**
1. **Tarea 13:** Endpoint /health (1h) ❌ NO IMPLEMENTADO
2. **Tarea 14:** Optimización BD (1-2h) 🟡 60% HECHO - solo faltan 3-4 índices
3. **Tarea 15:** Rotación de logs (1.5h) ❌ NO IMPLEMENTADO
4. **Tarea 16:** Backup automático (2h) ❌ NO IMPLEMENTADO

**Beneficio:** Sistema robusto y monitoreable en producción

---

### 🔥 FASE 1 (Sprint 3 - Configuración)
**Estimación:** 4.5-5.5 horas

1. **Tarea 5:** Página de Configuración (3-4h)
2. **Tarea 6:** Rol Supervisor (1.5h)

---

### 🟡 FASE 2 (Sprint 4 - Tiempo Real)
**Estimación:** 5-6.5 horas

1. **Tarea 17:** Sistema de toast notifications (1.5h)
2. **Tarea 18:** WebSockets para tiempo real (3-4h)
3. **Tarea 27:** CI/CD con GitHub Actions (2-3h) ← en paralelo

---

### 🟡 FASE 3 (Sprint 3 - Monitoreo)
**Estimación:** 4-5 horas

1. **Tarea 7:** Notificaciones a Admin (2-3h)
2. **Tarea 8:** Alertas de Impresión (1.5-2h)

---

### 🟡 FASE 4 (Sprint 3 - Analytics)
**Estimación:** 4-5 horas

1. **Tarea 9:** Gráficas de Estadísticas (2-3h)
2. **Tarea 10:** Búsqueda Avanzada (1.5-2h)

---

### 🟢 FASE 5 (Sprint 4 - Mensajería Avanzada)
**Estimación:** 6-7 horas

1. **Tarea 19:** Confirmación de lectura (2h)
2. **Tarea 20:** Manejo de media (4-5h)

---

### 🟢 FASE 6 (Calidad de Código)
**Estimación:** 9-11 horas

1. **Tarea 21:** Tests unitarios (5-6h)
2. **Tarea 22:** JSDoc completo (3-4h)
3. **Tarea 23:** ESLint mejorado (1h)

---

### 🟢 FASE 7 (Refactorización)
**Estimación:** 4.5-5.5 horas

1. **Tarea 24:** Externalizar mensajes (2h)
2. **Tarea 25:** Refactorizar duplicados (1h)
3. **Tarea 26:** Soft delete clientes (1.5h)

---

### 🟢 FASE 8 (Extras y Monitoring)
**Estimación:** 6-8 horas

1. **Tarea 28:** Sistema de métricas (3-4h)
2. **Tarea 11:** Exportación reportes (1-1.5h)
3. **Tarea 12:** Modo oscuro (1.5-2h)

---

## 📈 Progreso General Actualizado (POST-AUDITORÍA)

```
Sprint 1: ████████████████████ 100% (4/4)
Sprint 2: ████████████████████ 100% (4/4)
Sprint 3: █████████░░░░░░░░░░░  42% (5/12) ⬆️ +4% (ConfiguracionPage completo)
Sprint 4: ██░░░░░░░░░░░░░░░░░░  10% (1.6/16) 🟡 Índices + soft delete parciales
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL:    █████████░░░░░░░░░░░  42% (14.6/36) ⬆️ +9% post-auditoría completa
```

**Antes de auditoría:** 33% (12/36 tareas) - ~49-63h estimado
**Después de auditoría:** 42% (14.6/36) - ~36.5-48.5h real  
**Ahorro identificado:** ~12.5 horas de trabajo evitado (26% reducción)

### 🎉 Descubrimientos Finales de Auditoría:

**✅ COMPLETOS (No documentados):**
1. ⭐ **ConfiguracionPage** - 100% implementado (312 líneas)
   - Backend: `configService.js` (370 líneas)
   - Frontend: UI completa con Tailwind
   - 4 categorías: PRINTER, WHATSAPP, SYSTEM, NOTIFICATIONS
   - Máscaras de seguridad, validación completa
   
2. **Soft Delete** - 100% funcional
   - Campo `Activo` en Clientes
   - Endpoint DELETE con soft delete
   - UI con botón Desactivar

**🟡 PARCIALES:**
3. **Índices de BD** - 60% (13 de ~16 índices)
4. **JSDoc** - 30% (validators.js completo, otros parciales)
5. **Tests** - 30% (7 scripts manuales, faltan automatizados)

---

## 🎯 Recomendación de Implementación (ACTUALIZADA - 06/11/2025)

### ✅ COMPLETADO: Tarea 5 - ConfiguracionPage
**Estado:** ⭐ 100% IMPLEMENTADO Y FUNCIONAL
- Backend completo (370 líneas)
- Frontend completo (312 líneas)
- Integración total
- Solo mejora opcional: Toast notifications (cosmético)

### ✅ COMPLETADO: dbInitService actualizado
**Estado:** ⭐ 100% ACTUALIZADO (06/11/2025)
- ✅ Tabla `Configuraciones` incluida con 11 configs iniciales
- ✅ Tabla `Mensajes` incluida con índices optimizados
- ✅ Campos `Version` en Conversaciones y Pedidos (concurrencia)
- ✅ Índice `IX_Conversaciones_NumeroTelefono_Version`
- ✅ Documentación actualizada (8 tablas, 16 índices)
- ✅ Inicialización completa en un solo paso
- **Beneficio:** Ya no se requieren migraciones 09, 10, 13 para inicialización

---

### 🚀 SIGUIENTE PASO RECOMENDADO

### 🥇 OPCIÓN 1: Infraestructura Crítica (5.5-7h)
**Sprint 4 - Tareas CRÍTICAS para producción**
```
Orden sugerido:
1. Endpoint /health (1h) - Monitoreo esencial
2. Índices adicionales BD (1-2h) - 4 índices faltantes
3. Rotación de logs (1.5h) - Prevenir disco lleno
4. Backup automático (2h) - Protección de datos

Impacto: Sistema production-ready
```

### 🥈 OPCIÓN 2: Completar Sprint 3 (9-12h)
**Dashboard avanzado completo**
```
Orden sugerido:
6. Rol supervisor (1.5h)
7. Notificaciones admin (2-3h)
8. Alertas impresión (1.5-2h)
9. Gráficas estadísticas (2-3h)
10. Búsqueda avanzada (1.5-2h)

Impacto: Dashboard con todas las funcionalidades
```

### 🥉 OPCIÓN 3: Tiempo Real (10-14h)
**Experiencia de usuario mejorada**
```
Orden sugerido:
17. Toast notifications (1.5h) - UX mejorada
18. WebSockets (3-4h) - Actualizaciones en tiempo real
19. Confirmación lectura (2h)

Impacto: Dashboard reactivo y moderno
```

---

### Semana 5-6: Analytics y UX
```
11. Gráficas estadísticas
12. Búsqueda avanzada
13. Confirmación lectura
14. CI/CD setup
```

### Semana 7-8: Calidad
```
15. Tests unitarios
16. JSDoc completo
17. ESLint + Prettier
```

---

## 📁 Archivos Clave Descubiertos en la Auditoría

### ✅ Implementaciones Completas Encontradas:

#### 1. Sistema de Configuración (370 líneas)
```
src/services/configService.js
├── getAllConfigs() - Lee todas las configs agrupadas por categoría
├── updateConfig(clave, valor) - Actualiza y valida
├── Máscaras de seguridad para tokens
├── Validación de tipos (IP, puerto, boolean, número)
└── Categorías: PRINTER, WHATSAPP, SYSTEM, NOTIFICATIONS

migrations/10_configuraciones.sql
└── Tabla Configuraciones con 20+ configuraciones iniciales
```

#### 2. Índices de Base de Datos (13 índices)
```sql
-- Pedidos (4 índices)
IX_Pedidos_ClienteID
IX_Pedidos_Estado  
IX_Pedidos_Fecha
IX_Pedidos_EstadoImpresion

-- Conversaciones (2 índices)
IX_Conversaciones_UltimaInteraccion
IX_Conversaciones_TimeoutExpiraEn

-- Usuarios y Logs (4 índices)
IX_Usuarios_Username
IX_Usuarios_Activo
IX_LogAccesos_UsuarioID
IX_LogAccesos_FechaHora

-- Mensajes (2 índices)
IX_Mensajes_Telefono_Fecha
IX_Mensajes_Fecha

-- Configuraciones (1 índice)
IX_Configuraciones_Categoria
```

#### 3. Soft Delete en Clientes
```sql
-- migrations/01_schema.sql
CREATE TABLE Clientes (
  ...
  Activo BIT NOT NULL DEFAULT 1  -- Campo para soft delete
);
```

#### 4. JSDoc Implementado
```javascript
// src/utils/validators.js (100% documentado)
/**
 * Sanitiza texto para prevenir inyecciones
 * @param {string} input - Texto a sanitizar
 * @returns {string} Texto sanitizado
 */
```

#### 5. Scripts de Testing Manual
```
scripts/
├── test-search.js - Búsquedas de pedidos/clientes
├── test-messages.js - Historial de mensajes
├── test-config.js - Sistema de configuración
├── test-concurrency.js - Pruebas de concurrencia
├── test-button-messages.js - Botones interactivos
├── test-update-estado.js - Actualización estados
└── test-send-message.js - Envío de mensajes
```

---

## 🎬 Siguiente Paso Recomendado

### 🥇 OPCIÓN 1: Quick Win (1-1.5h)
**Completar Tarea 5 - ConfiguracionesPage**
- Backend 100% listo
- Solo crear UI React
- Impacto inmediato
- Fácil de implementar

### 🥈 OPCIÓN 2: Infraestructura (5.5-7h)
**Sprint 4 - Tareas Críticas**
- Health endpoint
- Índices adicionales
- Rotación de logs
- Backup automático

### 🥉 OPCIÓN 3: Continuar Sprint 3 (16-20.5h)
**Completar dashboard avanzado**
- Roles y permisos
- Notificaciones
- Gráficas
- Búsqueda

---

## 📝 Notas Finales (Actualizado 06/11/2025)

Esta auditoría identificó **~12.5 horas de ahorro** en trabajo duplicado. El progreso real del proyecto es **42%** (no 33% como se pensaba inicialmente).

### ✅ Mejoras Implementadas Hoy:

**1. ConfiguracionPage - Verificado 100% completo**
- Backend: configService.js (370 líneas) ✅
- Frontend: ConfiguracionPage.jsx (312 líneas) ✅
- 4 categorías, validación completa, máscaras de seguridad ✅

**2. dbInitService.js - Actualizado completamente**
- ✅ Agregada tabla `Configuraciones` con 11 configs iniciales
- ✅ Agregada tabla `Mensajes` para historial de chats
- ✅ Agregados campos `Version` en Pedidos y Conversaciones
- ✅ Agregado índice `IX_Conversaciones_NumeroTelefono_Version`
- ✅ Total: 8 tablas, 16 índices
- ✅ Inicialización completa en un solo paso
- **Resultado:** Ya no se necesitan ejecutar migraciones 09, 10, 13 para setup inicial

**Archivos más críticos a crear:**
1. ~~`client/src/pages/ConfiguracionesPage.jsx`~~ ✅ **YA EXISTE Y FUNCIONA**
2. `src/routes/health.js` + `healthController.js` (1h)
3. `scripts/backup-database.js` (2h)
4. `.github/workflows/ci.yml` (2-3h)
5. `jest.config.js` + tests/ (5-6h)

**Recomendación actualizada:** Empezar con infraestructura crítica (health endpoint, backup, logs).

---

## 🔧 Detalles Técnicos - dbInitService.js

### Tablas Creadas (8):
1. **Clientes** - Con campo `Activo` (soft delete)
2. **Pedidos** - Con `EstadoImpresion` y `Version` (concurrencia)
3. **Conversaciones** - Con `TimeoutExpiraEn` y `Version` (concurrencia)
4. **TelefonosAtencion** - Datos iniciales incluidos
5. **Usuarios** - Sistema de roles (admin/editor/viewer)
6. **LogAccesos** - Auditoría de accesos
7. **Configuraciones** ⭐ **NUEVO** - 11 configuraciones iniciales
8. **Mensajes** ⭐ **NUEVO** - Historial de chats completo

### Índices Creados (16):
- `IX_Usuarios_Username`, `IX_Usuarios_Activo`
- `IX_LogAccesos_UsuarioID`, `IX_LogAccesos_FechaHora`
- `IX_Pedidos_ClienteID`, `IX_Pedidos_Estado`, `IX_Pedidos_Fecha`, `IX_Pedidos_EstadoImpresion`
- `IX_Conversaciones_UltimaInteraccion`, `IX_Conversaciones_TimeoutExpiraEn`
- `IX_Conversaciones_NumeroTelefono_Version` ⭐ **NUEVO**
- `IX_Configuraciones_Categoria` ⭐ **NUEVO**
- `IX_Mensajes_Telefono_Fecha`, `IX_Mensajes_Fecha` ⭐ **NUEVO**

### Datos Iniciales:
- Usuario admin (password: admin123) ⚠️ Cambiar en producción
- 2 teléfonos de atención
- 11 configuraciones del sistema (PRINTER, WHATSAPP, SYSTEM, NOTIFICATIONS) ⭐ **NUEVO**

---
```
15. Tests unitarios
16. JSDoc
17. ESLint
18. Refactorización
```

### Semana 9-10: Extras
```
19. Manejo de media
20. Sistema métricas
21. Exportación
22. Modo oscuro
```

---

**Última actualización:** 06/11/2025  
**Próxima revisión:** Después de completar Fase Crítica  
**Total de tareas:** 36 (12 completadas, 24 pendientes)
