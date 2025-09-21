// utils/shutdownHelper.js
import logger from './logger.js';

let shuttingDown = false;

/**
 * Cierra recursos de manera ordenada
 * @param {Object} options
 * @param {import('http').Server} options.server - Servidor HTTP
 * @param {import('mssql').ConnectionPool} [options.pool] - Pool de conexión SQL
 */
export async function gracefulShutdown({ server, pool }) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info('⏳ Iniciando apagado ordenado...');

  try {
    // 1. Cerrar servidor HTTP
    if (server && server.close) {
      await new Promise(resolve => server.close(resolve));
      logger.info('✅ Servidor Express cerrado');
    }

    // 2. Cerrar conexión a BD
    if (pool && pool.close) {
      await pool.close();
      logger.info('✅ Pool de SQL Server cerrado');
    }
  } catch (err) {
    logger.error('⚠️ Error durante shutdown:', err);
  } finally {
    logger.info('👋 Proceso terminado');
    process.exit(1);
  }
}
