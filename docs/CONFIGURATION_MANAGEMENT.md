# 📝 Sistema de Gestión de Configuraciones

## Descripción General

El sistema de gestión de configuraciones permite a los administradores modificar parámetros del sistema a través de una interfaz web, sin necesidad de editar archivos `.env` o reiniciar el servidor.

## Características Principales

### ✅ Gestión Centralizada
- Todas las configuraciones en base de datos SQL Server
- Interfaz web intuitiva organizada por categorías
- Validaciones automáticas según tipo de dato
- Enmascaramiento de valores sensibles (secrets)

### 🔒 Seguridad
- Acceso restringido a usuarios con rol `admin`
- Secrets enmascarados en respuestas API (`****xxxx`)
- Validación de entrada antes de guardar
- Flag `Editable` para proteger configuraciones críticas

### 📊 Categorías de Configuración

#### PRINTER (Impresora)
- `PRINTER_ENABLED`: Habilitar/deshabilitar impresión automática
- `PRINTER_HOST`: Dirección IP de la impresora
- `PRINTER_PORT`: Puerto de la impresora

#### WHATSAPP (WhatsApp Business API)
- `WHATSAPP_TOKEN`: Token de acceso de la API
- `WHATSAPP_PHONE_NUMBER_ID`: ID del número de teléfono
- `WEBHOOK_VERIFY_TOKEN`: Token de verificación del webhook
- `WHATSAPP_APP_SECRET`: Secret de la aplicación

#### SYSTEM (Sistema)
- `SESSION_TIMEOUT`: Tiempo de expiración de sesión (minutos)
- `CONVERSATION_TIMEOUT`: Tiempo de inactividad para terminar conversación (minutos)
- `SESSION_TTL_MINUTES`: TTL de sesiones en base de datos (minutos)

#### NOTIFICATIONS (Notificaciones)
- `NOTIFICATIONS_ENABLED`: Habilitar/deshabilitar notificaciones automáticas a clientes

## Arquitectura

### Base de Datos

```sql
CREATE TABLE Configuraciones (
    ConfigID INT PRIMARY KEY IDENTITY(1,1),
    Clave NVARCHAR(100) NOT NULL UNIQUE,
    Valor NVARCHAR(500) NOT NULL,
    Descripcion NVARCHAR(500),
    Tipo NVARCHAR(50) DEFAULT 'string',
    Categoria NVARCHAR(50),
    Editable BIT DEFAULT 1,
    FechaCreacion DATETIME DEFAULT GETDATE(),
    FechaActualizacion DATETIME DEFAULT GETDATE()
);
```

**Tipos de Dato:**
- `string`: Texto libre
- `number`: Números enteros positivos
- `boolean`: `'true'` o `'false'` (como string)
- `secret`: Valores sensibles (tokens, passwords)

### Backend (Node.js)

#### Servicio: `configService.js`

```javascript
// Obtener todas las configuraciones agrupadas por categoría
const configs = await configService.getAllConfigs();
// Retorna: { PRINTER: [...], WHATSAPP: [...], ... }

// Obtener una configuración específica
const config = await configService.getConfig('PRINTER_ENABLED');
// Retorna: { ConfigID, Clave, Valor, ... }

// Actualizar una configuración
await configService.updateConfig('PRINTER_HOST', '192.168.1.100');

// Actualizar múltiples configuraciones
const resultados = await configService.updateMultipleConfigs([
  { clave: 'PRINTER_ENABLED', valor: 'true' },
  { clave: 'PRINTER_PORT', valor: '9100' }
]);
// Retorna: { exitosas: 2, fallidas: 0, detalles: [...] }

// Obtener configuraciones por categoría
const printerConfigs = await configService.getConfigsByCategory('PRINTER');
```

#### Validaciones Automáticas

```javascript
// Boolean: Solo acepta 'true' o 'false'
validarValor('true', 'boolean', 'PRINTER_ENABLED'); // ✅

// Number: Enteros positivos
validarValor('9100', 'number', 'PRINTER_PORT'); // ✅
validarValor('-10', 'number', 'PRINTER_PORT'); // ❌ Error

// Secret: No vacío, no enmascarado
validarValor('my-secret-token', 'secret', 'WHATSAPP_TOKEN'); // ✅
validarValor('****1234', 'secret', 'WHATSAPP_TOKEN'); // ❌ Error

// String con validación especial
validarValor('192.168.1.100', 'string', 'PRINTER_HOST'); // ✅ IP válida
validarValor('invalid-ip', 'string', 'PRINTER_HOST'); // ❌ Error
```

#### Endpoints API

```
GET /api/dashboard/configuraciones
  Descripción: Obtiene todas las configuraciones agrupadas por categoría
  Autenticación: Requerida (admin)
  Respuesta: { success: true, data: { PRINTER: [...], ... } }

PUT /api/dashboard/configuraciones
  Descripción: Actualiza múltiples configuraciones
  Autenticación: Requerida (admin)
  Body: { configuraciones: [{ clave, valor }, ...] }
  Respuesta: { success: true, data: { exitosas, fallidas, detalles } }

GET /api/dashboard/configuraciones/:categoria
  Descripción: Obtiene configuraciones de una categoría específica
  Autenticación: Requerida (admin)
  Parámetros: categoria (PRINTER, WHATSAPP, SYSTEM, NOTIFICATIONS)
  Respuesta: { success: true, data: [...] }
```

### Frontend (React)

#### Componente: `ConfiguracionPage.jsx`

**Características:**
- Organización por categorías con tarjetas separadas
- Inputs adaptados al tipo de dato:
  - `boolean`: Checkbox con label "Activado/Desactivado"
  - `number`: Input numérico con validación de rango
  - `secret`: Input tipo password
  - `string`: Input de texto
- Validación en tiempo real
- Mensajes de éxito/error
- Botones Guardar/Cancelar por categoría
- Indicadores de tipo de dato y estado editable

**Ejemplo de Uso:**

```jsx
// Carga automática al montar
useEffect(() => {
  cargarConfiguraciones();
}, []);

// Manejo de cambios
const handleInputChange = (clave, valor) => {
  setModifiedConfigs(prev => ({
    ...prev,
    [clave]: valor
  }));
};

// Guardar cambios
const handleGuardarCategoria = async (categoria) => {
  const cambios = configsCategoria
    .filter(config => modifiedConfigs[config.Clave] !== undefined)
    .map(config => ({
      clave: config.Clave,
      valor: modifiedConfigs[config.Clave]
    }));
  
  await configuracionesService.update(cambios);
};
```

## Flujo de Uso

### 1. Acceso a la Página
1. Usuario admin inicia sesión
2. Navega a "Configuración" en el sidebar
3. Sistema carga todas las configuraciones

### 2. Modificación de Configuraciones
1. Usuario modifica uno o más valores en una categoría
2. Botón "Guardar Cambios" se habilita
3. Usuario hace clic en "Guardar Cambios"
4. Sistema valida los cambios
5. Sistema actualiza la base de datos
6. Sistema muestra mensaje de éxito
7. Cambios se reflejan inmediatamente

### 3. Cancelación de Cambios
1. Usuario hace clic en "Cancelar"
2. Sistema restaura valores originales
3. Botón "Guardar Cambios" se deshabilita

## Ejemplos de Uso

### Cambiar IP de la Impresora

```javascript
// Frontend
await configuracionesService.update([
  { clave: 'PRINTER_HOST', valor: '192.168.1.200' }
]);

// Backend (automático)
await configService.updateConfig('PRINTER_HOST', '192.168.1.200');
// Valida formato IP: xxx.xxx.xxx.xxx
// Actualiza base de datos
// Retorna éxito
```

### Habilitar/Deshabilitar Notificaciones

```javascript
// Frontend
await configuracionesService.update([
  { clave: 'NOTIFICATIONS_ENABLED', valor: 'false' }
]);

// Backend (automático)
await configService.updateConfig('NOTIFICATIONS_ENABLED', 'false');
// Valida que sea 'true' o 'false'
// Actualiza base de datos
// Notificaciones se desactivan inmediatamente
```

### Actualizar Token de WhatsApp

```javascript
// Frontend (input tipo password)
await configuracionesService.update([
  { clave: 'WHATSAPP_TOKEN', valor: 'EAABCxyz...' }
]);

// Backend
// 1. Valida que no esté vacío
// 2. Valida que no sea valor enmascarado (****xxxx)
// 3. Actualiza base de datos
// 4. En siguientes cargas, se muestra enmascarado: ****xyz...
```

## Seguridad

### Enmascaramiento de Secrets

```javascript
// Valor en base de datos: "EAABCxyzABC123XYZ789"
// Valor en respuesta API: "****XYZ789" (últimos 4 caracteres)

// Al intentar actualizar con valor enmascarado:
await configService.updateConfig('WHATSAPP_TOKEN', '****XYZ789');
// ❌ Error: "No se puede actualizar con valor enmascarado"

// Correcto:
await configService.updateConfig('WHATSAPP_TOKEN', 'nuevo-token-completo');
// ✅ Éxito
```

### Control de Acceso

```javascript
// Middleware en rutas
router.get('/configuraciones', requireRole('admin'), getConfiguraciones);
router.put('/configuraciones', requireRole('admin'), updateConfiguraciones);

// Verificación adicional en controlador
if (req.session.user.rol !== 'admin') {
  return res.status(403).json({ 
    error: 'Acceso denegado. Solo administradores.' 
  });
}
```

### Flag Editable

```sql
-- Configuración no editable (protegida)
UPDATE Configuraciones 
SET Editable = 0 
WHERE Clave = 'WHATSAPP_PHONE_NUMBER_ID';

-- Al intentar editar:
-- ❌ Error: "La configuración no es editable"
```

## Validaciones Especiales

### IP de Impresora

```javascript
// Formato válido: xxx.xxx.xxx.xxx
'192.168.1.100' // ✅
'10.0.0.1'      // ✅
'192.168.1'     // ❌ Incompleto
'999.999.999.999' // ❌ Valores fuera de rango
```

### Puerto de Impresora

```javascript
// Rango válido: 1-65535
'9100'  // ✅
'80'    // ✅
'0'     // ❌ Fuera de rango
'70000' // ❌ Fuera de rango
```

### Timeout de Sesión

```javascript
// Valores razonables: 5-60 minutos
'15'   // ✅
'30'   // ✅
'0'    // ❌ Negativo/cero
'-10'  // ❌ Negativo
```

## Logging

```javascript
// Logs de información
logger.info('✅ Configuraciones obtenidas por admin: %s', username);
logger.info('🔧 Actualizando %d configuraciones por: %s', count, username);

// Logs de debug
logger.debug('✅ Configuraciones de %s obtenidas por: %s', categoria, username);

// Logs de error
logger.error('❌ Error obteniendo configuraciones:', err.message);
logger.error('❌ Error actualizando configuraciones:', err.message);

// Logs de advertencia
logger.warn('⚠️ Algunas configuraciones fallaron: %d/%d', fallidas, total);
```

## Manejo de Errores

### Errores de Validación

```javascript
// Error: Tipo inválido
{
  success: false,
  error: "Valor inválido para boolean: maybe"
}

// Error: IP inválida
{
  success: false,
  error: "IP inválida: 192.168"
}

// Error: Secret vacío
{
  success: false,
  error: "Los secrets no pueden estar vacíos"
}
```

### Errores de Autorización

```javascript
{
  success: false,
  error: "Acceso denegado. Solo administradores pueden modificar configuraciones."
}
```

### Errores Parciales (Multi-Status)

```javascript
// Código HTTP 207
{
  success: true,
  message: "2 configuraciones actualizadas, 1 fallaron",
  data: {
    exitosas: 2,
    fallidas: 1,
    detalles: [
      { clave: 'PRINTER_HOST', exito: true },
      { clave: 'PRINTER_PORT', exito: true },
      { clave: 'PRINTER_ENABLED', exito: false, error: 'Valor inválido' }
    ]
  }
}
```

## Testing

### Probar Carga de Configuraciones

```bash
# Como admin
curl -X GET http://localhost:3000/api/dashboard/configuraciones \
  -H "Cookie: connect.sid=..." \
  -H "Content-Type: application/json"

# Respuesta esperada:
{
  "success": true,
  "data": {
    "PRINTER": [...],
    "WHATSAPP": [...],
    "SYSTEM": [...],
    "NOTIFICATIONS": [...]
  }
}
```

### Probar Actualización

```bash
curl -X PUT http://localhost:3000/api/dashboard/configuraciones \
  -H "Cookie: connect.sid=..." \
  -H "Content-Type: application/json" \
  -d '{
    "configuraciones": [
      { "clave": "PRINTER_ENABLED", "valor": "true" },
      { "clave": "PRINTER_HOST", "valor": "192.168.1.100" }
    ]
  }'

# Respuesta esperada:
{
  "success": true,
  "message": "2 configuraciones actualizadas correctamente",
  "data": {
    "exitosas": 2,
    "fallidas": 0,
    "detalles": [...]
  }
}
```

### Probar Validaciones

```javascript
// Test: Boolean inválido
await configService.updateConfig('PRINTER_ENABLED', 'yes');
// ❌ Error: "Valor inválido para boolean: yes"

// Test: IP inválida
await configService.updateConfig('PRINTER_HOST', '999.999.999.999');
// ❌ Error: "IP inválida: 999.999.999.999"

// Test: Secret enmascarado
await configService.updateConfig('WHATSAPP_TOKEN', '****1234');
// ❌ Error: "No se puede actualizar con valor enmascarado"
```

## Troubleshooting

### Problema: No se guardan cambios

**Síntomas:**
- Botón "Guardar" no responde
- No hay mensaje de error

**Solución:**
1. Verificar que el usuario es admin
2. Verificar que la configuración tiene `Editable = 1`
3. Revisar logs del servidor para errores de validación
4. Verificar conexión a base de datos

### Problema: Secrets visibles

**Síntomas:**
- Tokens/passwords visibles en interfaz

**Solución:**
1. Verificar que el campo `Tipo` es `'secret'` en base de datos
2. Verificar que `configService.getAllConfigs()` está enmascarando
3. Limpiar caché del navegador

### Problema: Validación IP falla

**Síntomas:**
- IP válida rechazada

**Solución:**
1. Verificar formato: `xxx.xxx.xxx.xxx`
2. Verificar que cada octeto es 0-255
3. No usar espacios adicionales
4. Ejemplo correcto: `192.168.1.100`

## Mejores Prácticas

### ✅ Hacer

- Validar siempre antes de guardar
- Usar tipos de dato correctos en base de datos
- Marcar secrets como `Tipo = 'secret'`
- Usar `Editable = 0` para configuraciones críticas
- Registrar todos los cambios en logs
- Mostrar mensajes claros de error
- Permitir cancelar cambios

### ❌ Evitar

- Guardar secrets en texto plano visible
- Permitir valores vacíos en campos obligatorios
- Modificar configuraciones sin validar
- Ignorar errores de validación
- Mostrar errores técnicos al usuario
- Permitir editar configuraciones críticas

## Mantenimiento

### Agregar Nueva Configuración

```sql
-- 1. Insertar en base de datos
INSERT INTO Configuraciones (Clave, Valor, Descripcion, Tipo, Categoria)
VALUES ('MI_CONFIG', 'valor_default', 'Descripción', 'string', 'SYSTEM');

-- 2. No requiere cambios en código
-- 3. Aparecerá automáticamente en la interfaz
```

### Agregar Nueva Categoría

```sql
-- 1. Insertar configuraciones con nueva categoría
INSERT INTO Configuraciones (Clave, Valor, Descripcion, Tipo, Categoria)
VALUES ('CONFIG1', 'valor1', 'Desc1', 'string', 'NUEVA_CATEGORIA');

-- 2. Actualizar validación en frontend (ConfiguracionPage.jsx)
const validCategories = ['PRINTER', 'WHATSAPP', 'SYSTEM', 'NOTIFICATIONS', 'NUEVA_CATEGORIA'];

-- 3. Agregar sección en render
{renderCategoria('NUEVA_CATEGORIA', '🆕 Nueva Categoría', 'Descripción...')}
```

## Conclusión

El sistema de gestión de configuraciones proporciona una interfaz segura y fácil de usar para administrar parámetros del sistema. Con validaciones automáticas, enmascaramiento de secrets y control de acceso robusto, garantiza que las configuraciones se mantengan correctas y seguras.

---

**Documentación generada**: Sprint 3 - Tarea 5
**Última actualización**: Enero 2025
**Autor**: GitHub Copilot
