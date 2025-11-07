import { getPool } from '../services/dbService.js';
import logger from '../logger.js';
import os from 'os';
import { promisify } from 'util';
import { exec } from 'child_process';

const execPromise = promisify(exec);

/**
 * Health Check Controller
 * Proporciona endpoints para monitoreo del estado del sistema
 */

/**
 * Verifica el estado de la base de datos
 * @returns {Promise<{status: string, responseTime: number, error?: string}>}
 */
async function checkDatabaseHealth() {
  const start = Date.now();
  try {
    const pool = await getPool();
    await pool.request().query('SELECT 1 as HealthCheck');
    const responseTime = Date.now() - start;
    
    return {
      status: 'up',
      responseTime
    };
  } catch (err) {
    const responseTime = Date.now() - start;
    logger.error('[Health] Database check failed:', err.message);
    return {
      status: 'down',
      responseTime,
      error: err.message
    };
  }
}

/**
 * Verifica el estado de WhatsApp API
 * @returns {Promise<{status: string, responseTime: number, error?: string}>}
 */
async function checkWhatsAppHealth() {
  const start = Date.now();
  
  // Verificar que las variables de entorno necesarias existan
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.PHONE_NUMBER_ID;
  
  if (!token || !phoneNumberId) {
    return {
      status: 'not_configured',
      responseTime: Date.now() - start,
      error: 'WhatsApp credentials not configured'
    };
  }

  try {
    // Verificar conectividad con Meta API (sin hacer una llamada real para no generar costos)
    // Solo verificamos que las credenciales estén configuradas
    return {
      status: 'configured',
      responseTime: Date.now() - start
    };
  } catch (err) {
    const responseTime = Date.now() - start;
    logger.error('[Health] WhatsApp check failed:', err.message);
    return {
      status: 'error',
      responseTime,
      error: err.message
    };
  }
}

/**
 * Obtiene información del uso de disco
 * @returns {Promise<{status: string, usage: string, details?: any}>}
 */
async function checkDiskSpace() {
  try {
    let diskInfo;
    
    if (process.platform === 'win32') {
      // Windows: Usar WMIC para obtener espacio en disco
      const { stdout } = await execPromise('wmic logicaldisk get size,freespace,caption');
      const lines = stdout.trim().split('\n').filter(line => line.trim());
      
      if (lines.length > 1) {
        // Parsear la primera unidad (típicamente C:)
        const diskLine = lines[1].trim().split(/\s+/);
        if (diskLine.length >= 3) {
          const freeSpace = parseInt(diskLine[1], 10);
          const totalSpace = parseInt(diskLine[2], 10);
          const usedSpace = totalSpace - freeSpace;
          const usagePercent = ((usedSpace / totalSpace) * 100).toFixed(1);
          
          diskInfo = {
            total: `${(totalSpace / (1024 ** 3)).toFixed(2)} GB`,
            free: `${(freeSpace / (1024 ** 3)).toFixed(2)} GB`,
            used: `${(usedSpace / (1024 ** 3)).toFixed(2)} GB`,
            usagePercent: `${usagePercent}%`
          };
          
          const status = parseFloat(usagePercent) > 90 ? 'critical' : 
                        parseFloat(usagePercent) > 80 ? 'warning' : 'ok';
          
          return {
            status,
            usage: usagePercent,
            details: diskInfo
          };
        }
      }
    } else {
      // Linux/Mac: Usar df
      const { stdout } = await execPromise('df -h /');
      const lines = stdout.trim().split('\n');
      
      if (lines.length > 1) {
        const diskLine = lines[1].trim().split(/\s+/);
        const usagePercent = diskLine[4].replace('%', '');
        
        diskInfo = {
          filesystem: diskLine[0],
          size: diskLine[1],
          used: diskLine[2],
          available: diskLine[3],
          usagePercent: diskLine[4]
        };
        
        const status = parseFloat(usagePercent) > 90 ? 'critical' : 
                      parseFloat(usagePercent) > 80 ? 'warning' : 'ok';
        
        return {
          status,
          usage: usagePercent,
          details: diskInfo
        };
      }
    }
    
    // Fallback si no se puede obtener info
    return {
      status: 'unknown',
      usage: 'N/A',
      details: { error: 'Unable to determine disk space' }
    };
  } catch (err) {
    logger.error('[Health] Disk space check failed:', err.message);
    return {
      status: 'unknown',
      usage: 'N/A',
      details: { error: err.message }
    };
  }
}

/**
 * Obtiene información del uso de memoria
 * @returns {{status: string, usage: string, details: any}}
 */
function checkMemoryUsage() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const usagePercent = ((usedMemory / totalMemory) * 100).toFixed(1);
  
  const status = parseFloat(usagePercent) > 90 ? 'critical' : 
                parseFloat(usagePercent) > 80 ? 'warning' : 'ok';
  
  return {
    status,
    usage: `${usagePercent}%`,
    details: {
      total: `${(totalMemory / (1024 ** 3)).toFixed(2)} GB`,
      used: `${(usedMemory / (1024 ** 3)).toFixed(2)} GB`,
      free: `${(freeMemory / (1024 ** 3)).toFixed(2)} GB`,
      usagePercent: `${usagePercent}%`
    }
  };
}

/**
 * Endpoint principal de health check
 * GET /health
 * 
 * Verifica el estado de todos los servicios críticos:
 * - Base de datos
 * - WhatsApp API
 * - Espacio en disco
 * - Memoria
 * 
 * @param {Request} req 
 * @param {Response} res 
 */
export async function getHealth(req, res) {
  const startTime = Date.now();
  
  try {
    // Ejecutar todos los checks en paralelo
    const [database, whatsapp, disk, memory] = await Promise.all([
      checkDatabaseHealth(),
      checkWhatsAppHealth(),
      checkDiskSpace(),
      Promise.resolve(checkMemoryUsage())
    ]);
    
    // Determinar el estado general del sistema
    const hasDown = database.status === 'down';
    const hasCritical = disk.status === 'critical' || memory.status === 'critical';
    const hasWarning = disk.status === 'warning' || memory.status === 'warning';
    
    const overallStatus = hasDown ? 'unhealthy' :
                         hasCritical ? 'degraded' :
                         hasWarning ? 'healthy_with_warnings' :
                         'healthy';
    
    const statusCode = hasDown ? 503 : 200;
    
    const healthData = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: Date.now() - startTime,
      services: {
        database,
        whatsapp,
        disk,
        memory
      },
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        pid: process.pid,
        hostname: os.hostname()
      }
    };
    
    // Log solo si hay problemas
    if (statusCode === 503) {
      logger.warn('[Health] System unhealthy:', JSON.stringify(healthData, null, 2));
    }
    
    res.status(statusCode).json(healthData);
  } catch (err) {
    logger.error('[Health] Health check failed:', err.message);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: err.message
    });
  }
}

/**
 * Endpoint simplificado de health check
 * GET /health/live
 * 
 * Retorna solo si el servidor está vivo (liveness probe)
 */
export function getLiveness(req, res) {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
}

/**
 * Endpoint de readiness check
 * GET /health/ready
 * 
 * Verifica si el sistema está listo para recibir tráfico
 */
export async function getReadiness(req, res) {
  try {
    // Verificar solo servicios críticos
    const database = await checkDatabaseHealth();
    
    if (database.status === 'down') {
      return res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        reason: 'Database unavailable'
      });
    }
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    logger.error('[Health] Readiness check failed:', err.message);
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: err.message
    });
  }
}
