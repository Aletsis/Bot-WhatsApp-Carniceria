# 🛡️ Manejo de Errores Mejorado

## 📋 Resumen de Cambios

Se ha refactorizado completamente el manejo de errores en el proyecto para:

1. **Propagar errores** en lugar de silenciarlos
2. **Distinguir** entre "no encontrado" (resultado legítimo) y "error de BD" (problema técnico)
3. **Notificar al usuario** cuando hay errores técnicos
4. **Loggear detalladamente** para facilitar debugging
5. **Mantener disponibilidad** del webhook (siempre responde 200 a WhatsApp)

---

## 🔧 Cambios por Archivo

### 1. `src/services/dbService.js`

**Antes:**
```javascript
getClienteByPhone: async (telefono) => {
  try {
    const pool = await getPool();
    const res = await pool.request()...
    return res.recordset[0] || null;
  } catch (err) {
    logger.error('Error obteniendo cliente', err);
    return null;  // ❌ Silencia el error
  }
}
```

**Después:**
```javascript
getClienteByPhone: async (telefono) => {
  const pool = await getPool();
  const res = await pool.request()
    .input('telefono', sql.NVarChar, telefono)
    .query('SELECT * FROM Clientes WHERE NumeroTelefono = @telefono');
  
  const cliente = res.recordset[0] || null;
  logger.debug('Cliente obtenido: %s - %s', telefono, cliente ? 'Encontrado' : 'No encontrado');
  return cliente; // ✅ null = cliente no existe (legítimo)
  // ✅ throw = error de BD (problema técnico)
}
```

**Beneficios:**
- ✅ `null` significa "cliente no encontrado" (resultado válido)
- ✅ Excepciones indican problemas reales de BD
- ✅ Documentación JSDoc para cada función
- ✅ Logging más detallado con niveles apropiados

---

### 2. `src/handlers/stateHandlers.js`

**Cambios:**
- Todos los handlers ahora tienen bloques `try-catch`
- Capturan errores de servicios (BD, WhatsApp API)
- Notifican al usuario con mensajes amigables
- Propagan el error para logging centralizado

**Ejemplo:**
```javascript
export async function handleStartState(from, numeroCorregido) {
  try {
    const cliente = await DBService.getClienteByPhone(from);
    // ... lógica normal
  } catch (err) {
    logger.error('❌ Error en handleStartState para %s: %s', from, err.message);
    await WhatsappService.sendText(numeroCorregido, 
      '❌ Lo siento, hay un problema temporal. Intenta de nuevo en unos momentos.');
    throw err; // Propagar para logging centralizado
  }
}
```

---

### 3. `src/handlers/buttonHandlers.js`

**Cambios:**
- `handleButton()` ahora tiene try-catch global
- Captura errores de cualquier sub-handler
- Notifica al usuario antes de propagar

```javascript
export async function handleButton(from, buttonId, session, numeroCorregido) {
  try {
    const cliente = await DBService.getClienteByPhone(from);
    // ... switch con handlers
  } catch (err) {
    logger.error('❌ Error en handleButton (%s): %s', buttonId, err.message);
    await WhatsappService.sendText(numeroCorregido, 
      '❌ Ocurrió un error. Intenta de nuevo o escribe "menu".');
    throw err;
  }
}
```

---

### 4. `src/controllers/webhookController.js`

**Cambios principales:**

#### a) Manejo de errores en comando "reiniciar"
```javascript
if (['cancelar', 'reiniciar', ...].includes(textLower)) {
  try {
    // ... lógica de reinicio
    return res.sendStatus(200);
  } catch (err) {
    logger.error('❌ Error en comando de reinicio: %s', err.message);
    return res.sendStatus(200); // ✅ Siempre 200 para WhatsApp
  }
}
```

#### b) Manejo global con notificación al usuario
```javascript
} catch (err) {
  logger.error('❌ Error al procesar mensaje:', err.message, err.stack);
  
  // Intentar notificar al usuario
  try {
    const numeroCorregido = req.body.entry?.[0]...;
    if (numeroCorregido) {
      await WhatsappService.sendText(num, 
        '❌ Lo siento, ocurrió un error técnico...');
    }
  } catch (notifyErr) {
    logger.error('❌ No se pudo notificar error: %s', notifyErr.message);
  }
  
  // ✅ Siempre 200 a WhatsApp para evitar reintentos
  return res.sendStatus(200);
}
```

#### c) Try-catch en `handleBySessionState`
```javascript
async function handleBySessionState(...) {
  try {
    switch (state) {
      case 'START': await handleStartState(...); break;
      // ... otros casos
    }
  } catch (err) {
    logger.error('❌ Error en handleBySessionState (estado: %s): %s', state, err.message);
    
    try {
      await WhatsappService.sendText(numeroCorregido, 
        '❌ Ocurrió un error. Escribe "menu" para reintentar.');
    } catch (notifyErr) {
      logger.error('❌ No se pudo enviar mensaje de error: %s', notifyErr.message);
    }
    
    // No propagar - ya fue logueado y notificado
  }
}
```

---

### 5. `src/services/whatsappService.js`

**Mejoras en detección de errores de API:**

```javascript
async function apiSend(payload) {
  try {
    const res = await axios.post(...);
    
    // ✅ Validar respuesta
    if (!res.data || !res.data.messages) {
      logger.warn('⚠️ Respuesta inesperada de WhatsApp API: %o', res.data);
    } else {
      logger.info('✅ Mensaje enviado - ID: %s', res.data.messages[0]?.id);
    }
    
    return res.data;
  } catch (err) {
    // ✅ Distinguir tipos de error
    if (err.response) {
      const status = err.response.status;
      
      if (status === 401) {
        logger.error('🔑 Token de WhatsApp inválido o expirado');
      } else if (status === 404) {
        logger.error('📞 Número no válido: %s', to);
      } else if (status === 429) {
        logger.error('🚦 Rate limit excedido en WhatsApp API');
      } else if (status >= 500) {
        logger.error('🔥 Error del servidor de WhatsApp');
      }
    } else if (err.request) {
      logger.error('❌ Sin respuesta de WhatsApp API');
    } else {
      logger.error('❌ Error configurando request: %s', err.message);
    }
    
    throw err;
  }
}
```

---

### 6. `src/services/sessionService.js`

**Mejoras:**

```javascript
updateSession: async (telefono, updates) => {
  const pool = await getPool();
  
  const sel = await pool.request()...query('SELECT ...');
  const row = sel.recordset[0];
  
  // ✅ Validar que la sesión existe
  if (!row) {
    logger.warn('⚠️ No se encontró sesión para actualizar: %s', telefono);
    throw new Error(`No se encontró sesión para: ${telefono}`);
  }
  
  // ... actualización
  logger.debug('✅ Sesión actualizada: %s - Estado: %s', telefono, newEstado);
  return true;
}
```

**Documentación JSDoc agregada:**
- Parámetros claramente definidos
- Tipos de retorno especificados
- Errores que puede lanzar documentados

---

## 🎯 Beneficios del Nuevo Enfoque

### 1. **Debugging Facilitado**
- Logs detallados con contexto completo
- Stack traces preservados
- Distinción clara entre tipos de error

### 2. **Mejor Experiencia de Usuario**
- Mensajes de error amigables
- Usuario nunca se queda sin respuesta
- Opción de reintentar con "menu"

### 3. **Disponibilidad Mejorada**
- Webhook siempre responde 200 (evita reintentos de WhatsApp)
- Errores no bloquean otros usuarios
- Degradación elegante en caso de fallas

### 4. **Mantenibilidad**
- Código más limpio y comprensible
- Documentación JSDoc completa
- Separación clara de responsabilidades

---

## 📊 Flujo de Manejo de Errores

```
┌─────────────────────┐
│  Usuario envía      │
│  mensaje WhatsApp   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ webhookController   │ ◄── Try-Catch nivel 1 (siempre responde 200)
│ messageWebhookHand  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ handleBySession     │ ◄── Try-Catch nivel 2 (captura errores de handlers)
│ State               │     Notifica al usuario
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ stateHandlers.js    │ ◄── Try-Catch nivel 3 (captura errores de servicios)
│ (handleMenuState,   │     Notifica + propaga
│  handleStartState)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Services            │ ◄── Sin try-catch (propagan errores)
│ (dbService,         │     Retornan null para "no encontrado"
│  whatsappService)   │     Throw para errores reales
└─────────────────────┘
```

---

## 🧪 Ejemplos de Comportamiento

### Escenario 1: Cliente no existe (resultado normal)
```javascript
const cliente = await DBService.getClienteByPhone('5212345678');
// cliente = null ✅ (no es un error, el cliente simplemente no existe)
```

### Escenario 2: Error de conexión a BD
```javascript
try {
  const cliente = await DBService.getClienteByPhone('5212345678');
} catch (err) {
  // err = "Connection to SQL Server failed" ❌
  // Se loguea, se notifica al usuario, se responde 200 a WhatsApp
}
```

### Escenario 3: Error de WhatsApp API
```javascript
try {
  await WhatsappService.sendText(numero, 'Hola');
} catch (err) {
  // err = "401 Unauthorized" o "429 Too Many Requests"
  // Se loguea con detalles específicos
  // Se notifica al usuario del problema
}
```

### Escenario 4: Error inesperado
```javascript
// Si algo falla en cualquier nivel:
// 1. Logger captura el error con stack trace completo
// 2. Usuario recibe mensaje: "Ocurrió un error, escribe 'menu'"
// 3. WhatsApp recibe 200 OK (no reintenta)
// 4. Sistema sigue operativo para otros usuarios
```

---

## ✅ Checklist de Mejoras Implementadas

- [x] Eliminar try-catch que silencian errores en `dbService.js`
- [x] Documentación JSDoc en todos los servicios
- [x] Try-catch en todos los handlers con notificación al usuario
- [x] Manejo global en webhookController que siempre responde 200
- [x] Logging detallado con niveles apropiados (error, warn, info, debug)
- [x] Distinción entre errores de WhatsApp API (401, 404, 429, 500+)
- [x] Validación de sesión existente antes de actualizar
- [x] Mensajes de error amigables para usuarios
- [x] Stack traces completos en logs

---

## 🚀 Próximos Pasos Recomendados

1. **Testing**: Probar escenarios de error:
   - Desconectar SQL Server
   - Token de WhatsApp inválido
   - Números de teléfono malformados
   
2. **Monitoring**: Considerar integrar servicio de monitoreo (Sentry, Rollbar)

3. **Alertas**: Configurar alertas cuando ciertos errores ocurran frecuentemente

4. **Métricas**: Rastrear tasa de errores por tipo

---

## 📝 Notas Técnicas

- **Importante**: El webhook SIEMPRE debe responder 200 a WhatsApp, incluso si hay errores internos, para evitar reintentos infinitos.

- **Null vs Throw**: 
  - `null` = resultado legítimo ("no encontrado")
  - `throw` = problema técnico que requiere atención

- **Logging levels**:
  - `error`: Errores que requieren atención
  - `warn`: Situaciones anormales pero no críticas
  - `info`: Eventos importantes del flujo normal
  - `debug`: Detalles para debugging (solo en desarrollo)
