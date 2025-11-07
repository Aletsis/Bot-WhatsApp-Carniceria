/**
 * Servicio de Respaldo de Base de Datos
 * 
 * Proporciona funciones para crear, verificar y gestionar respaldos
 * de la base de datos SQL Server de forma programática.
 * 
 * @module services/backupService
 */

import sql from 'mssql';
import { join } from 'path';
import { existsSync, mkdirSync, statSync, unlinkSync, readdirSync } from 'fs';
import logger from '../logger.js';
import dbService from './dbService.js';

// ============================================
// CONFIGURACIÓN
// ============================================

const BACKUP_CONFIG = {
  backupPath: process.env.BACKUP_PATH || 'C:\\Backups\\CarniceriaDB',
  retentionFullDays: parseInt(process.env.BACKUP_RETENTION_FULL_DAYS || '7'),
  retentionDiffDays: parseInt(process.env.BACKUP_RETENTION_DIFF_DAYS || '30'),
  compression: process.env.BACKUP_COMPRESSION === 'true',
  checksum: process.env.BACKUP_CHECKSUM === 'true',
  continueAfterError: false
};

// ============================================
// FUNCIONES AUXILIARES
// ============================================

/**
 * Asegura que el directorio de respaldos exista
 * @private
 */
function ensureBackupDirectory() {
  try {
    if (!existsSync(BACKUP_CONFIG.backupPath)) {
      mkdirSync(BACKUP_CONFIG.backupPath, { recursive: true });
      logger.info({ path: BACKUP_CONFIG.backupPath }, 'Directorio de respaldos creado');
    }
  } catch (error) {
    logger.error({ error, path: BACKUP_CONFIG.backupPath }, 'Error al crear directorio de respaldos');
    throw error;
  }
}

/**
 * Genera nombre de archivo de respaldo
 * @private
 * @param {string} type - 'FULL' o 'DIFF'
 * @returns {string} Nombre del archivo
 */
function generateBackupFileName(type) {
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .substring(0, 19);
  
  const dbName = process.env.DB_NAME || 'CarniceriaDB';
  return `${dbName}_${type}_${timestamp}.bak`;
}

// ============================================
// FUNCIONES PÚBLICAS
// ============================================

/**
 * Crea un respaldo completo (FULL) de la base de datos
 * @returns {Promise<Object>} Información del respaldo creado
 * @throws {Error} Si falla la creación del respaldo
 */
export async function createFullBackup() {
  const fileName = generateBackupFileName('FULL');
  const filePath = join(BACKUP_CONFIG.backupPath, fileName);
  const dbName = process.env.DB_NAME || 'CarniceriaDB';
  
  logger.info({ fileName, dbName }, 'Iniciando respaldo completo (FULL)');
  
  const startTime = Date.now();
  
  try {
    ensureBackupDirectory();
    
    // Construir comando BACKUP DATABASE
    let backupCommand = `
      BACKUP DATABASE [${dbName}]
      TO DISK = N'${filePath}'
      WITH FORMAT, INIT, SKIP, NOREWIND, NOUNLOAD, STATS = 10
    `;
    
    if (BACKUP_CONFIG.compression) {
      backupCommand += ', COMPRESSION';
    }
    if (BACKUP_CONFIG.checksum) {
      backupCommand += ', CHECKSUM';
    }
    backupCommand += BACKUP_CONFIG.continueAfterError 
      ? ', CONTINUE_AFTER_ERROR' 
      : ', STOP_ON_ERROR';
    
    // Ejecutar backup
    const pool = await dbService.getPool();
    await pool.request().query(backupCommand);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const fileSize = existsSync(filePath) 
      ? (statSync(filePath).size / (1024 * 1024)).toFixed(2) 
      : 'N/A';
    
    const result = {
      success: true,
      type: 'FULL',
      fileName,
      filePath,
      size: fileSize,
      duration,
      timestamp: new Date()
    };
    
    logger.info({ 
      fileName, 
      size: `${fileSize} MB`, 
      duration: `${duration}s` 
    }, 'Respaldo completo creado exitosamente');
    
    return result;
    
  } catch (error) {
    logger.error({ error, fileName }, 'Error al crear respaldo completo');
    throw new Error(`Error al crear respaldo completo: ${error.message}`);
  }
}

/**
 * Crea un respaldo diferencial (DIFFERENTIAL) de la base de datos
 * @returns {Promise<Object>} Información del respaldo creado
 * @throws {Error} Si falla la creación del respaldo o no existe FULL previo
 */
export async function createDifferentialBackup() {
  const fileName = generateBackupFileName('DIFF');
  const filePath = join(BACKUP_CONFIG.backupPath, fileName);
  const dbName = process.env.DB_NAME || 'CarniceriaDB';
  
  logger.info({ fileName, dbName }, 'Iniciando respaldo diferencial (DIFF)');
  
  const startTime = Date.now();
  
  try {
    ensureBackupDirectory();
    
    // Verificar que existe un backup FULL previo
    const fullBackups = readdirSync(BACKUP_CONFIG.backupPath)
      .filter(f => f.includes('_FULL_') && f.endsWith('.bak'));
    
    if (fullBackups.length === 0) {
      throw new Error('No existe respaldo FULL previo. Debe crear un respaldo completo primero.');
    }
    
    // Construir comando BACKUP DATABASE DIFFERENTIAL
    let backupCommand = `
      BACKUP DATABASE [${dbName}]
      TO DISK = N'${filePath}'
      WITH DIFFERENTIAL, FORMAT, INIT, SKIP, NOREWIND, NOUNLOAD, STATS = 10
    `;
    
    if (BACKUP_CONFIG.compression) {
      backupCommand += ', COMPRESSION';
    }
    if (BACKUP_CONFIG.checksum) {
      backupCommand += ', CHECKSUM';
    }
    backupCommand += BACKUP_CONFIG.continueAfterError 
      ? ', CONTINUE_AFTER_ERROR' 
      : ', STOP_ON_ERROR';
    
    // Ejecutar backup
    const pool = await dbService.getPool();
    await pool.request().query(backupCommand);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const fileSize = existsSync(filePath) 
      ? (statSync(filePath).size / (1024 * 1024)).toFixed(2) 
      : 'N/A';
    
    const result = {
      success: true,
      type: 'DIFF',
      fileName,
      filePath,
      size: fileSize,
      duration,
      timestamp: new Date()
    };
    
    logger.info({ 
      fileName, 
      size: `${fileSize} MB`, 
      duration: `${duration}s` 
    }, 'Respaldo diferencial creado exitosamente');
    
    return result;
    
  } catch (error) {
    logger.error({ error, fileName }, 'Error al crear respaldo diferencial');
    throw new Error(`Error al crear respaldo diferencial: ${error.message}`);
  }
}

/**
 * Verifica la integridad de un respaldo
 * @param {string} filePath - Ruta del archivo de respaldo
 * @returns {Promise<boolean>} True si el respaldo es válido
 */
export async function verifyBackup(filePath) {
  logger.info({ filePath }, 'Verificando integridad del respaldo');
  
  try {
    const pool = await dbService.getPool();
    await pool.request().query(`
      RESTORE VERIFYONLY
      FROM DISK = N'${filePath}'
      WITH CHECKSUM
    `);
    
    logger.info({ filePath }, 'Respaldo verificado correctamente');
    return true;
    
  } catch (error) {
    logger.error({ error, filePath }, 'Error al verificar respaldo');
    return false;
  }
}

/**
 * Limpia respaldos antiguos según políticas de retención
 * @returns {Promise<Object>} Información sobre la limpieza realizada
 */
export async function cleanOldBackups() {
  logger.info('Iniciando limpieza de respaldos antiguos');
  
  const now = Date.now();
  const fullRetentionMs = BACKUP_CONFIG.retentionFullDays * 24 * 60 * 60 * 1000;
  const diffRetentionMs = BACKUP_CONFIG.retentionDiffDays * 24 * 60 * 60 * 1000;
  
  let deletedCount = 0;
  let freedSpace = 0;
  const deletedFiles = [];
  
  try {
    if (!existsSync(BACKUP_CONFIG.backupPath)) {
      logger.warn({ path: BACKUP_CONFIG.backupPath }, 'Directorio de respaldos no existe');
      return { success: true, deletedCount: 0, freedSpace: '0.00' };
    }
    
    const files = readdirSync(BACKUP_CONFIG.backupPath);
    
    for (const file of files) {
      if (!file.endsWith('.bak')) continue;
      
      const filePath = join(BACKUP_CONFIG.backupPath, file);
      const stats = statSync(filePath);
      const fileAge = now - stats.mtimeMs;
      const ageDays = Math.floor(fileAge / (24 * 60 * 60 * 1000));
      
      // Determinar si debe eliminarse
      let shouldDelete = false;
      
      if (file.includes('_FULL_') && fileAge > fullRetentionMs) {
        shouldDelete = true;
      } else if (file.includes('_DIFF_') && fileAge > diffRetentionMs) {
        shouldDelete = true;
      }
      
      if (shouldDelete) {
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        
        unlinkSync(filePath);
        deletedCount++;
        freedSpace += stats.size;
        
        deletedFiles.push({ file, sizeMB, ageDays });
        
        logger.info({ 
          file, 
          size: `${sizeMB} MB`, 
          age: `${ageDays} días` 
        }, 'Respaldo antiguo eliminado');
      }
    }
    
    const freedSpaceMB = (freedSpace / (1024 * 1024)).toFixed(2);
    
    logger.info({ 
      deletedCount, 
      freedSpace: `${freedSpaceMB} MB` 
    }, 'Limpieza de respaldos completada');
    
    return {
      success: true,
      deletedCount,
      freedSpace: freedSpaceMB,
      deletedFiles
    };
    
  } catch (error) {
    logger.error({ error }, 'Error al limpiar respaldos antiguos');
    
    return {
      success: false,
      deletedCount,
      freedSpace: (freedSpace / (1024 * 1024)).toFixed(2),
      error: error.message
    };
  }
}

/**
 * Obtiene estadísticas de los respaldos existentes
 * @returns {Promise<Object>} Estadísticas de respaldos
 */
export async function getBackupStats() {
  try {
    if (!existsSync(BACKUP_CONFIG.backupPath)) {
      return {
        directory: BACKUP_CONFIG.backupPath,
        exists: false,
        totalFiles: 0,
        fullBackups: 0,
        diffBackups: 0,
        totalSizeMB: '0.00'
      };
    }
    
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
    
    const stats = {
      directory: BACKUP_CONFIG.backupPath,
      exists: true,
      totalFiles: backupFiles.length,
      fullBackups: fullCount,
      diffBackups: diffCount,
      totalSizeMB,
      oldest: oldestFile ? {
        name: oldestFile.name,
        ageDays: Math.floor((Date.now() - oldestFile.time) / (24 * 60 * 60 * 1000))
      } : null,
      newest: newestFile ? {
        name: newestFile.name,
        ageDays: Math.floor((Date.now() - newestFile.time) / (24 * 60 * 60 * 1000))
      } : null,
      retentionFullDays: BACKUP_CONFIG.retentionFullDays,
      retentionDiffDays: BACKUP_CONFIG.retentionDiffDays
    };
    
    logger.debug({ stats }, 'Estadísticas de respaldos obtenidas');
    
    return stats;
    
  } catch (error) {
    logger.error({ error }, 'Error al obtener estadísticas de respaldos');
    throw new Error(`Error al obtener estadísticas: ${error.message}`);
  }
}

/**
 * Ejecuta un ciclo completo de respaldo: crear, verificar y limpiar
 * @param {string} type - Tipo de respaldo: 'full' o 'diff'
 * @returns {Promise<Object>} Resultado del proceso completo
 */
export async function runBackupCycle(type = 'full') {
  const startTime = Date.now();
  
  logger.info({ type }, 'Iniciando ciclo de respaldo completo');
  
  try {
    // Crear respaldo
    const backupResult = type === 'full' 
      ? await createFullBackup() 
      : await createDifferentialBackup();
    
    // Verificar respaldo
    const isValid = await verifyBackup(backupResult.filePath);
    
    if (!isValid) {
      throw new Error('La verificación del respaldo falló');
    }
    
    // Limpiar respaldos antiguos
    const cleanResult = await cleanOldBackups();
    
    // Obtener estadísticas finales
    const stats = await getBackupStats();
    
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    logger.info({ 
      type, 
      duration: `${totalDuration}s`,
      backupSize: `${backupResult.size} MB`,
      cleanedFiles: cleanResult.deletedCount
    }, 'Ciclo de respaldo completado exitosamente');
    
    return {
      success: true,
      backup: backupResult,
      verified: isValid,
      cleaned: cleanResult,
      stats,
      totalDuration
    };
    
  } catch (error) {
    logger.error({ error, type }, 'Error en ciclo de respaldo');
    throw error;
  }
}

// Exportar configuración para referencia
export const config = BACKUP_CONFIG;

// Exportar funciones por defecto
export default {
  createFullBackup,
  createDifferentialBackup,
  verifyBackup,
  cleanOldBackups,
  getBackupStats,
  runBackupCycle,
  config
};
