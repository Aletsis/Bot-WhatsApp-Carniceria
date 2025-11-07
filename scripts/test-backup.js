/**
 * Script de Prueba del Sistema de Respaldos
 * 
 * Ejecuta un conjunto completo de pruebas para el sistema de respaldos:
 * - Respaldo completo (FULL)
 * - Respaldo diferencial (DIFF)
 * - Verificación de integridad
 * - Estadísticas
 * - Limpieza de respaldos antiguos
 * 
 * Uso:
 *   npm run backup:test
 * o
 *   node scripts/test-backup.js
 */

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readdirSync } from 'fs';
import dotenv from 'dotenv';
import backupService from '../src/services/backupService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '..', '.env') });

// ============================================
// UTILIDADES DE PRUEBA
// ============================================

function printSeparator() {
  console.log('\n' + '='.repeat(60) + '\n');
}

function printTestHeader(title) {
  console.log(`\n${'━'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('━'.repeat(60) + '\n');
}

function printSuccess(message) {
  console.log(`✅ ${message}`);
}

function printError(message) {
  console.log(`❌ ${message}`);
}

function printInfo(message) {
  console.log(`ℹ️  ${message}`);
}

// ============================================
// FUNCIONES DE PRUEBA
// ============================================

/**
 * Prueba 1: Verificar configuración
 */
async function testConfiguration() {
  printTestHeader('TEST 1: Verificar Configuración');
  
  const config = backupService.config;
  
  printInfo(`Ruta de respaldos: ${config.backupPath}`);
  printInfo(`Retención FULL: ${config.retentionFullDays} días`);
  printInfo(`Retención DIFF: ${config.retentionDiffDays} días`);
  printInfo(`Compresión: ${config.compression ? 'Habilitada' : 'Deshabilitada'}`);
  printInfo(`Checksum: ${config.checksum ? 'Habilitado' : 'Deshabilitado'}`);
  
  // Verificar que el directorio existe o se puede crear
  try {
    if (!existsSync(config.backupPath)) {
      printInfo('Directorio no existe, se creará automáticamente');
    } else {
      printSuccess('Directorio de respaldos existe');
    }
  } catch (err) {
    printError(`Error al verificar directorio: ${err.message}`);
    return false;
  }
  
  return true;
}

/**
 * Prueba 2: Crear respaldo completo (FULL)
 */
async function testFullBackup() {
  printTestHeader('TEST 2: Crear Respaldo Completo (FULL)');
  
  try {
    printInfo('Iniciando respaldo completo...');
    
    const result = await backupService.createFullBackup();
    
    printSuccess('Respaldo completo creado exitosamente');
    printInfo(`Archivo: ${result.fileName}`);
    printInfo(`Tamaño: ${result.size} MB`);
    printInfo(`Duración: ${result.duration}s`);
    printInfo(`Timestamp: ${result.timestamp.toISOString()}`);
    
    // Verificar que el archivo existe
    if (existsSync(result.filePath)) {
      printSuccess('Archivo de respaldo verificado en disco');
    } else {
      printError('Archivo de respaldo no encontrado en disco');
      return null;
    }
    
    return result;
    
  } catch (err) {
    printError(`Error al crear respaldo completo: ${err.message}`);
    console.error('Detalles del error:', err);
    return null;
  }
}

/**
 * Prueba 3: Verificar integridad del respaldo
 */
async function testVerifyBackup(filePath) {
  printTestHeader('TEST 3: Verificar Integridad del Respaldo');
  
  if (!filePath) {
    printError('No hay archivo de respaldo para verificar');
    return false;
  }
  
  try {
    printInfo(`Verificando: ${filePath}`);
    
    const isValid = await backupService.verifyBackup(filePath);
    
    if (isValid) {
      printSuccess('Respaldo verificado correctamente (RESTORE VERIFYONLY exitoso)');
    } else {
      printError('Respaldo NO pasó la verificación de integridad');
    }
    
    return isValid;
    
  } catch (err) {
    printError(`Error al verificar respaldo: ${err.message}`);
    return false;
  }
}

/**
 * Prueba 4: Crear respaldo diferencial (DIFF)
 */
async function testDifferentialBackup() {
  printTestHeader('TEST 4: Crear Respaldo Diferencial (DIFF)');
  
  try {
    printInfo('Iniciando respaldo diferencial...');
    
    const result = await backupService.createDifferentialBackup();
    
    printSuccess('Respaldo diferencial creado exitosamente');
    printInfo(`Archivo: ${result.fileName}`);
    printInfo(`Tamaño: ${result.size} MB`);
    printInfo(`Duración: ${result.duration}s`);
    printInfo(`Timestamp: ${result.timestamp.toISOString()}`);
    
    // Verificar que el archivo existe
    if (existsSync(result.filePath)) {
      printSuccess('Archivo de respaldo verificado en disco');
    } else {
      printError('Archivo de respaldo no encontrado en disco');
      return null;
    }
    
    return result;
    
  } catch (err) {
    printError(`Error al crear respaldo diferencial: ${err.message}`);
    console.error('Detalles del error:', err);
    return null;
  }
}

/**
 * Prueba 5: Obtener estadísticas
 */
async function testGetStats() {
  printTestHeader('TEST 5: Obtener Estadísticas');
  
  try {
    const stats = await backupService.getBackupStats();
    
    printSuccess('Estadísticas obtenidas exitosamente');
    printInfo(`Directorio: ${stats.directory}`);
    printInfo(`Total archivos: ${stats.totalFiles}`);
    printInfo(`Respaldos FULL: ${stats.fullBackups}`);
    printInfo(`Respaldos DIFF: ${stats.diffBackups}`);
    printInfo(`Tamaño total: ${stats.totalSizeMB} MB`);
    
    if (stats.oldest) {
      printInfo(`Más antiguo: ${stats.oldest.name} (${stats.oldest.ageDays} días)`);
    }
    
    if (stats.newest) {
      printInfo(`Más reciente: ${stats.newest.name} (${stats.newest.ageDays} días)`);
    }
    
    printInfo(`Política retención FULL: ${stats.retentionFullDays} días`);
    printInfo(`Política retención DIFF: ${stats.retentionDiffDays} días`);
    
    return stats;
    
  } catch (err) {
    printError(`Error al obtener estadísticas: ${err.message}`);
    return null;
  }
}

/**
 * Prueba 6: Limpieza de respaldos antiguos
 */
async function testCleanOldBackups() {
  printTestHeader('TEST 6: Limpieza de Respaldos Antiguos');
  
  try {
    printInfo('Iniciando limpieza de respaldos antiguos...');
    
    const result = await backupService.cleanOldBackups();
    
    if (result.success) {
      printSuccess('Limpieza completada exitosamente');
      printInfo(`Archivos eliminados: ${result.deletedCount}`);
      printInfo(`Espacio liberado: ${result.freedSpace} MB`);
      
      if (result.deletedFiles && result.deletedFiles.length > 0) {
        printInfo('Archivos eliminados:');
        result.deletedFiles.forEach(f => {
          console.log(`  - ${f.file} (${f.sizeMB} MB, ${f.ageDays} días)`);
        });
      } else {
        printInfo('No hay archivos antiguos para eliminar');
      }
    } else {
      printError('Limpieza falló');
    }
    
    return result;
    
  } catch (err) {
    printError(`Error al limpiar respaldos: ${err.message}`);
    return null;
  }
}

/**
 * Prueba 7: Ciclo completo de respaldo
 */
async function testBackupCycle() {
  printTestHeader('TEST 7: Ciclo Completo de Respaldo');
  
  try {
    printInfo('Ejecutando ciclo completo de respaldo FULL...');
    
    const result = await backupService.runBackupCycle('full');
    
    if (result.success) {
      printSuccess('Ciclo completo ejecutado exitosamente');
      printInfo(`Duración total: ${result.totalDuration}s`);
      printInfo(`Backup: ${result.backup.fileName} (${result.backup.size} MB)`);
      printInfo(`Verificado: ${result.verified ? 'Sí' : 'No'}`);
      printInfo(`Archivos limpiados: ${result.cleaned.deletedCount}`);
      printInfo(`Espacio liberado: ${result.cleaned.freedSpace} MB`);
    } else {
      printError('Ciclo completo falló');
    }
    
    return result;
    
  } catch (err) {
    printError(`Error en ciclo completo: ${err.message}`);
    return null;
  }
}

// ============================================
// SCRIPT PRINCIPAL
// ============================================

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║       PRUEBA COMPLETA DEL SISTEMA DE RESPALDOS            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const results = {
    configuration: false,
    fullBackup: false,
    verifyFull: false,
    diffBackup: false,
    verifyDiff: false,
    stats: false,
    cleanup: false,
    cycle: false
  };
  
  try {
    // Test 1: Configuración
    results.configuration = await testConfiguration();
    
    if (!results.configuration) {
      throw new Error('Configuración inválida, abortando pruebas');
    }
    
    // Test 2: Respaldo completo
    const fullBackup = await testFullBackup();
    results.fullBackup = fullBackup !== null;
    
    // Test 3: Verificar respaldo completo
    if (fullBackup) {
      results.verifyFull = await testVerifyBackup(fullBackup.filePath);
    }
    
    // Test 4: Respaldo diferencial
    const diffBackup = await testDifferentialBackup();
    results.diffBackup = diffBackup !== null;
    
    // Test 5: Verificar respaldo diferencial
    if (diffBackup) {
      results.verifyDiff = await testVerifyBackup(diffBackup.filePath);
    }
    
    // Test 6: Estadísticas
    const stats = await testGetStats();
    results.stats = stats !== null;
    
    // Test 7: Limpieza
    const cleanup = await testCleanOldBackups();
    results.cleanup = cleanup !== null;
    
    // Test 8: Ciclo completo (comentado para no duplicar archivos)
    // const cycle = await testBackupCycle();
    // results.cycle = cycle !== null;
    
    // Resumen de resultados
    printSeparator();
    printTestHeader('RESUMEN DE PRUEBAS');
    
    console.log(`1. Configuración:          ${results.configuration ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`2. Respaldo FULL:          ${results.fullBackup ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`3. Verificación FULL:      ${results.verifyFull ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`4. Respaldo DIFF:          ${results.diffBackup ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`5. Verificación DIFF:      ${results.verifyDiff ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`6. Estadísticas:           ${results.stats ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`7. Limpieza:               ${results.cleanup ? '✅ PASS' : '❌ FAIL'}`);
    // console.log(`8. Ciclo completo:         ${results.cycle ? '✅ PASS' : '❌ FAIL'}`);
    
    const totalTests = Object.keys(results).length;
    const passedTests = Object.values(results).filter(r => r === true).length;
    const successRate = ((passedTests / totalTests) * 100).toFixed(1);
    
    printSeparator();
    console.log(`📊 Resultados: ${passedTests}/${totalTests} pruebas exitosas (${successRate}%)`);
    
    if (passedTests === totalTests) {
      printSuccess('TODAS LAS PRUEBAS PASARON ✨');
      console.log('\n💡 El sistema de respaldos está funcionando correctamente');
      console.log('💡 Los respaldos se ejecutarán automáticamente en producción');
      console.log('💡 Consulta BACKUP.md para más información\n');
    } else {
      printError('ALGUNAS PRUEBAS FALLARON');
      console.log('\n💡 Revisa los errores anteriores para más detalles');
      console.log('💡 Verifica la configuración en .env');
      console.log('💡 Asegúrate de que SQL Server esté corriendo\n');
      process.exit(1);
    }
    
  } catch (err) {
    printSeparator();
    printError(`Error fatal en las pruebas: ${err.message}`);
    console.error('Detalles:', err);
    process.exit(1);
  }
}

// Ejecutar pruebas
main().catch(err => {
  console.error('Error no controlado:', err);
  process.exit(1);
});
