/**
 * Script de prueba para verificar el control de concurrencia
 * con Optimistic Locking en sesiones y pedidos
 * 
 * Este script simula actualizaciones concurrentes y verifica
 * que el sistema maneja correctamente los conflictos de versión.
 */

import { config } from 'dotenv';
config();

import sql from 'mssql';
import { getPool } from '../src/services/dbService.js';
import { updateSessionWithVersion } from '../src/services/transactionService.js';
import logger from '../src/logger.js';

// Colores para output
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

/**
 * Crea una sesión de prueba temporal
 */
async function crearSesionPrueba(telefono) {
  const pool = await getPool();
  
  // Limpiar sesión existente si existe
  await pool.request()
    .input('telefono', sql.NVarChar, telefono)
    .query('DELETE FROM Conversaciones WHERE NumeroTelefono = @telefono');
  
  // Crear nueva sesión con Version = 0
  const result = await pool.request()
    .input('telefono', sql.NVarChar, telefono)
    .input('estado', sql.NVarChar, 'START')
    .query(`
      INSERT INTO Conversaciones (NumeroTelefono, Estado, Buffer, UltimaInteraccion, Version)
      VALUES (@telefono, @estado, NULL, SYSDATETIME(), 0);
      
      SELECT * FROM Conversaciones WHERE NumeroTelefono = @telefono;
    `);
  
  return result.recordset[0];
}

/**
 * Obtiene la sesión actual con su versión
 */
async function obtenerSesion(telefono) {
  const pool = await getPool();
  const result = await pool.request()
    .input('telefono', sql.NVarChar, telefono)
    .query('SELECT * FROM Conversaciones WHERE NumeroTelefono = @telefono');
  
  return result.recordset[0];
}

/**
 * TEST 1: Actualización exitosa con versión correcta
 */
async function test1_ActualizacionExitosa() {
  console.log(`\n${BLUE}═══════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BLUE}TEST 1: Actualización exitosa con versión correcta${RESET}`);
  console.log(`${BLUE}═══════════════════════════════════════════════════════════${RESET}`);
  
  const telefono = '+52TEST0001';
  
  try {
    // Crear sesión
    const sesion = await crearSesionPrueba(telefono);
    console.log(`✅ Sesión creada: Tel=${telefono}, Estado=${sesion.Estado}, Version=${sesion.Version}`);
    
    // Actualizar con versión correcta
    const updates = { Estado: 'NOMBRE', Buffer: 'Juan' };
    const success = await updateSessionWithVersion(telefono, updates, sesion.Version);
    
    if (success) {
      const updated = await obtenerSesion(telefono);
      console.log(`${GREEN}✅ ÉXITO: Actualización aplicada${RESET}`);
      console.log(`   Estado: ${sesion.Estado} → ${updated.Estado}`);
      console.log(`   Buffer: ${sesion.Buffer} → ${updated.Buffer}`);
      console.log(`   Version: ${sesion.Version} → ${updated.Version}`);
      return true;
    } else {
      console.log(`${RED}❌ FALLO: La actualización debería haber sido exitosa${RESET}`);
      return false;
    }
  } catch (err) {
    console.log(`${RED}❌ ERROR: ${err.message}${RESET}`);
    return false;
  }
}

/**
 * TEST 2: Conflicto de versión detectado
 */
async function test2_ConflictoVersionDetectado() {
  console.log(`\n${BLUE}═══════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BLUE}TEST 2: Conflicto de versión detectado${RESET}`);
  console.log(`${BLUE}═══════════════════════════════════════════════════════════${RESET}`);
  
  const telefono = '+52TEST0002';
  
  try {
    // Crear sesión
    const sesion = await crearSesionPrueba(telefono);
    console.log(`✅ Sesión creada: Tel=${telefono}, Estado=${sesion.Estado}, Version=${sesion.Version}`);
    
    // Primera actualización exitosa
    const updates1 = { Estado: 'NOMBRE', Buffer: 'Maria' };
    await updateSessionWithVersion(telefono, updates1, sesion.Version);
    const updated1 = await obtenerSesion(telefono);
    console.log(`✅ Primera actualización exitosa: Version ${sesion.Version} → ${updated1.Version}`);
    
    // Segunda actualización con versión desactualizada (debería fallar)
    const updates2 = { Estado: 'DIRECCION', Buffer: 'Calle Principal' };
    const success = await updateSessionWithVersion(telefono, updates2, sesion.Version); // Usar versión vieja
    
    if (!success) {
      console.log(`${GREEN}✅ ÉXITO: Conflicto detectado correctamente${RESET}`);
      console.log(`   Se intentó actualizar con Version=${sesion.Version}, pero la actual es ${updated1.Version}`);
      return true;
    } else {
      console.log(`${RED}❌ FALLO: El conflicto debería haber sido detectado${RESET}`);
      return false;
    }
  } catch (err) {
    console.log(`${RED}❌ ERROR: ${err.message}${RESET}`);
    return false;
  }
}

/**
 * TEST 3: Actualizaciones concurrentes con retry exitoso
 */
async function test3_ActualizacionesConcurrentesConRetry() {
  console.log(`\n${BLUE}═══════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BLUE}TEST 3: Actualizaciones concurrentes con retry exitoso${RESET}`);
  console.log(`${BLUE}═══════════════════════════════════════════════════════════${RESET}`);
  
  const telefono = '+52TEST0003';
  
  try {
    // Crear sesión
    const sesion = await crearSesionPrueba(telefono);
    console.log(`✅ Sesión creada: Tel=${telefono}, Estado=${sesion.Estado}, Version=${sesion.Version}`);
    
    // Simular dos actualizaciones "concurrentes"
    console.log(`\n${YELLOW}Simulando dos procesos concurrentes...${RESET}`);
    
    // Proceso 1: Lee versión 0
    const version1 = sesion.Version;
    console.log(`📖 Proceso 1 lee: Version=${version1}`);
    
    // Proceso 2: Lee versión 0 (antes de que proceso 1 escriba)
    const version2 = sesion.Version;
    console.log(`📖 Proceso 2 lee: Version=${version2}`);
    
    // Proceso 1: Actualiza primero (con versión 0)
    const updates1 = { Estado: 'NOMBRE', Buffer: 'Pedro' };
    const success1 = await updateSessionWithVersion(telefono, updates1, version1);
    const after1 = await obtenerSesion(telefono);
    console.log(`${success1 ? GREEN : RED}✍️  Proceso 1 escribe: ${success1 ? 'ÉXITO' : 'FALLO'} - Version ahora es ${after1.Version}${RESET}`);
    
    // Proceso 2: Intenta actualizar con versión 0 (debería fallar)
    const updates2 = { Estado: 'DIRECCION', Buffer: 'Av. Principal' };
    const success2 = await updateSessionWithVersion(telefono, updates2, version2);
    console.log(`${success2 ? RED : GREEN}✍️  Proceso 2 escribe (v${version2}): ${success2 ? 'ÉXITO' : 'FALLO (esperado)'}${RESET}`);
    
    // Proceso 2: Reintenta con versión actualizada
    const after2 = await obtenerSesion(telefono);
    const success2Retry = await updateSessionWithVersion(telefono, updates2, after2.Version);
    const final = await obtenerSesion(telefono);
    console.log(`${success2Retry ? GREEN : RED}🔄 Proceso 2 reintentar (v${after2.Version}): ${success2Retry ? 'ÉXITO' : 'FALLO'}${RESET}`);
    
    if (!success2 && success2Retry) {
      console.log(`${GREEN}✅ ÉXITO: Sistema manejó correctamente el conflicto y el retry${RESET}`);
      console.log(`   Version final: ${final.Version}, Estado: ${final.Estado}, Buffer: ${final.Buffer}`);
      return true;
    } else {
      console.log(`${RED}❌ FALLO: Comportamiento inesperado en el retry${RESET}`);
      return false;
    }
  } catch (err) {
    console.log(`${RED}❌ ERROR: ${err.message}${RESET}`);
    return false;
  }
}

/**
 * TEST 4: Múltiples actualizaciones rápidas consecutivas
 */
async function test4_ActualizacionesConsecutivasRapidas() {
  console.log(`\n${BLUE}═══════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BLUE}TEST 4: Múltiples actualizaciones consecutivas rápidas${RESET}`);
  console.log(`${BLUE}═══════════════════════════════════════════════════════════${RESET}`);
  
  const telefono = '+52TEST0004';
  
  try {
    // Crear sesión
    await crearSesionPrueba(telefono);
    console.log(`✅ Sesión creada: Tel=${telefono}`);
    
    // Realizar 10 actualizaciones consecutivas
    const NUM_UPDATES = 10;
    let exitos = 0;
    let fallos = 0;
    
    for (let i = 1; i <= NUM_UPDATES; i++) {
      const current = await obtenerSesion(telefono);
      const updates = { 
        Estado: `ESTADO_${i}`, 
        Buffer: `Buffer_${i}` 
      };
      
      const success = await updateSessionWithVersion(telefono, updates, current.Version);
      if (success) {
        exitos++;
        process.stdout.write(`${GREEN}✓${RESET}`);
      } else {
        fallos++;
        process.stdout.write(`${RED}✗${RESET}`);
      }
    }
    
    console.log(`\n\n📊 Resultados:`);
    console.log(`   Éxitos: ${exitos}/${NUM_UPDATES}`);
    console.log(`   Fallos: ${fallos}/${NUM_UPDATES}`);
    
    const final = await obtenerSesion(telefono);
    console.log(`   Version final: ${final.Version}`);
    console.log(`   Estado final: ${final.Estado}`);
    
    if (exitos === NUM_UPDATES && final.Version === NUM_UPDATES) {
      console.log(`${GREEN}✅ ÉXITO: Todas las actualizaciones se aplicaron correctamente${RESET}`);
      return true;
    } else {
      console.log(`${RED}❌ FALLO: No todas las actualizaciones fueron exitosas${RESET}`);
      return false;
    }
  } catch (err) {
    console.log(`${RED}❌ ERROR: ${err.message}${RESET}`);
    return false;
  }
}

/**
 * Limpia las sesiones de prueba
 */
async function limpiarSesionesPrueba() {
  try {
    const pool = await getPool();
    await pool.request()
      .query("DELETE FROM Conversaciones WHERE NumeroTelefono LIKE '+52TEST%'");
    console.log(`\n🧹 Sesiones de prueba limpiadas`);
  } catch (err) {
    console.log(`⚠️  Error limpiando sesiones: ${err.message}`);
  }
}

/**
 * Ejecuta todos los tests
 */
async function ejecutarTests() {
  console.log(`\n${BLUE}╔═══════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BLUE}║    TEST DE CONTROL DE CONCURRENCIA - OPTIMISTIC LOCKING  ║${RESET}`);
  console.log(`${BLUE}╚═══════════════════════════════════════════════════════════╝${RESET}`);
  
  const resultados = [];
  
  // Test 1
  resultados.push({
    nombre: 'TEST 1: Actualización exitosa',
    resultado: await test1_ActualizacionExitosa()
  });
  
  // Test 2
  resultados.push({
    nombre: 'TEST 2: Conflicto de versión',
    resultado: await test2_ConflictoVersionDetectado()
  });
  
  // Test 3
  resultados.push({
    nombre: 'TEST 3: Concurrencia con retry',
    resultado: await test3_ActualizacionesConcurrentesConRetry()
  });
  
  // Test 4
  resultados.push({
    nombre: 'TEST 4: Actualizaciones consecutivas',
    resultado: await test4_ActualizacionesConsecutivasRapidas()
  });
  
  // Limpiar
  await limpiarSesionesPrueba();
  
  // Resumen
  console.log(`\n${BLUE}═══════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BLUE}RESUMEN DE TESTS${RESET}`);
  console.log(`${BLUE}═══════════════════════════════════════════════════════════${RESET}`);
  
  const exitosos = resultados.filter(r => r.resultado).length;
  const fallidos = resultados.filter(r => !r.resultado).length;
  
  resultados.forEach(r => {
    const icon = r.resultado ? '✅' : '❌';
    const color = r.resultado ? GREEN : RED;
    console.log(`${color}${icon} ${r.nombre}${RESET}`);
  });
  
  console.log(`\n📊 Total: ${exitosos}/${resultados.length} exitosos, ${fallidos}/${resultados.length} fallidos`);
  
  if (exitosos === resultados.length) {
    console.log(`${GREEN}\n🎉 ¡TODOS LOS TESTS PASARON! El sistema de concurrencia funciona correctamente.${RESET}`);
  } else {
    console.log(`${RED}\n⚠️  ALGUNOS TESTS FALLARON. Revisar implementación.${RESET}`);
  }
  
  return exitosos === resultados.length;
}

// Ejecutar tests
ejecutarTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error(`${RED}Error fatal:${RESET}`, err);
    process.exit(1);
  });
