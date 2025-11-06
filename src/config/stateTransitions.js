/**
 * Configuración de Transiciones de Estado
 * 
 * Define las transiciones válidas entre estados del bot de WhatsApp.
 * Previene cambios de estado inválidos y ayuda a detectar bugs en el flujo.
 * 
 * Estados disponibles:
 * - START: Estado inicial, esperando comando del usuario
 * - MENU: Mostrando menú de opciones
 * - ASK_NAME: Solicitando nombre del cliente (nuevo)
 * - ASK_ADDRESS: Solicitando dirección de entrega
 * - TAKING_ORDER: Recibiendo productos del pedido
 * - AWAITING_CONFIRM: Esperando confirmación del pedido
 * 
 * @module stateTransitions
 */

/**
 * Mapa de transiciones válidas por estado
 * 
 * Formato: { estadoActual: [estadosDestinoPermitidos] }
 * 
 * Un estado puede transicionar a sí mismo (reintentos, correcciones)
 */
export const STATE_TRANSITIONS = {
  // START: Punto de entrada principal
  START: [
    'MENU',           // Usuario pide menú
    'ASK_NAME',       // Hacer pedido directo (cliente nuevo)
    'ASK_ADDRESS',    // Hacer pedido (cliente existente sin dirección)
    'TAKING_ORDER',   // Hacer pedido (cliente existente con datos)
    'START'           // Reinicio explícito
  ],
  
  // MENU: Navegando opciones
  MENU: [
    'ASK_NAME',       // Opción "Hacer pedido" (cliente nuevo)
    'ASK_ADDRESS',    // Opción "Hacer pedido" (cliente sin dirección)
    'TAKING_ORDER',   // Opción "Hacer pedido" (cliente completo)
    'START',          // Cancelar / Volver al inicio
    'MENU'            // Mostrar menú nuevamente
  ],
  
  // ASK_NAME: Capturando nombre del cliente
  ASK_NAME: [
    'ASK_ADDRESS',    // Nombre capturado → pedir dirección
    'START',          // Cancelar proceso
    'ASK_NAME'        // Reintento (validación fallida)
  ],
  
  // ASK_ADDRESS: Capturando dirección
  ASK_ADDRESS: [
    'TAKING_ORDER',   // Dirección capturada → iniciar pedido
    'START',          // Cancelar proceso
    'ASK_ADDRESS'     // Reintento (validación fallida)
  ],
  
  // TAKING_ORDER: Recibiendo productos
  TAKING_ORDER: [
    'AWAITING_CONFIRM', // Usuario finaliza pedido → pedir confirmación
    'START',            // Cancelar pedido
    'TAKING_ORDER'      // Agregar más productos
  ],
  
  // AWAITING_CONFIRM: Esperando confirmación
  AWAITING_CONFIRM: [
    'START',            // Pedido confirmado/cancelado → reiniciar
    'TAKING_ORDER',     // Modificar pedido
    'AWAITING_CONFIRM'  // Mostrar resumen nuevamente
  ]
};

/**
 * Estados que no deberían recibir timeout (terminales o muy rápidos)
 */
export const NO_TIMEOUT_STATES = [
  'START'  // Estado terminal, no requiere timeout
];

/**
 * Estados críticos donde la transición debe ser cuidadosamente validada
 */
export const CRITICAL_STATES = [
  'AWAITING_CONFIRM',  // Pedido a punto de crearse
  'TAKING_ORDER'       // Datos sensibles en buffer
];

/**
 * Valida si una transición de estado es permitida
 * 
 * @param {string} fromState - Estado actual
 * @param {string} toState - Estado destino
 * @returns {boolean} - true si la transición es válida
 */
export function isValidTransition(fromState, toState) {
  // Si no existe el estado origen en el mapa, rechazar
  if (!STATE_TRANSITIONS[fromState]) {
    return false;
  }
  
  // Verificar si el estado destino está en la lista de permitidos
  return STATE_TRANSITIONS[fromState].includes(toState);
}

/**
 * Obtiene los estados permitidos desde un estado dado
 * 
 * @param {string} fromState - Estado actual
 * @returns {string[]} - Array de estados destino permitidos
 */
export function getAllowedStates(fromState) {
  return STATE_TRANSITIONS[fromState] || [];
}

/**
 * Valida si un estado es crítico (requiere validación extra)
 * 
 * @param {string} state - Estado a verificar
 * @returns {boolean} - true si el estado es crítico
 */
export function isCriticalState(state) {
  return CRITICAL_STATES.includes(state);
}

/**
 * Valida si un estado requiere timeout
 * 
 * @param {string} state - Estado a verificar
 * @returns {boolean} - true si el estado requiere timeout
 */
export function requiresTimeout(state) {
  return !NO_TIMEOUT_STATES.includes(state);
}

/**
 * Genera un mensaje de error descriptivo para transición inválida
 * 
 * @param {string} fromState - Estado actual
 * @param {string} toState - Estado destino intentado
 * @returns {string} - Mensaje de error
 */
export function getTransitionError(fromState, toState) {
  const allowed = getAllowedStates(fromState);
  return `Transición inválida: ${fromState} → ${toState}. Estados permitidos: ${allowed.join(', ')}`;
}

export default {
  STATE_TRANSITIONS,
  NO_TIMEOUT_STATES,
  CRITICAL_STATES,
  isValidTransition,
  getAllowedStates,
  isCriticalState,
  requiresTimeout,
  getTransitionError
};
