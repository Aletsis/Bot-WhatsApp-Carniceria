# Máquina de Estados del Bot de WhatsApp

## 📊 Diagrama de Flujo

```
                                ┌─────────────┐
                                │    START    │ ◄──────────────┐
                                │  (Inicial)  │                │
                                └──────┬──────┘                │
                                       │                       │
                        ┌──────────────┼──────────────┐       │
                        │              │              │       │
                        ▼              ▼              ▼       │
                 ┌─────────────┐ ┌──────────┐ ┌────────────┐│
                 │   ASK_NAME  │ │  MENU    │ │ ASK_ADDRESS││
                 │ (Cliente    │ │(Opciones)│ │(Si existe) ││
                 │  nuevo)     │ └────┬─────┘ │            ││
                 └──────┬──────┘      │       └─────┬──────┘│
                        │             │             │        │
                        │      ┌──────┴────────┐    │        │
                        │      │               │    │        │
                        ▼      ▼               ▼    ▼        │
                 ┌────────────────────────────────────┐      │
                 │           ASK_ADDRESS              │      │
                 │      (Solicitar dirección)         │      │
                 └────────────────┬───────────────────┘      │
                                  │                          │
                                  ▼                          │
                 ┌────────────────────────────────────┐      │
                 │          TAKING_ORDER              │      │
                 │     (Recibiendo productos)         │      │
                 └────────────────┬───────────────────┘      │
                                  │                          │
                                  │ "finalizar pedido"       │
                                  ▼                          │
                 ┌────────────────────────────────────┐      │
                 │       AWAITING_CONFIRM             │      │
                 │  (Confirmar o modificar pedido)    │      │
                 └────────────────┬───────────────────┘      │
                                  │                          │
                      ┌───────────┴───────────┐              │
                      │                       │              │
                      ▼ "confirmar"           ▼ "cancelar"   │
              ┌───────────────┐         ┌───────────┐        │
              │   Crear       │         │  Cancelar │        │
              │   Pedido      │         │           │        │
              │   en BD       │         └─────┬─────┘        │
              └───────┬───────┘               │              │
                      │                       │              │
                      └───────────────────────┴──────────────┘
                              Volver a START
```

## 📋 Estados Disponibles

### 🟢 START (Inicial)
- **Descripción:** Estado inicial del bot, esperando comando
- **Transiciones válidas:**
  - → `MENU`: Usuario pide ver el menú
  - → `ASK_NAME`: Usuario nuevo hace pedido directo
  - → `ASK_ADDRESS`: Cliente sin dirección hace pedido
  - → `TAKING_ORDER`: Cliente con todos los datos hace pedido
- **Timeout:** ❌ No aplica

### 🟡 MENU (Navegación)
- **Descripción:** Mostrando menú de opciones al usuario
- **Transiciones válidas:**
  - → `ASK_NAME`: Opción "Hacer pedido" (cliente nuevo)
  - → `ASK_ADDRESS`: Opción "Hacer pedido" (sin dirección)
  - → `TAKING_ORDER`: Opción "Hacer pedido" (cliente completo)
  - → `START`: Cancelar o volver
- **Timeout:** ⏰ 5 minutos

### 🔵 ASK_NAME (Captura de datos)
- **Descripción:** Solicitando nombre del cliente (solo clientes nuevos)
- **Transiciones válidas:**
  - → `ASK_ADDRESS`: Nombre capturado correctamente
  - → `START`: Cancelar proceso
  - → `ASK_NAME`: Reintentar (nombre inválido)
- **Timeout:** ⏰ 5 minutos

### 🔵 ASK_ADDRESS (Captura de datos)
- **Descripción:** Solicitando dirección de entrega
- **Transiciones válidas:**
  - → `TAKING_ORDER`: Dirección capturada, iniciar pedido
  - → `START`: Cancelar proceso
  - → `ASK_ADDRESS`: Reintentar (dirección inválida)
- **Timeout:** ⏰ 5 minutos

### 🟣 TAKING_ORDER (Pedido activo)
- **Descripción:** Recibiendo productos del pedido
- **Transiciones válidas:**
  - → `AWAITING_CONFIRM`: Usuario escribe "finalizar pedido"
  - → `START`: Cancelar pedido
  - → `TAKING_ORDER`: Continuar agregando productos
- **Timeout:** ⏰ 5 minutos
- **⚠️ Estado crítico:** Contiene datos sensibles en buffer

### 🔴 AWAITING_CONFIRM (Confirmación)
- **Descripción:** Esperando confirmación final del pedido
- **Transiciones válidas:**
  - → `START`: Pedido confirmado/cancelado (reiniciar)
  - → `TAKING_ORDER`: Modificar pedido
  - → `AWAITING_CONFIRM`: Mostrar resumen nuevamente
- **Timeout:** ⏰ 5 minutos
- **⚠️ Estado crítico:** Pedido a punto de crearse en BD

---

## 🚨 Transiciones Inválidas (Detectadas y Loggeadas)

### Ejemplos de transiciones que **NO** están permitidas:

| Desde | Hacia | ¿Por qué es inválida? |
|-------|-------|----------------------|
| `TAKING_ORDER` | `ASK_NAME` | No tiene sentido volver a pedir nombre en medio de un pedido |
| `AWAITING_CONFIRM` | `ASK_ADDRESS` | La dirección ya fue capturada previamente |
| `ASK_NAME` | `MENU` | El flujo debe completar la captura de datos |
| `ASK_ADDRESS` | `MENU` | El flujo debe continuar hacia el pedido |

---

## 🔧 Implementación Técnica

### Validación Automática en `sessionService.js`

```javascript
import { 
  isValidTransition, 
  isCriticalState, 
  getTransitionError 
} from '../config/stateTransitions.js';

// En updateSession()
if (updates.Estado && currentState !== newEstado) {
  const isValid = isValidTransition(currentState, newEstado);
  
  if (!isValid) {
    const errorMsg = getTransitionError(currentState, newEstado);
    
    // Estados críticos = ERROR, resto = WARN
    if (isCriticalState(currentState) || isCriticalState(newEstado)) {
      logger.error('🚨 TRANSICIÓN CRÍTICA INVÁLIDA: %s', errorMsg);
    } else {
      logger.warn('⚠️ Transición inválida: %s', errorMsg);
    }
    
    // Por ahora solo loggeamos, NO bloqueamos
    // Para bloquear: throw new Error(errorMsg);
  }
}
```

### Configuración en `stateTransitions.js`

```javascript
export const STATE_TRANSITIONS = {
  START: ['MENU', 'ASK_NAME', 'ASK_ADDRESS', 'TAKING_ORDER', 'START'],
  MENU: ['ASK_NAME', 'ASK_ADDRESS', 'TAKING_ORDER', 'START', 'MENU'],
  ASK_NAME: ['ASK_ADDRESS', 'START', 'ASK_NAME'],
  ASK_ADDRESS: ['TAKING_ORDER', 'START', 'ASK_ADDRESS'],
  TAKING_ORDER: ['AWAITING_CONFIRM', 'START', 'TAKING_ORDER'],
  AWAITING_CONFIRM: ['START', 'TAKING_ORDER', 'AWAITING_CONFIRM']
};

// Estados críticos (requieren validación extra)
export const CRITICAL_STATES = [
  'AWAITING_CONFIRM',  // Pedido a punto de crearse
  'TAKING_ORDER'       // Datos sensibles en buffer
];
```

---

## 📈 Beneficios de la Validación

### ✅ Detección de Bugs
```
Antes: Bug pasa desapercibido, usuario queda en estado inconsistente
Ahora: logger.error('🚨 TRANSICIÓN CRÍTICA INVÁLIDA: ...')
```

### ✅ Auditoría de Flujos
```
Logs revelan patrones de uso inesperados:
- ¿Usuarios intentan volver atrás frecuentemente?
- ¿Hay confusión en algún punto del flujo?
```

### ✅ Refactorización Segura
```
Al modificar handlers:
- Validación automática detecta cambios que rompan el flujo
- No necesitas recordar todas las reglas manualmente
```

### ✅ Documentación Viva
```
stateTransitions.js = Fuente única de verdad
- Define claramente qué es posible
- Facilita onboarding de nuevos desarrolladores
```

---

## 🧪 Ejemplos de Logs

### Transición Válida (Debug)
```
[DEBUG] ✅ Transición válida: TAKING_ORDER → AWAITING_CONFIRM (tel: 521...)
[DEBUG] ✅ Sesión actualizada: 521... - Estado: AWAITING_CONFIRM
```

### Transición Inválida No Crítica (Warn)
```
[WARN] ⚠️ Transición inválida: MENU → ASK_NAME (debería ser: MENU, ASK_NAME, ASK_ADDRESS, TAKING_ORDER, START) (tel: 521...)
```

### Transición Inválida Crítica (Error)
```
[ERROR] 🚨 TRANSICIÓN CRÍTICA INVÁLIDA: TAKING_ORDER → ASK_NAME (debería ser: AWAITING_CONFIRM, START, TAKING_ORDER) (tel: 521...)
```

---

## 🔮 Futuras Mejoras

### Modo Estricto (Opcional)
```javascript
// En vez de solo loggear, bloquear transiciones inválidas
if (!isValid) {
  throw new Error(errorMsg); // ⛔ Rechazar operación
}
```

### Métricas
```javascript
// Contar transiciones inválidas por tipo
const invalidTransitions = {
  'TAKING_ORDER → ASK_NAME': 15,
  'AWAITING_CONFIRM → ASK_ADDRESS': 3
};

// Dashboard: Mostrar transiciones más problemáticas
```

### Rollback Automático
```javascript
if (!isValid && isCriticalState(currentState)) {
  logger.error('Rollback: Manteniendo estado anterior');
  return false; // No actualizar
}
```

---

## 📝 Uso para Desarrolladores

### Agregar Nuevo Estado
1. Agregar al enum `STATE_TRANSITIONS`
2. Definir transiciones permitidas
3. Marcar como crítico si aplica
4. Actualizar diagrama de flujo
5. Validación automática incluida ✅

### Debugging
```javascript
// Ver estados permitidos desde un estado
import { getAllowedStates } from './config/stateTransitions.js';
console.log(getAllowedStates('TAKING_ORDER'));
// ['AWAITING_CONFIRM', 'START', 'TAKING_ORDER']

// Verificar si transición es válida
import { isValidTransition } from './config/stateTransitions.js';
console.log(isValidTransition('MENU', 'TAKING_ORDER')); // true
console.log(isValidTransition('TAKING_ORDER', 'ASK_NAME')); // false
```

---

**Fecha:** 2025-01-06  
**Sprint:** 2  
**Tarea:** 7 de 4  
**Estado:** ✅ Completada
