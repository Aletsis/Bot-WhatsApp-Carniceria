# ✅ Sprint 1 - Checklist de Validación

## 🔴 Tareas Completadas

### ✅ Tarea 1: Seguridad de Sesiones
- [x] Eliminado fallback hardcodeado de `SESSION_SECRET`
- [x] Agregado `SESSION_SECRET` a validación en `checkEnv()`
- [x] Validación de longitud mínima (32 caracteres)
- [x] Agregada protección `sameSite: 'strict'` en cookies
- [x] Documentado en README cómo generar el secret
- [x] Creado script `generate-session-secret.js`
- [x] Agregado comando `npm run generate-secret`

**Archivos modificados:**
- `app.js`
- `README.md`
- `scripts/generate-session-secret.js` (nuevo)
- `package.json`

---

### ✅ Tarea 2: Prevención de SQL Injection
- [x] Reemplazada interpolación directa por parámetros SQL
- [x] Agregado `sql.Int` para parámetro `limit`
- [x] Agregado `sql.NVarChar` para parámetro `estado`
- [x] Agregado `sql.DateTime2` para parámetros de fecha
- [x] Validación de límite máximo (1000 registros)
- [x] Importado módulo `mssql` en controller

**Archivos modificados:**
- `src/controllers/dashboardController.js`

---

### ✅ Tarea 3: Reconexión Automática de Base de Datos
- [x] Implementado listener `pool.on('error')`
- [x] Implementado listener `pool.on('close')`
- [x] Lógica de reintentos con backoff exponencial
- [x] Máximo de 5 intentos de reconexión
- [x] Delay incremental: 5s, 10s, 20s, 40s, 80s
- [x] Reseteo automático del pool al detectar error
- [x] Configuración de timeouts y pool size
- [x] Logs detallados de cada intento

**Archivos modificados:**
- `src/services/dbService.js`

**Configuración del pool:**
```javascript
{
  requestTimeout: 30000,      // 30 segundos
  connectionTimeout: 30000,   // 30 segundos
  pool: {
    max: 10,                  // Máximo 10 conexiones
    min: 0,                   // Mínimo 0 conexiones
    idleTimeoutMillis: 30000  // 30 segundos de idle
  }
}
```

---

### ✅ Tarea 4: Validación de WEBHOOK_VERIFY_TOKEN
- [x] Agregado `WEBHOOK_VERIFY_TOKEN` a función `checkEnv()`
- [x] Validación en `verifyWebhookHandler` de token configurado
- [x] Respuesta 500 si no está configurado
- [x] Logs de intentos exitosos y fallidos
- [x] Documentado en README como requerido

**Archivos modificados:**
- `app.js`
- `src/controllers/webhookController.js`
- `README.md`

---

## 🧪 Pasos para Probar

### 1. Generar SESSION_SECRET
```bash
npm run generate-secret
```

Copiar el output al archivo `.env`:
```env
SESSION_SECRET=<valor_generado>
```

### 2. Agregar WEBHOOK_VERIFY_TOKEN al .env
```env
WEBHOOK_VERIFY_TOKEN=mi_token_seguro_123
```

### 3. Verificar que el servidor arranca
```bash
npm start
```

**Esperado:**
- ✅ No debe mostrar error de variables faltantes
- ✅ Debe conectar a la base de datos
- ✅ Debe mostrar: "✅ Servidor corriendo en http://localhost:3000"

### 4. Probar validación de SESSION_SECRET
Editar `.env` temporalmente con un secret corto:
```env
SESSION_SECRET=corto
```

Ejecutar:
```bash
npm start
```

**Esperado:**
- ❌ Debe fallar con: "SESSION_SECRET debe tener al menos 32 caracteres"
- ❌ Debe mostrar comando para generar uno válido

### 5. Probar reconexión automática (Opcional)
1. Iniciar el servidor
2. Reiniciar SQL Server manualmente
3. Observar logs

**Esperado:**
- ⚠️ Debe detectar pérdida de conexión
- 🔄 Debe intentar reconectar automáticamente
- ✅ Debe reconectar cuando SQL Server esté disponible

### 6. Probar endpoint de pedidos (SQL Injection)
```bash
# Test normal
curl "http://localhost:3000/api/dashboard/pedidos?limit=5"

# Test con límite excesivo (debe limitarse a 1000)
curl "http://localhost:3000/api/dashboard/pedidos?limit=999999"

# Test con filtro de estado
curl "http://localhost:3000/api/dashboard/pedidos?estado=En%20espera%20de%20surtir"
```

**Esperado:**
- ✅ Todas las consultas deben funcionar
- ✅ No debe haber errores de SQL
- ✅ Límites deben respetarse

### 7. Probar verificación de webhook
```bash
# Simular verificación de Meta
curl "http://localhost:3000/webhook?hub.mode=subscribe&hub.verify_token=mi_token_seguro_123&hub.challenge=test123"
```

**Esperado:**
- ✅ Debe retornar "test123" (el challenge)
- ✅ Status 200

**Test con token incorrecto:**
```bash
curl "http://localhost:3000/webhook?hub.mode=subscribe&hub.verify_token=token_incorrecto&hub.challenge=test123"
```

**Esperado:**
- ❌ Status 403
- ⚠️ Log de advertencia en consola

---

## 📊 Métricas de Mejora

| Aspecto | Antes | Después |
|---------|-------|---------|
| **SESSION_SECRET seguro** | ❌ Hardcoded | ✅ Obligatorio |
| **SQL Injection** | ⚠️ Interpolación | ✅ Parámetros |
| **Reconexión BD** | ❌ Manual | ✅ Automática |
| **WEBHOOK_VERIFY_TOKEN** | ⚠️ Opcional | ✅ Requerido |

---

## 🚨 Posibles Problemas

### Problema: "SESSION_SECRET no está definido"
**Solución:**
1. Ejecutar `npm run generate-secret`
2. Copiar el valor al `.env`
3. Reiniciar el servidor

### Problema: "WEBHOOK_VERIFY_TOKEN no está definido"
**Solución:**
1. Agregar cualquier string al `.env`:
   ```env
   WEBHOOK_VERIFY_TOKEN=mi_token_personalizado
   ```
2. Este token lo usarás al configurar el webhook en Meta

### Problema: Pool de conexión no reconecta
**Solución:**
- Verificar que SQL Server esté corriendo
- Revisar logs para ver intentos de reconexión
- Si alcanza máximo de intentos (5), reiniciar manualmente el servidor

---

## 📝 Notas Importantes

1. **Backup del .env:** Antes de modificar variables, hacer backup del archivo `.env`

2. **Diferentes secrets por ambiente:** 
   - Desarrollo: Un secret
   - Producción: Otro secret completamente diferente

3. **WEBHOOK_VERIFY_TOKEN:**
   - Debe coincidir con el configurado en Meta Developer Console
   - Puede ser cualquier string, pero debe ser el mismo en ambos lados

4. **Reconexión automática:**
   - Solo se activa si la conexión se pierde DESPUÉS de establecida
   - No aplica para errores de configuración iniciales

---

## ✅ Criterios de Aceptación

- [ ] Servidor arranca sin errores
- [ ] No hay secrets hardcodeados en el código
- [ ] SESSION_SECRET es obligatorio y validado
- [ ] WEBHOOK_VERIFY_TOKEN es obligatorio y validado
- [ ] Queries usan parámetros SQL en lugar de interpolación
- [ ] Pool reconecta automáticamente al perder conexión
- [ ] Logs muestran información clara de reconexión
- [ ] Script de generación de secret funciona
- [ ] README documenta correctamente las nuevas validaciones

---

## 🎯 Siguiente Sprint

Una vez validado el Sprint 1, proceder con **Sprint 2: Resiliencia**
- Tarea 5: Reintentos WhatsApp API
- Tarea 6: Persistencia de timeouts
- Tarea 7: Validación transiciones estado
- Tarea 9: Estado impresión en BD
