import pino from 'pino';
import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import pinoms from 'pino-roll';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Configuración de logs desde variables de entorno
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_RETENTION_DAYS = parseInt(process.env.LOG_RETENTION_DAYS || '30', 10);
const isProduction = process.env.NODE_ENV === 'production';

// Crear directorio de logs si no existe
const logsDir = join(rootDir, 'logs');
await mkdir(logsDir, { recursive: true });

/**
 * Configuración del logger con rotación automática
 * 
 * Características:
 * - Rotación diaria automática
 * - Archivos por nivel (info, warn, error)
 * - Formato: logs/app-YYYY-MM-DD.log
 * - Retención: 30 días por defecto (configurable)
 * - Pretty print en desarrollo
 * - JSON estructurado en producción
 */

// Configuración base del logger
const loggerConfig = {
  level: LOG_LEVEL,
  formatters: {
    level: (label) => {
      return { level: label };
    }
  },
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  // Serializers personalizados para objetos comunes
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      headers: {
        host: req.headers.host,
        'user-agent': req.headers['user-agent']
      },
      remoteAddress: req.ip || req.connection?.remoteAddress
    }),
    res: (res) => ({
      statusCode: res.statusCode,
      headers: res.getHeaders ? res.getHeaders() : {}
    }),
    err: pino.stdSerializers.err
  }
};

let logger;

if (isProduction) {
  // Producción: Logs a archivos con rotación
  const transport = pinoms({
    file: join(logsDir, 'app'),
    extension: '.log',
    frequency: 'daily', // Rotar diariamente
    size: '10M', // También rotar si excede 10MB
    dateFormat: 'YYYY-MM-DD',
    // Mantener logs según configuración
    limit: {
      count: LOG_RETENTION_DAYS
    }
  });
  
  logger = pino(loggerConfig, transport);
  
  // Log de inicio
  logger.info({
    msg: 'Logger inicializado en modo producción',
    config: {
      level: LOG_LEVEL,
      retentionDays: LOG_RETENTION_DAYS,
      logsDir
    }
  });
} else {
  // Desarrollo: Pretty print en consola + archivo opcional
  const streams = [];
  
  // Stream a consola con pretty print
  streams.push({
    level: LOG_LEVEL,
    stream: pino.transport({
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
        singleLine: false
      }
    })
  });
  
  // Stream a archivo en desarrollo (opcional, útil para debugging)
  if (process.env.LOG_TO_FILE === 'true') {
    const devLogFile = join(logsDir, `dev-${new Date().toISOString().split('T')[0]}.log`);
    streams.push({
      level: 'trace',
      stream: createWriteStream(devLogFile, { flags: 'a' })
    });
  }
  
  logger = pino(loggerConfig, pino.multistream(streams));
  
  logger.info('🔧 Logger inicializado en modo desarrollo');
  if (process.env.LOG_TO_FILE === 'true') {
    logger.info(`📁 Logs guardándose en: ${logsDir}`);
  }
}

/**
 * Función helper para limpiar logs antiguos manualmente
 * (La rotación automática ya maneja esto, pero útil para mantenimiento)
 */
export async function cleanOldLogs() {
  try {
    const { readdir, stat, unlink } = await import('fs/promises');
    const files = await readdir(logsDir);
    const now = Date.now();
    const maxAge = LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000; // días a milisegundos
    
    let deletedCount = 0;
    
    for (const file of files) {
      if (!file.endsWith('.log')) continue;
      
      const filePath = join(logsDir, file);
      const stats = await stat(filePath);
      const age = now - stats.mtimeMs;
      
      if (age > maxAge) {
        await unlink(filePath);
        deletedCount++;
        logger.info(`🗑️ Log antiguo eliminado: ${file}`);
      }
    }
    
    if (deletedCount > 0) {
      logger.info(`✅ Limpieza completada: ${deletedCount} archivos eliminados`);
    } else {
      logger.debug('✅ Limpieza completada: sin archivos antiguos');
    }
    
    return deletedCount;
  } catch (err) {
    logger.error('❌ Error limpiando logs antiguos:', err);
    throw err;
  }
}

/**
 * Función helper para obtener estadísticas de logs
 */
export async function getLogStats() {
  try {
    const { readdir, stat } = await import('fs/promises');
    const files = await readdir(logsDir);
    
    let totalSize = 0;
    let totalFiles = 0;
    const filesByDate = {};
    
    for (const file of files) {
      if (!file.endsWith('.log')) continue;
      
      const filePath = join(logsDir, file);
      const stats = await stat(filePath);
      
      totalSize += stats.size;
      totalFiles++;
      
      const date = new Date(stats.mtime).toISOString().split('T')[0];
      if (!filesByDate[date]) {
        filesByDate[date] = { count: 0, size: 0 };
      }
      filesByDate[date].count++;
      filesByDate[date].size += stats.size;
    }
    
    return {
      totalFiles,
      totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      logsDir,
      retentionDays: LOG_RETENTION_DAYS,
      filesByDate
    };
  } catch (err) {
    logger.error('❌ Error obteniendo estadísticas de logs:', err);
    throw err;
  }
}

export default logger;