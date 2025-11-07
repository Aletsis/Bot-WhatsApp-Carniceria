# 📱 Sistema de Notificaciones de Errores - Guía de Uso

**Fecha:** 07/11/2025  
**Versión:** 1.0  
**Sprint:** Sprint 3 - Tarea 7

---

## 📋 Índice

1. [Descripción General](#descripción-general)
2. [Configuración Inicial](#configuración-inicial)
3. [Tipos de Notificaciones](#tipos-de-notificaciones)
4. [Uso del Servicio](#uso-del-servicio)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)
7. [Mantenimiento](#mantenimiento)

---

## 📖 Descripción General

El sistema de notificaciones envía alertas vía WhatsApp a los administradores cuando ocurren errores críticos en el sistema. Incluye:

- ✅ **Throttling inteligente**: Evita spam (max 1 notificación del mismo tipo cada X minutos)
- ✅ **Auditoría completa**: Todas las notificaciones se registran en base de datos
- ✅ **Configuración flexible**: Parámetros ajustables desde la tabla Configuraciones
- ✅ **Resiliente**: No interrumpe el flujo principal si falla el envío
- ✅ **Severidades**: CRITICAL, ERROR, WARNING, INFO

### Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    Servicios Críticos                       │
│  (printingService, whatsappService, dbService)              │
└────────────────────────┬────────────────────────────────────┘
                         │ Error detectado
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              notificationService.notifyAdmins()             │
│  1. Verifica throttling (cache en memoria)                  │
│  2. Obtiene números de WhatsApp de admins activos           │
│  3. Formatea mensaje con emoji + contexto                   │
│  4. Envía vía whatsappService.apiSend()                     │
│  5. Registra en NotificacionesLog (BD)                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                   Administradores                            │
│              Reciben mensaje en WhatsApp                     │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚙️ Configuración Inicial

### 1. Ejecutar Migración

```bash
node scripts/run-migration-19.js
```

**Resultado esperado:**
- ✅ Columna `NumeroWhatsApp` agregada a tabla Usuarios
- ✅ Tabla `NotificacionesLog` creada con 11 campos
- ✅ 3 índices creados para consultas eficientes
- ✅ 3 configuraciones agregadas a tabla Configuraciones

### 2. Configurar Números de WhatsApp

**Via SQL:**
```sql
-- Configurar número de WhatsApp para admin
UPDATE dbo.Usuarios 
SET NumeroWhatsApp = '52XXXXXXXXXX'  -- Sin + ni espacios
WHERE Rol = 'admin' 
  AND UsuarioID = 1;

-- Verificar configuración
SELECT 
    UsuarioID,
    Username,
    Nombre,
    Rol,
    NumeroWhatsApp,
    Activo
FROM dbo.Usuarios
WHERE Rol = 'admin' AND Activo = 1;
```

**Formato del número:**
- ✅ Correcto: `52XXXXXXXXXX` (código país + número sin espacios)
- ❌ Incorrecto: `+52 XXX XXX XXXX`, `52 XXX XXX XXXX`

### 3. Verificar Configuraciones del Sistema

```sql
SELECT * FROM dbo.Configuraciones WHERE Categoria = 'NOTIFICATIONS';
```

**Configuraciones disponibles:**

| Clave | Valor Default | Descripción |
|-------|---------------|-------------|
| `ERROR_NOTIFICATIONS_ENABLED` | `true` | Habilitar/deshabilitar notificaciones |
| `NOTIFICATION_THROTTLE_MINUTES` | `15` | Minutos entre notificaciones del mismo tipo |
| `PRINTING_ERROR_THRESHOLD` | `3` | Errores consecutivos antes de alerta crítica |
| `PRINT_MONITOR_ENABLED` | `true` | Habilitar monitoreo de pedidos no impresos |
| `PRINT_MONITOR_INTERVAL` | `5` | Intervalo del job de monitoreo (minutos) |
| `PRINT_TIMEOUT_MINUTES` | `15` | Minutos de espera antes de notificar pedido no impreso |

**Modificar configuración:**
```sql
UPDATE dbo.Configuraciones 
SET Valor = '30'  -- 30 minutos
WHERE Clave = 'NOTIFICATION_THROTTLE_MINUTES';
```

### 4. Probar el Sistema

```bash
# Probar sin throttling (envía siempre)
node scripts/test-notifications.js --force

# Probar con throttling (como en producción)
node scripts/test-notifications.js
```

---

## 🚨 Tipos de Notificaciones

### 1. PRINTING_ERROR (Impresión)
**Severidad:** ERROR  
**Origen:** `printingService.js`

**Cuándo se envía:**
- Error al imprimir un ticket individual

**Mensaje incluye:**
- Folio del pedido
- ID del pedido
- Nombre del cliente
- Mensaje de error técnico
- Acción recomendada

**Ejemplo:**
```
❌ ALERTA DEL SISTEMA

Tipo: PRINTING ERROR
Severidad: ERROR
Hora: 07/11/2025, 10:30:15

Detalle:
Error al imprimir pedido.

Folio: P-2025-001
Pedido ID: 12345
Cliente: Juan Pérez
Error: Connection timeout to printer

Acción: Verificar estado de la impresora y reintentar manualmente.
```

### 2. PRINTING_RECURRING (Impresión Recurrente)
**Severidad:** CRITICAL  
**Origen:** `printingService.js`

**Cuándo se envía:**
- 3+ errores de impresión consecutivos en 10 minutos

**Mensaje incluye:**
- Cantidad de errores consecutivos
- Último error ocurrido
- IP de la impresora
- Pasos de solución detallados

**Ejemplo:**
```
🔥 ALERTA DEL SISTEMA

Tipo: PRINTING RECURRING
Severidad: CRITICAL
Hora: 07/11/2025, 10:35:00

Detalle:
⚠️ ALERTA CRÍTICA: Se han detectado 5 errores de impresión consecutivos en los últimos 10 minutos.

Último error: Connection timeout

Acción recomendada:
1. Verificar conexión física de la impresora
2. Verificar conexión de red (192.168.1.100)
3. Reiniciar impresora si es necesario
4. Revisar papel y otros consumibles
```

### 3. WHATSAPP_API_ERROR (WhatsApp API)
**Severidad:** CRITICAL / WARNING / ERROR  
**Origen:** `whatsappService.js`

**Sub-tipos:**

#### Error 401 - Token Inválido (CRITICAL)
```
🔥 ALERTA DEL SISTEMA

Tipo: WHATSAPP API ERROR
Severidad: CRITICAL
Hora: 07/11/2025, 10:40:00

Detalle:
Error de autenticación en WhatsApp API.

Error: Token inválido o expirado (401)
Destinatario afectado: 52XXXXXXXXXX

Acción recomendada:
1. Verificar WHATSAPP_TOKEN en configuraciones
2. Renovar token si es necesario
3. Actualizar token en el dashboard
```

#### Error 429 - Rate Limit (WARNING)
```
⚠️ ALERTA DEL SISTEMA

Tipo: WHATSAPP API ERROR
Severidad: WARNING
Hora: 07/11/2025, 10:45:00

Detalle:
Rate limit excedido en WhatsApp API.

El sistema está enviando demasiados mensajes.
Destinatario afectado: 52XXXXXXXXXX

Acción recomendada:
1. Revisar frecuencia de envío de mensajes
2. Implementar cola de mensajes si no existe
3. Contactar soporte de WhatsApp Business
```

#### Error 5xx - Servidor WhatsApp (ERROR)
```
❌ ALERTA DEL SISTEMA

Tipo: WHATSAPP API ERROR
Severidad: ERROR
Hora: 07/11/2025, 10:50:00

Detalle:
Error del servidor de WhatsApp API.

Status: 503
Destinatario afectado: 52XXXXXXXXXX
Error: {"error":{"message":"Service unavailable"}}

Acción: Este es un problema del lado de WhatsApp.
El sistema reintentará automáticamente.
```

### 4. DATABASE_ERROR (Base de Datos)
**Severidad:** CRITICAL  
**Origen:** `dbService.js`

**Cuándo se envía:**
- Después de 5 intentos fallidos de reconexión

**Mensaje incluye:**
- Servidor y puerto de BD
- Nombre de la base de datos
- Cantidad de intentos
- Pasos de diagnóstico

**Ejemplo - Conexión Fallida:**
```
🔥 ALERTA DEL SISTEMA

Tipo: DATABASE ERROR
Severidad: CRITICAL
Hora: 07/11/2025, 11:00:00

Detalle:
Error crítico de conexión a base de datos.

No se pudo reconectar después de 5 intentos.

Servidor: localhost:1433
Base de datos: CarniceriaDB

Acción recomendada:
1. Verificar que SQL Server esté corriendo
2. Verificar credenciales de acceso
3. Verificar firewall y conectividad de red
4. Reiniciar el servidor de aplicación
```

**Ejemplo - Conexión Restaurada:**
```
🔥 ALERTA DEL SISTEMA

Tipo: DATABASE ERROR
Severidad: CRITICAL
Hora: 07/11/2025, 11:05:00

Detalle:
✅ Conexión a base de datos restaurada exitosamente.

La aplicación se ha reconectado después de 3 intentos.
El sistema está operativo nuevamente.
```

### 5. ORDER_NOT_PRINTED (Pedidos Sin Imprimir)
**Severidad:** WARNING (automática) o CRITICAL (si > 30 minutos)  
**Origen:** `printMonitorService.js` (Job automatizado cada 5 minutos)

**Cuándo se dispara:**
- Un pedido tiene `EstadoImpresion` = 'Pendiente' o 'Error'
- Ha pasado más de X minutos desde su creación (configurable con `PRINT_TIMEOUT_MINUTES`, por defecto 15)
- No ha sido notificado anteriormente (`NotificacionImpresionEnviada IS NULL`)

**Metadata incluida:**
- `pedidoID`: ID del pedido sin imprimir
- `folio`: Folio del pedido (ej: "PED-20250107-001")
- `cliente`: Nombre del cliente
- `telefono`: Teléfono del cliente
- `minutosEspera`: Tiempo transcurrido sin imprimir
- `estadoImpresion`: Estado actual ('Pendiente' o 'Error')
- `fecha`: Fecha de creación del pedido

**Ejemplo de mensaje WhatsApp:**
```
⚠️ ALERTA: Pedido sin imprimir

📄 Pedido PED-20250107-001 lleva 18 minutos sin imprimir

👤 Cliente: María González
📱 Teléfono: 8141234567
🕐 Estado: Pendiente
⏰ Esperando desde: 2025-01-07 14:30:00

🔧 Acción recomendada:
- Verificar conexión con impresora
- Revisar cola de impresión
- Imprimir manualmente si es necesario
```

**Configuraciones relacionadas:**
```sql
-- Habilitar/deshabilitar monitoreo
UPDATE Configuraciones SET Valor = 'true' WHERE Clave = 'PRINT_MONITOR_ENABLED';

-- Intervalo del job (minutos)
UPDATE Configuraciones SET Valor = '5' WHERE Clave = 'PRINT_MONITOR_INTERVAL';

-- Tiempo de espera antes de alertar (minutos)
UPDATE Configuraciones SET Valor = '15' WHERE Clave = 'PRINT_TIMEOUT_MINUTES';
```

**Queries útiles:**
```sql
-- Ver pedidos que serían notificados ahora
SELECT 
  PedidoID,
  Folio,
  EstadoImpresion,
  Fecha,
  DATEDIFF(MINUTE, Fecha, SYSDATETIME()) AS MinutosSinImprimir,
  NotificacionImpresionEnviada
FROM Pedidos
WHERE EstadoImpresion IN ('Pendiente', 'Error')
  AND DATEDIFF(MINUTE, Fecha, SYSDATETIME()) > 15
  AND NotificacionImpresionEnviada IS NULL
ORDER BY Fecha;

-- Resetear flag de notificación (para testing)
UPDATE Pedidos 
SET NotificacionImpresionEnviada = NULL 
WHERE PedidoID = 123;

-- Ver historial de notificaciones de pedidos no impresos
SELECT 
  TipoError,
  Severidad,
  Mensaje,
  Estado,
  CreadoEn
FROM NotificacionesLog
WHERE TipoError = 'ORDER_NOT_PRINTED'
ORDER BY CreadoEn DESC;
```

**Testing:**
```bash
# Ejecutar verificación manual (sin esperar 15 minutos)
node scripts/test-print-monitor.js --force

# Ver estadísticas actuales
# (Usar API /admin/notifications/stats cuando esté disponible)
```

### 6. WEBHOOK_INVALID (Webhook Inválido)
**Severidad:** WARNING  
**Origen:** `webhookController.js` (pendiente de integrar)

**Cuándo se enviará:**
- Intento de acceso con firma inválida (posible ataque)

---

## 💻 Uso del Servicio

### Importar el Servicio

```javascript
import { notifyAdmins } from './services/notificationService.js';
```

### Enviar Notificación Básica

```javascript
await notifyAdmins(
  'PRINTING_ERROR',  // Tipo de error
  'Error al imprimir pedido #12345. Impresora no responde.'  // Mensaje
);
```

### Enviar Notificación con Opciones

```javascript
await notifyAdmins(
  'DATABASE_ERROR',
  'Error de conexión a la base de datos.\nServidor: localhost:1433',
  {
    severidad: 'CRITICAL',  // CRITICAL, ERROR, WARNING, INFO
    metadata: {
      server: 'localhost',
      port: 1433,
      database: 'CarniceriaDB',
      attempts: 5
    },
    forceNotify: false  // true para ignorar throttling
  }
);
```

### Parámetros

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `tipoError` | string | ✅ | Identificador del tipo de error |
| `mensaje` | string | ✅ | Mensaje descriptivo del error |
| `options` | object | ❌ | Opciones adicionales |
| `options.severidad` | string | ❌ | CRITICAL, ERROR, WARNING, INFO (default: ERROR) |
| `options.metadata` | object | ❌ | Datos adicionales en formato JSON |
| `options.forceNotify` | boolean | ❌ | Ignorar throttling (default: false) |

### Consultar Historial

```javascript
import { getNotificationHistory } from './services/notificationService.js';

// Últimas 10 notificaciones
const history = await getNotificationHistory({ limit: 10 });

// Filtrar por tipo
const printErrors = await getNotificationHistory({ 
  tipoError: 'PRINTING_ERROR',
  limit: 20
});

// Filtrar por estado
const failedNotifications = await getNotificationHistory({ 
  estado: 'ERROR',
  limit: 50
});
```

### Obtener Estadísticas

```javascript
import { getNotificationStats } from './services/notificationService.js';

const stats = await getNotificationStats();

console.log('Total notificaciones (7 días):', stats.general.TotalNotificaciones);
console.log('Enviadas:', stats.general.Enviadas);
console.log('Errores:', stats.general.Errores);
console.log('Throttled:', stats.general.Throttled);

// Por tipo de error
stats.porTipo.forEach(tipo => {
  console.log(`${tipo.TipoError}: ${tipo.Cantidad}`);
});
```

---

## 🧪 Testing

### Script de Prueba

El archivo `scripts/test-notifications.js` incluye 4 escenarios de prueba:

```bash
# Test con throttling (producción)
node scripts/test-notifications.js

# Test sin throttling (desarrollo/testing)
node scripts/test-notifications.js --force
```

### Escenarios de Prueba

1. **Test 1:** Error de impresión individual
2. **Test 2:** Errores recurrentes (CRITICAL)
3. **Test 3:** Error de base de datos
4. **Test 4:** Pedido no impreso (WARNING)

### Output Esperado

```
╔════════════════════════════════════════════╗
║   TEST: SISTEMA DE NOTIFICACIONES          ║
╚════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 TEST 1: Notificación de Error de Impresión
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Resultado Test 1: ✅ Enviado

...

╔════════════════════════════════════════════╗
║   ✅ TESTS COMPLETADOS                     ║
╚════════════════════════════════════════════╝
```

### Testing Manual

```javascript
// En cualquier servicio
import { notifyAdmins } from '../services/notificationService.js';

// Enviar notificación de prueba
await notifyAdmins(
  'TEST_ERROR',
  'Esta es una notificación de prueba.',
  {
    severidad: 'INFO',
    forceNotify: true  // Ignorar throttling
  }
);
```

---

## 🔧 Troubleshooting

### Problema: Notificaciones No se Envían

**Síntoma:** `notifyAdmins()` retorna `false`, no llegan mensajes

**Diagnóstico:**

1. **Verificar configuración habilitada:**
```sql
SELECT Valor FROM Configuraciones WHERE Clave = 'ERROR_NOTIFICATIONS_ENABLED';
-- Debe ser 'true'
```

2. **Verificar administradores con WhatsApp:**
```sql
SELECT 
    UsuarioID, Username, NumeroWhatsApp, Activo
FROM Usuarios
WHERE Rol = 'admin' 
  AND Activo = 1
  AND NumeroWhatsApp IS NOT NULL;
-- Debe retornar al menos 1 registro
```

3. **Verificar throttling:**
```sql
SELECT TOP 5 
    TipoError, Estado, CreadoEn
FROM NotificacionesLog
ORDER BY CreadoEn DESC;
-- Si Estado = 'THROTTLED', el sistema está bloqueando por spam
```

4. **Revisar logs del servidor:**
```bash
# Buscar errores de notificación
grep -i "notification" logs/app.log
```

**Soluciones:**

```sql
-- Habilitar notificaciones
UPDATE Configuraciones 
SET Valor = 'true' 
WHERE Clave = 'ERROR_NOTIFICATIONS_ENABLED';

-- Agregar WhatsApp a admin
UPDATE Usuarios 
SET NumeroWhatsApp = '52XXXXXXXXXX' 
WHERE UsuarioID = 1 AND Rol = 'admin';

-- Reducir throttle para testing
UPDATE Configuraciones 
SET Valor = '1'  -- 1 minuto
WHERE Clave = 'NOTIFICATION_THROTTLE_MINUTES';
```

### Problema: Notificaciones Duplicadas

**Síntoma:** Múltiples mensajes del mismo error en poco tiempo

**Causa:** Throttling deshabilitado o threshold muy bajo

**Solución:**

```sql
-- Aumentar tiempo de throttling
UPDATE Configuraciones 
SET Valor = '30'  -- 30 minutos
WHERE Clave = 'NOTIFICATION_THROTTLE_MINUTES';

-- Aumentar threshold de errores de impresión
UPDATE Configuraciones 
SET Valor = '5'  -- 5 errores
WHERE Clave = 'PRINTING_ERROR_THRESHOLD';
```

### Problema: Mensajes No Formateados

**Síntoma:** Mensajes sin estructura, sin emojis, texto plano

**Causa:** WhatsApp no soporta formato Markdown en algunos clientes

**Solución:** Esto es comportamiento normal. WhatsApp Business API envía texto plano. Los emojis deberían verse correctamente. Si no se ven, el problema es del cliente de WhatsApp.

### Problema: Error "Token inválido"

**Síntoma:** Notificaciones fallan con error 401

**Causa:** WHATSAPP_TOKEN expirado o inválido

**Solución:**

1. Renovar token en Meta Business Manager
2. Actualizar en base de datos:
```sql
UPDATE Configuraciones 
SET Valor = 'NUEVO_TOKEN_AQUI' 
WHERE Clave = 'WHATSAPP_TOKEN';
```
3. O actualizar en archivo `.env` (requiere reiniciar app)

---

## 🧹 Mantenimiento

### Limpieza de Logs Antiguos

**Automático (recomendado):**

Agregar job en `app.js`:

```javascript
import { cleanOldNotifications } from './services/notificationService.js';
import cron from 'node-cron';

// Limpiar notificaciones antiguas cada domingo a las 3:00 AM
cron.schedule('0 3 * * 0', async () => {
  logger.info('[Maintenance] Iniciando limpieza de notificaciones...');
  const deleted = await cleanOldNotifications(90);  // 90 días
  logger.info('[Maintenance] %d notificaciones eliminadas', deleted);
});
```

**Manual:**

```javascript
import { cleanOldNotifications } from './services/notificationService.js';

// Eliminar notificaciones de más de 90 días
const deleted = await cleanOldNotifications(90);
console.log(`${deleted} notificaciones eliminadas`);
```

**Via SQL:**

```sql
-- Eliminar notificaciones de más de 3 meses
DELETE FROM NotificacionesLog
WHERE CreadoEn < DATEADD(month, -3, SYSDATETIME());
```

### Monitoreo de Performance

```sql
-- Estadísticas de notificaciones por día
SELECT 
    CAST(CreadoEn AS DATE) AS Fecha,
    COUNT(*) AS Total,
    SUM(CASE WHEN Estado = 'ENVIADO' THEN 1 ELSE 0 END) AS Enviadas,
    SUM(CASE WHEN Estado = 'ERROR' THEN 1 ELSE 0 END) AS Errores,
    SUM(CASE WHEN Estado = 'THROTTLED' THEN 1 ELSE 0 END) AS Bloqueadas
FROM NotificacionesLog
WHERE CreadoEn >= DATEADD(day, -30, SYSDATETIME())
GROUP BY CAST(CreadoEn AS DATE)
ORDER BY Fecha DESC;
```

```sql
-- Top 5 tipos de error más frecuentes
SELECT TOP 5
    TipoError,
    COUNT(*) AS Cantidad,
    MAX(CreadoEn) AS UltimaOcurrencia
FROM NotificacionesLog
WHERE CreadoEn >= DATEADD(day, -7, SYSDATETIME())
GROUP BY TipoError
ORDER BY Cantidad DESC;
```

### Optimización de Índices

```sql
-- Verificar fragmentación de índices
SELECT 
    i.name AS IndexName,
    s.avg_fragmentation_in_percent AS Fragmentation
FROM sys.dm_db_index_physical_stats(
    DB_ID(), 
    OBJECT_ID('NotificacionesLog'), 
    NULL, NULL, 'LIMITED'
) s
INNER JOIN sys.indexes i ON s.object_id = i.object_id AND s.index_id = i.index_id
WHERE s.avg_fragmentation_in_percent > 10;

-- Si fragmentación > 30%, reorganizar índice
ALTER INDEX IX_NotificacionesLog_TipoError_CreadoEn 
ON NotificacionesLog REORGANIZE;

-- Si fragmentación > 50%, reconstruir índice
ALTER INDEX IX_NotificacionesLog_TipoError_CreadoEn 
ON NotificacionesLog REBUILD;
```

---

## 📚 Referencias

- **Código fuente:** `src/services/notificationService.js`
- **Migración:** `migrations/19_notificaciones_admin.sql`
- **Testing:** `scripts/test-notifications.js`
- **WhatsApp Business API:** https://developers.facebook.com/docs/whatsapp/cloud-api
- **Sprint 3 - Tarea 7:** `docs/TAREAS_PENDIENTES.md`

---

## 🤝 Soporte

Para problemas o preguntas:

1. Revisar logs: `logs/app.log`
2. Consultar tabla: `SELECT TOP 10 * FROM NotificacionesLog ORDER BY CreadoEn DESC`
3. Ejecutar tests: `node scripts/test-notifications.js --force`
4. Revisar configuraciones: `SELECT * FROM Configuraciones WHERE Categoria = 'NOTIFICATIONS'`

---

**Última actualización:** 07/11/2025  
**Autor:** Sistema Bot-WhatsApp-Carniceria  
**Versión:** 1.0
