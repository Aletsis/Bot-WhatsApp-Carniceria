# 📋 Tareas Pendientes - Resumen Ejecutivo

**Fecha de revisión:** 06/11/2025  
**Sprints revisados:** Sprint 1, Sprint 2, Sprint 3

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
**Estado:** 🟡 **33% COMPLETADO** (4 de 12 tareas)

#### ✅ Completadas (4)
- ✅ Tarea 1: Concurrencia y Transacciones (optimistic locking)
- ✅ Tarea 2: Verificación de Firma de Webhook
- ✅ Tarea 3: Notificaciones Automáticas a Clientes
- ✅ Tarea 4: Historial de Chats con Persistencia

#### ❌ Pendientes (8)
- ❌ Tarea 5: Página de Configuración
- ❌ Tarea 6: Rol de Usuario Supervisor
- ❌ Tarea 7: Notificaciones de Errores a Administrador
- ❌ Tarea 8: Notificación de Pedido No Impreso
- ❌ Tarea 9: Gráficas de Estadísticas
- ❌ Tarea 10: Búsqueda y Filtros Avanzados
- ❌ Tarea 11: Exportación de Reportes
- ❌ Tarea 12: Modo Oscuro

---

## 🔴 TAREAS CRÍTICAS PENDIENTES

### ❌ Tarea 5: Página de Configuración del Sistema
**Prioridad:** 🔥 ALTA  
**Estimación:** 3-4 horas

**Objetivo:** Permitir configurar el sistema desde el dashboard sin editar archivos

**Subtareas:**
- [ ] Crear tabla `Configuraciones` en BD
- [ ] Migración con valores iniciales
- [ ] Service `configService.js` para leer/actualizar config
- [ ] Endpoints `/api/configuraciones` (GET/PUT) - solo admins
- [ ] Página `/configuraciones` en dashboard React
- [ ] Secciones:
  - 🖨️ Impresora (host, puerto, habilitada)
  - 📱 WhatsApp (phone number ID, token)
  - ⚙️ Sistema (timeouts, límites)
- [ ] Validación de campos (IP, puertos, tokens)
- [ ] Máscara para tokens sensibles (últimos 4 chars)
- [ ] Reinicio de servicios al cambiar config

**Beneficios:**
- Configuración sin necesidad de acceso al servidor
- Cambios sin reiniciar el servidor
- Historial de cambios de configuración
- Validación centralizada

**Archivos a Crear/Modificar:**
- `migrations/14_configuraciones.sql`
- `src/services/configService.js`
- `src/controllers/dashboardController.js`
- `src/routes/dashboard.js`
- `client/src/pages/ConfiguracionesPage.jsx`

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

#### ❌ Tarea 14: Optimización de Base de Datos
**Prioridad:** 🔴 CRÍTICA  
**Estimación:** 2-3 horas

**Objetivo:** Agregar índices para mejorar performance

**Subtareas:**
- [ ] Análisis de queries lentas (SQL Server Query Store)
- [ ] Índice en `Pedidos.Folio` (búsquedas frecuentes)
- [ ] Índice en `Pedidos.FechaPedido` (filtros de fecha)
- [ ] Índice en `Clientes.NumeroTelefono` (joins frecuentes)
- [ ] Índice compuesto en `Conversaciones(NumeroTelefono, Estado)`
- [ ] Índice en `Mensajes.Contenido` (full-text search)
- [ ] Actualizar estadísticas de BD
- [ ] Documentar estrategia de indexación

**Migración:**
- `migrations/17_indices_optimizacion.sql`

**Beneficios:**
- ⚡ Queries 5-10x más rápidas
- 📊 Mejor rendimiento en dashboard
- 🔍 Búsqueda instantánea

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

#### ❌ Tarea 21: Tests Unitarios Completos
**Prioridad:** 🟢 ALTA (Calidad)  
**Estimación:** 5-6 horas

**Objetivo:** Cobertura de código >80%

**Subtareas:**
- [ ] Configurar Jest + Supertest
- [ ] Tests para `sessionService.js`
- [ ] Tests para `whatsappService.js`
- [ ] Tests para `messageService.js`
- [ ] Tests para endpoints de API
- [ ] Tests para componentes React (React Testing Library)
- [ ] Mock de BD y API de WhatsApp
- [ ] Script `npm test` con coverage report

**Archivos:**
- `jest.config.js`
- `tests/unit/` (directorio nuevo)
- `tests/integration/` (directorio nuevo)
- `package.json` (scripts de test)

---

#### ❌ Tarea 22: JSDoc Completo
**Prioridad:** 🟢 MEDIA (Calidad)  
**Estimación:** 3-4 horas

**Objetivo:** Documentación inline de todo el código

**Subtareas:**
- [ ] JSDoc en todos los servicios
- [ ] JSDoc en todos los controllers
- [ ] JSDoc en funciones helpers
- [ ] Tipos de parámetros y returns
- [ ] Ejemplos de uso
- [ ] Generar HTML docs con `jsdoc`
- [ ] Configurar VSCode para IntelliSense

**Archivos:**
- Todos los `.js` en `src/`
- `jsdoc.config.json`

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

#### ❌ Tarea 26: Soft Delete para Clientes
**Prioridad:** 🟢 BAJA  
**Estimación:** 1.5 horas

**Objetivo:** No eliminar datos, solo marcar como inactivos

**Subtareas:**
- [ ] Agregar campo `EliminadoEn DATETIME2` a tabla Clientes
- [ ] Agregar campo `EliminadoPor INT` (FK a Usuarios)
- [ ] Modificar endpoint DELETE a soft delete
- [ ] Filtrar clientes eliminados en queries
- [ ] UI para "Papelera" de clientes eliminados
- [ ] Botón "Restaurar" para clientes eliminados

**Archivos:**
- `migrations/19_soft_delete_clientes.sql`
- `src/controllers/dashboardController.js`
- `client/src/pages/ClientesPage.jsx`

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

### Sprint 3 (Original)
| Prioridad | Tareas | Tiempo Estimado |
|-----------|--------|-----------------|
| 🔥 ALTA | 1 | 3-4 horas |
| 🟡 MEDIA | 5 | 10.5-13 horas |
| 🟢 BAJA | 2 | 2.5-3.5 horas |
| **Subtotal Sprint 3** | **8** | **16-20.5 horas** |

### Sprint 4 (Nuevo)
| Prioridad | Tareas | Tiempo Estimado |
|-----------|--------|-----------------|
| 🔴 CRÍTICA | 4 | 6.5-8 horas |
| 🟡 ALTA | 4 | 10-14 horas |
| 🟢 MEDIA-ALTA | 4 | 11-14 horas |
| 🟢 BAJA | 4 | 5.5-6.5 horas |
| **Subtotal Sprint 4** | **16** | **33-42.5 horas** |

### TOTAL GENERAL
| Sprint | Tareas Pendientes | Tiempo Estimado |
|--------|-------------------|-----------------|
| Sprint 3 | 8 | 16-20.5 horas |
| Sprint 4 | 16 | 33-42.5 horas |
| **TOTAL** | **24** | **49-63 horas** |

---

## 🎯 Roadmap Actualizado con Prioridades

### 🔴 FASE CRÍTICA (Sprint 4 - Infraestructura)
**Estimación:** 6.5-8 horas

**Orden sugerido:**
1. **Tarea 13:** Endpoint /health (1h)
2. **Tarea 14:** Optimización BD con índices (2-3h)
3. **Tarea 15:** Rotación de logs (1.5h)
4. **Tarea 16:** Backup automático (2h)

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

## 📈 Progreso General Actualizado

```
Sprint 1: ████████████████████ 100% (4/4)
Sprint 2: ████████████████████ 100% (4/4)
Sprint 3: ████████░░░░░░░░░░░░  33% (4/12)
Sprint 4: ░░░░░░░░░░░░░░░░░░░░   0% (0/16)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL:    ███████░░░░░░░░░░░░░  33% (12/36)
```

**Estimación para 100%:** 49-63 horas adicionales

---

## 🎯 Recomendación de Implementación

### Semana 1-2: Infraestructura Crítica
```
Prioridad MÁXIMA - No se puede saltar
1. Endpoint /health
2. Índices en BD  
3. Rotación de logs
4. Backup automático
```

### Semana 3: Configuración y Roles
```
5. Página de configuración
6. Rol supervisor
7. Toast notifications
```

### Semana 4: Tiempo Real y Monitoreo
```
8. WebSockets
9. Notificaciones admin
10. Alertas impresión
```

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
