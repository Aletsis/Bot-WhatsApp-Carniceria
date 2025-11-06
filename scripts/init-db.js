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
    
    logger.info('');
    logger.info('═══════════════════════════════════════════════════════');
    logger.info('✅ Proceso completado exitosamente');
    logger.info('═══════════════════════════════════════════════════════');
    logger.info('');
    logger.info('📋 Información importante:');
    logger.info('');
    logger.info('👤 Usuario admin creado:');
    logger.info('   Username: admin');
    logger.info('   Password: admin123');
    logger.info('');
    logger.info('⚠️  IMPORTANTE:');
    logger.info('   - Cambiar la contraseña del admin en producción');
    logger.info('   - Usar: npm run manage-users');
    logger.info('');
    logger.info('🔗 Acceso al dashboard:');
    logger.info('   http://localhost:3000/login');
    logger.info('');
    logger.info('═══════════════════════════════════════════════════════');
    
    process.exit(0);
  } catch (err) {
    logger.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();