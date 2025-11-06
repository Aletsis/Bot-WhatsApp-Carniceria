# 🐛 Fix: Error al Actualizar Estado de Pedidos

## Problema Reportado

Al intentar actualizar el estado de un pedido desde el dashboard, se mostraba el mensaje:
```
Error al actualizar estado
```

---

## 🔍 Causa Raíz

Había **múltiples problemas** que causaban este error:

### 1. **Inconsistencia en nombres de parámetros**
- **Frontend** enviaba: `{ nuevoEstado: "En ruta" }`
- **Backend** esperaba: `{ estado: "En ruta" }`
- ❌ Resultado: El backend no recibía el parámetro y la validación fallaba

### 2. **Falta de tipos SQL en parámetros**
```javascript
// ❌ ANTES (SIN tipos)
.input('pedidoId', pedidoId)
.input('estado', estado)

// ✅ DESPUÉS (CON tipos)
.input('pedidoId', sql.Int, parseInt(pedidoId))
.input('estado', sql.NVarChar, estadoRecibido)
```

### 3. **Validación de estados incorrecta**
Los estados válidos definidos no coincidían con los del frontend:
- Backend tenía: `'En preparación'`, `'Listo para entrega'`
- Frontend usaba: `'En ruta'`

### 4. **Mensajes de error poco descriptivos**
```javascript
// ❌ ANTES
catch (error) {
  alert('Error al actualizar estado');  // No dice qué falló
}

// ✅ DESPUÉS
catch (error) {
  const errorMsg = error.response?.data?.error || 'Error al actualizar estado';
  alert(`Error: ${errorMsg}`);  // Muestra el error específico
}
```

---

## ✅ Solución Implementada

### 1. **Backend: Aceptar ambos nombres de parámetro**
```javascript
export async function updateEstadoPedidoNuevo(req, res) {
  const { estado, nuevoEstado } = req.body;
  
  // Aceptar tanto 'estado' como 'nuevoEstado' para compatibilidad
  const estadoRecibido = estado || nuevoEstado;
  
  if (!estadoRecibido) {
    return res.status(400).json({ 
      success: false, 
      error: 'Estado es requerido' 
    });
  }
  // ...
}
```

### 2. **Usar tipos SQL correctos**
```javascript
const result = await pool.request()
  .input('pedidoId', sql.Int, parseInt(pedidoId))
  .input('estado', sql.NVarChar, estadoRecibido)
  .query(`UPDATE Pedidos SET Estado = @estado WHERE PedidoID = @pedidoId`);
```

### 3. **Estados válidos sincronizados**
```javascript
const validStates = [
  'En espera de surtir', 
  'En ruta',           // ✅ Ahora incluido
  'Entregado', 
  'Cancelado'
];
```

### 4. **Validación de actualización exitosa**
```javascript
if (result.rowsAffected[0] === 0) {
  return res.status(404).json({ 
    success: false, 
    error: 'Pedido no encontrado' 
  });
}
```

### 5. **Mensajes de error mejorados en frontend**
```javascript
catch (error) {
  const errorMsg = error.response?.data?.error || 
                   error.message || 
                   'Error al actualizar estado';
  console.error('Error completo:', error);
  alert(`Error: ${errorMsg}`);
}
```

### 6. **Logs mejorados para debugging**
```javascript
logger.info('✅ Estado actualizado: Pedido %s → %s', pedidoId, estadoRecibido);
logger.error('❌ Error actualizando estado del pedido %s:', pedidoId, err.message);
logger.error('Stack:', err.stack);
```

---

## 📁 Archivos Modificados

### Backend
- ✅ `src/controllers/dashboardController.js`
  - Función `updateEstadoPedido()` 
  - Función `updateEstadoPedidoNuevo()`

### Frontend
- ✅ `client/src/pages/PedidosPage.jsx`
  - Función `handleUpdateEstado()`

### Scripts de Prueba
- ✅ `scripts/test-update-estado.js` (nuevo)

---

## 🧪 Cómo Probar

### Opción 1: Prueba Manual
1. Iniciar servidor: `npm start`
2. Abrir dashboard: http://localhost:3000
3. Login con admin/admin123
4. Ir a Pedidos
5. Cambiar estado de un pedido usando el selector
6. **Esperado:** ✅ "Estado actualizado correctamente"

### Opción 2: Script Automatizado
```bash
# Asegúrate de que el servidor esté corriendo primero
npm start

# En otra terminal
node scripts/test-update-estado.js
```

**Output esperado:**
```
🧪 Iniciando prueba de actualización de estado...

📝 1. Intentando login...
✅ Login exitoso

📋 2. Obteniendo lista de pedidos...
✅ 5 pedidos encontrados

🔄 3. Probando actualización de estado...
   Pedido ID: 1
   Folio: PED-2025-001
   Estado actual: En espera de surtir
   Nuevo estado: En ruta

✅ Estado actualizado exitosamente

✔️ 4. Verificando actualización...
✅ Verificación exitosa - Estado actualizado correctamente

🎉 Prueba completada exitosamente
```

---

## 🔍 Debugging

### Si sigue fallando:

#### 1. Verificar logs del servidor
Buscar en la consola:
```
✅ Estado actualizado: Pedido 1 → En ruta
```
O errores:
```
❌ Error actualizando estado del pedido 1: <mensaje>
```

#### 2. Verificar en el navegador (Console)
```javascript
// Abrir Developer Tools (F12)
// Ver la pestaña Network
// Buscar el request a /pedidos/1/estado
// Ver Request Payload y Response
```

#### 3. Verificar que el pedido existe
```sql
-- En SQL Server
SELECT PedidoID, Folio, Estado FROM Pedidos WHERE PedidoID = 1;
```

#### 4. Verificar permisos del usuario
- El usuario debe tener rol `admin` o `editor`
- Verificar en tabla `Usuarios`

---

## 📊 Comparación Antes/Después

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Compatibilidad parámetros** | ❌ Solo `estado` | ✅ `estado` o `nuevoEstado` |
| **Tipos SQL** | ❌ Sin tipos | ✅ Tipos especificados |
| **Validación estados** | ⚠️ Estados incorrectos | ✅ Estados correctos |
| **Mensajes error** | ❌ Genéricos | ✅ Específicos |
| **Validación actualización** | ❌ No verifica | ✅ Verifica rows affected |
| **Logs** | ⚠️ Básicos | ✅ Detallados con emojis |

---

## 🎯 Prevención Futura

### 1. **Documentar contratos API**
Crear `docs/API.md` con:
```markdown
### PUT /api/dashboard/pedidos/:id/estado

**Body:**
```json
{
  "nuevoEstado": "En ruta"
}
```

**Estados válidos:**
- En espera de surtir
- En ruta
- Entregado
- Cancelado
```

### 2. **Agregar tests automatizados**
```javascript
// tests/api/pedidos.test.js
describe('PUT /pedidos/:id/estado', () => {
  it('should update estado successfully', async () => {
    // ...
  });
});
```

### 3. **Validación en ambos lados**
- ✅ Cliente: Validar antes de enviar
- ✅ Servidor: Validar al recibir

---

## ✅ Estado Actual

- ✅ Bug corregido
- ✅ Tests manuales pasados
- ✅ Script de prueba automatizado creado
- ✅ Logs mejorados para debugging
- ✅ Mensajes de error descriptivos
- ✅ Tipos SQL especificados correctamente

---

**Fix aplicado por:** GitHub Copilot  
**Fecha:** 6 de noviembre de 2025  
**Relacionado con:** Sprint 1 - Tarea 2 (SQL Injection Prevention)
