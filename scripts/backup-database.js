/**
 * Script de Respaldo de Base de Datos
 * 
 * Crea respaldos completos (FULL) y diferenciales (DIFFERENTIAL) de la base de datos
 * usando comandos nativos de SQL Server BACKUP DATABASE.
 * 
 * Uso:
 *   node scripts/backup-database.js [full|diff]
 * 
 * Ejemplos:
 *   node scripts/backup-database.js full       # Respaldo completo
 *   node scripts/backup-database.js diff       # Respaldo diferencial
 *   node scripts/backup-database.js            # Respaldo completo (por defecto)
 */

import sql from 'mssql';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, statSync, unlinkSync, readdirSync } from 'fs';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '..', '.env') });

// ============================================
// CONFIGURACIÓN
// ============================================

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433'),
  database: process.env.DB_NAME || 'CarniceriaDB',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    requestTimeout: 300000 // 5 minutos para backups grandes
  }
};

const BACKUP_CONFIG = {
  // Directorio de respaldos (relativo al servidor SQL Server)
  backupPath: process.env.BACKUP_PATH || 'C:\\Backups\\CarniceriaDB',
  
  // Retención en días
  retentionFullDays: parseInt(process.env.BACKUP_RETENTION_FULL_DAYS || '7'),
  retentionDiffDays: parseInt(process.env.BACKUP_RETENTION_DIFF_DAYS || '30'),
  
  // Opciones de backup
  compression: true,
  checksum: true,
  continueAfterError: false
};

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

/**
 * Crea el directorio de respaldos si no existe
 */
function ensureBackupDirectory() {
  const localPath = BACKUP_CONFIG.backupPath;
  
  if (!existsSync(localPath)) {
    console.log(`📁 Creando directorio de respaldos: ${localPath}`);
    mkdirSync(localPath, { recursive: true });
  } else {
    console.log(`✅ Directorio de respaldos existe: ${localPath}`);
  }
}

/**
 * Genera nombre de archivo de respaldo
 * @param {string} type - 'FULL' o 'DIFF'
 * @returns {string} Nombre del archivo
 */
function generateBackupFileName(type) {
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .substring(0, 19);
  
  const dbName = config.database;
  return `${dbName}_${type}_${timestamp}.bak`;
}

/**
 * Crea respaldo completo (FULL)
 * @param {sql.ConnectionPool} pool - Pool de conexión a SQL Server
 * @returns {Promise<Object>} Información del respaldo
 */
async function createFullBackup(pool) {
  const fileName = generateBackupFileName('FULL');
  const filePath = join(BACKUP_CONFIG.backupPath, fileName);
  
  console.log('\n🔵 Iniciando respaldo COMPLETO...');
  console.log(`📦 Base de datos: ${config.database}`);
  console.log(`📁 Destino: ${filePath}`);
  
  const startTime = Date.now();
  
  try {
    // Construir comando BACKUP DATABASE
    let backupCommand = `
      BACKUP DATABASE [${config.database}]
      TO DISK = N'${filePath}'
      WITH FORMAT, INIT, SKIP, NOREWIND, NOUNLOAD, STATS = 10
    `;
    
    // Agregar opciones
    if (BACKUP_CONFIG.compression) {
      backupCommand += ', COMPRESSION';
    }
    if (BACKUP_CONFIG.checksum) {
      backupCommand += ', CHECKSUM';
    }
    if (BACKUP_CONFIG.continueAfterError) {
      backupCommand += ', CONTINUE_AFTER_ERROR';
    } else {
      backupCommand += ', STOP_ON_ERROR';
    }
    
    // Ejecutar backup
    await pool.request().query(backupCommand);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    // Obtener tamaño del archivo
    const fileSize = existsSync(filePath) 
      ? (statSync(filePath).size / (1024 * 1024)).toFixed(2) 
      : 'N/A';
    
    console.log(`✅ Respaldo completo creado exitosamente`);
    console.log(`⏱️  Duración: ${duration}s`);
    console.log(`💾 Tamaño: ${fileSize} MB`);
    
    return {
      success: true,
      type: 'FULL',
      fileName,
      filePath,
      size: fileSize,
      duration,
      timestamp: new Date()
    };
    
  } catch (error) {
    console.error(`❌ Error al crear respaldo completo:`, error.message);
    throw error;
  }
}

/**
 * Crea respaldo diferencial (DIFFERENTIAL)
 * @param {sql.ConnectionPool} pool - Pool de conexión a SQL Server
 * @returns {Promise<Object>} Información del respaldo
 */
async function createDifferentialBackup(pool) {
  const fileName = generateBackupFileName('DIFF');
  const filePath = join(BACKUP_CONFIG.backupPath, fileName);
  
  console.log('\n🟡 Iniciando respaldo DIFERENCIAL...');
  console.log(`📦 Base de datos: ${config.database}`);
  console.log(`📁 Destino: ${filePath}`);
  
  const startTime = Date.now();
  
  try {
    // Verificar que existe un backup FULL previo
    const fullBackups = readdirSync(BACKUP_CONFIG.backupPath)
      .filter(f => f.includes('_FULL_') && f.endsWith('.bak'));
    
    if (fullBackups.length === 0) {
      throw new Error('No existe respaldo FULL previo. Debe crear un respaldo completo primero.');
    }
    
    // Construir comando BACKUP DATABASE DIFFERENTIAL
    let backupCommand = `
      BACKUP DATABASE [${config.database}]
      TO DISK = N'${filePath}'
      WITH DIFFERENTIAL, FORMAT, INIT, SKIP, NOREWIND, NOUNLOAD, STATS = 10
    `;
    
    // Agregar opciones
    if (BACKUP_CONFIG.compression) {
      backupCommand += ', COMPRESSION';
    }
    if (BACKUP_CONFIG.checksum) {
      backupCommand += ', CHECKSUM';
    }
    if (BACKUP_CONFIG.continueAfterError) {
      backupCommand += ', CONTINUE_AFTER_ERROR';
    } else {
      backupCommand += ', STOP_ON_ERROR';
    }
    
    // Ejecutar backup
    await pool.request().query(backupCommand);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    // Obtener tamaño del archivo
    const fileSize = existsSync(filePath) 
      ? (statSync(filePath).size / (1024 * 1024)).toFixed(2) 
      : 'N/A';
    
    console.log(`✅ Respaldo diferencial creado exitosamente`);
    console.log(`⏱️  Duración: ${duration}s`);
    console.log(`💾 Tamaño: ${fileSize} MB`);
    
    return {
      success: true,
      type: 'DIFF',
      fileName,
      filePath,
      size: fileSize,
      duration,
      timestamp: new Date()
    };
    
  } catch (error) {
    console.error(`❌ Error al crear respaldo diferencial:`, error.message);
    throw error;
  }
}

/**
 * Verifica la integridad de un respaldo
 * @param {sql.ConnectionPool} pool - Pool de conexión a SQL Server
 * @param {string} filePath - Ruta del archivo de respaldo
 * @returns {Promise<boolean>} True si es válido
 */
async function verifyBackup(pool, filePath) {
  console.log('\n🔍 Verificando integridad del respaldo...');
  console.log(`📁 Archivo: ${filePath}`);
  
  try {
    await pool.request().query(`
      RESTORE VERIFYONLY
      FROM DISK = N'${filePath}'
      WITH CHECKSUM
    `);
    
    console.log(`✅ Respaldo verificado correctamente`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error al verificar respaldo:`, error.message);
    return false;
  }
}

/**
 * Limpia respaldos antiguos según políticas de retención
 * @returns {Promise<Object>} Información de limpieza
 */
async function cleanOldBackups() {
  console.log('\n🧹 Limpiando respaldos antiguos...');
  
  const now = Date.now();
  const fullRetentionMs = BACKUP_CONFIG.retentionFullDays * 24 * 60 * 60 * 1000;
  const diffRetentionMs = BACKUP_CONFIG.retentionDiffDays * 24 * 60 * 60 * 1000;
  
  let deletedCount = 0;
  let freedSpace = 0;
  
  try {
    const files = readdirSync(BACKUP_CONFIG.backupPath);
    
    for (const file of files) {
      if (!file.endsWith('.bak')) continue;
      
      const filePath = join(BACKUP_CONFIG.backupPath, file);
      const stats = statSync(filePath);
      const fileAge = now - stats.mtimeMs;
      
      // Determinar si debe eliminarse
      let shouldDelete = false;
      
      if (file.includes('_FULL_') && fileAge > fullRetentionMs) {
        shouldDelete = true;
      } else if (file.includes('_DIFF_') && fileAge > diffRetentionMs) {
        shouldDelete = true;
      }
      
      if (shouldDelete) {
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`  🗑️  Eliminando: ${file} (${sizeMB} MB, ${Math.floor(fileAge / (24 * 60 * 60 * 1000))} días)`);
        
        unlinkSync(filePath);
        deletedCount++;
        freedSpace += stats.size;
      }
    }
    
    const freedSpaceMB = (freedSpace / (1024 * 1024)).toFixed(2);
    
    console.log(`✅ Limpieza completada`);
    console.log(`📊 Archivos eliminados: ${deletedCount}`);
    console.log(`💾 Espacio liberado: ${freedSpaceMB} MB`);
    
    return {
      success: true,
      deletedCount,
      freedSpace: freedSpaceMB
    };
    
  } catch (error) {
    console.error(`❌ Error al limpiar respaldos:`, error.message);
    return {
      success: false,
      deletedCount,
      freedSpace: (freedSpace / (1024 * 1024)).toFixed(2),
      error: error.message
    };
  }
}

/**
 * Obtiene estadísticas de respaldos
 * @returns {Promise<Object>} Estadísticas
 */
async function getBackupStats() {
  console.log('\n📊 Estadísticas de respaldos:');
  
  try {
    const files = readdirSync(BACKUP_CONFIG.backupPath);
    const backupFiles = files.filter(f => f.endsWith('.bak'));
    
    let fullCount = 0;
    let diffCount = 0;
    let totalSize = 0;
    let oldestFile = null;
    let newestFile = null;
    
    for (const file of backupFiles) {
      const filePath = join(BACKUP_CONFIG.backupPath, file);
      const stats = statSync(filePath);
      
      if (file.includes('_FULL_')) fullCount++;
      if (file.includes('_DIFF_')) diffCount++;
      
      totalSize += stats.size;
      
      if (!oldestFile || stats.mtimeMs < oldestFile.time) {
        oldestFile = { name: file, time: stats.mtimeMs };
      }
      if (!newestFile || stats.mtimeMs > newestFile.time) {
        newestFile = { name: file, time: stats.mtimeMs };
      }
    }
    
    const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
    
    console.log(`  📁 Directorio: ${BACKUP_CONFIG.backupPath}`);
    console.log(`  📦 Total archivos: ${backupFiles.length}`);
    console.log(`  🔵 Respaldos FULL: ${fullCount}`);
    console.log(`  🟡 Respaldos DIFF: ${diffCount}`);
    console.log(`  💾 Tamaño total: ${totalSizeMB} MB`);
    
    if (oldestFile) {
      const age = Math.floor((Date.now() - oldestFile.time) / (24 * 60 * 60 * 1000));
      console.log(`  📅 Más antiguo: ${oldestFile.name} (${age} días)`);
    }
    if (newestFile) {
      const age = Math.floor((Date.now() - newestFile.time) / (24 * 60 * 60 * 1000));
      console.log(`  🆕 Más reciente: ${newestFile.name} (${age} días)`);
    }
    
    console.log(`  🔧 Retención FULL: ${BACKUP_CONFIG.retentionFullDays} días`);
    console.log(`  🔧 Retención DIFF: ${BACKUP_CONFIG.retentionDiffDays} días`);
    
    return {
      directory: BACKUP_CONFIG.backupPath,
      totalFiles: backupFiles.length,
      fullBackups: fullCount,
      diffBackups: diffCount,
      totalSizeMB,
      oldest: oldestFile?.name,
      newest: newestFile?.name
    };
    
  } catch (error) {
    console.error(`❌ Error al obtener estadísticas:`, error.message);
    return null;
  }
}

// ============================================
// SCRIPT PRINCIPAL
// ============================================

async function main() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   SISTEMA DE RESPALDO DE BASE DE DATOS    ║');
  console.log('╚════════════════════════════════════════════╝\n');
  
  const backupType = process.argv[2]?.toLowerCase() || 'full';
  
  if (!['full', 'diff', 'stats', 'clean'].includes(backupType)) {
    console.error('❌ Tipo de respaldo inválido. Usa: full, diff, stats o clean');
    process.exit(1);
  }
  
  // Validar configuración
  if (!config.user || !config.password || !config.database) {
    console.error('❌ Configuración de base de datos incompleta en .env');
    process.exit(1);
  }
  
  // Crear directorio de respaldos
  ensureBackupDirectory();
  
  // Si solo se piden estadísticas o limpieza, no conectar a BD
  if (backupType === 'stats') {
    await getBackupStats();
    console.log('\n✅ Proceso completado\n');
    process.exit(0);
  }
  
  if (backupType === 'clean') {
    await cleanOldBackups();
    console.log('\n✅ Proceso completado\n');
    process.exit(0);
  }
  
  // Conectar a SQL Server
  let pool;
  
  try {
    console.log('🔌 Conectando a SQL Server...');
    pool = await sql.connect(config);
    console.log('✅ Conectado exitosamente\n');
    
    let backupResult;
    
    // Ejecutar tipo de respaldo solicitado
    if (backupType === 'full') {
      backupResult = await createFullBackup(pool);
    } else if (backupType === 'diff') {
      backupResult = await createDifferentialBackup(pool);
    }
    
    // Verificar respaldo
    if (backupResult.success) {
      await verifyBackup(pool, backupResult.filePath);
    }
    
    // Limpiar respaldos antiguos
    await cleanOldBackups();
    
    // Mostrar estadísticas finales
    await getBackupStats();
    
    console.log('\n✅ Proceso de respaldo completado exitosamente\n');
    
  } catch (error) {
    console.error('\n❌ Error en el proceso de respaldo:', error.message);
    process.exit(1);
    
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔌 Conexión cerrada\n');
    }
  }
}

// Ejecutar script
main().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
