import dotenv from 'dotenv';
import { initializeDatabase, checkSqlServerConnection } from '../src/services/dbInitService.js';
import logger from '../src/logger.js';

dotenv.config();

async function main() {
  try {
    logger.info('🚀 Iniciando proceso de inicialización de base de datos...');
    
    // Verificar conexión
    await checkSqlServerConnection();
    
    // Inicializar base de datos
    await initializeDatabase();
    
    logger.info('✅ Proceso completado exitosamente');
    process.exit(0);
  } catch (err) {
    logger.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();