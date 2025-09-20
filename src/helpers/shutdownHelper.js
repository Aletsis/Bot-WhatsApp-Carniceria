// utils/shutdownHelper.js
import sql from 'mssql';

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

  console.log('⏳ Iniciando apagado ordenado...');

  try {
    // 1. Cerrar servidor HTTP
    if (server && server.close) {
      await new Promise(resolve => server.close(resolve));
      console.log('✅ Servidor Express cerrado');
    }

    // 2. Cerrar conexión a BD
    if (pool && pool.close) {
      await pool.close();
      console.log('✅ Pool de SQL Server cerrado');
    }
  } catch (err) {
    console.error('⚠️ Error durante shutdown:', err);
  } finally {
    console.log('👋 Proceso terminado');
    process.exit(1);
  }
}
