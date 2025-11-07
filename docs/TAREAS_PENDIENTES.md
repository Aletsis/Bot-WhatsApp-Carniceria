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

## 📈 Progreso General del Proyecto

```
Sprint 1: ████████████████████ 100% (4/4)
Sprint 2: ████████████████████ 100% (4/4)
Sprint 3: ████████░░░░░░░░░░░░  33% (4/12)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL:    ██████████████░░░░░░  60% (12/20)
```

**Estimación para 100%:** 16-20.5 horas adicionales

---

**Última actualización:** 06/11/2025  
**Próxima revisión:** Después de completar Fase 1
