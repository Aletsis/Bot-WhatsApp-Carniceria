import logger, { getLogStats, cleanOldLogs } from '../src/logger.js';

/**
 * Script para probar y gestionar el sistema de logs
 * 
 * Funcionalidades:
 * 1. Generar logs de prueba en todos los niveles
 * 2. Mostrar estadísticas de logs
 * 3. Limpiar logs antiguos
 * 4. Verificar configuración
 */

async function testLogs() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║           TEST DEL SISTEMA DE LOGS Y ROTACIÓN                 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  // 1. Verificar configuración
  console.log('📋 Configuración actual:');
  console.log('─'.repeat(70));
  console.log(`   Nivel de log: ${process.env.LOG_LEVEL || 'info'}`);
  console.log(`   Retención: ${process.env.LOG_RETENTION_DAYS || '30'} días`);
  console.log(`   Modo: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Logs a archivo (dev): ${process.env.LOG_TO_FILE || 'false'}`);
  console.log('');
  
  // 2. Generar logs de prueba
  console.log('🧪 Generando logs de prueba...\n');
  
  logger.trace('Este es un log TRACE - Nivel más detallado (solo debugging intenso)');
  logger.debug('Este es un log DEBUG - Información de debugging');
  logger.info('Este es un log INFO - Información general');
  logger.warn('Este es un log WARN - Advertencia');
  logger.error('Este es un log ERROR - Error no crítico');
  
  // Log con contexto estructurado
  logger.info({
    msg: 'Log estructurado con contexto',
    user: { id: 1, username: 'admin' },
    action: 'test_logging',
    metadata: {
      timestamp: new Date().toISOString(),
      ip: '127.0.0.1'
    }
  });
  
  // Log con error
  try {
    throw new Error('Este es un error de prueba');
  } catch (err) {
    logger.error({ err, msg: 'Error capturado en try-catch' });
  }
  
  // Log de operación exitosa
  logger.info({
    msg: 'Operación completada exitosamente',
    operation: 'database_query',
    duration: 45,
    records: 100
  });
  
  console.log('\n✅ Logs de prueba generados\n');
  
  // 3. Obtener estadísticas
  console.log('📊 Estadísticas de logs:');
  console.log('─'.repeat(70));
  
  try {
    const stats = await getLogStats();
    
    console.log(`   Total de archivos: ${stats.totalFiles}`);
    console.log(`   Tamaño total: ${stats.totalSizeMB} MB`);
    console.log(`   Directorio: ${stats.logsDir}`);
    console.log(`   Retención configurada: ${stats.retentionDays} días`);
    
    if (stats.totalFiles > 0) {
      console.log('\n   Archivos por fecha:');
      Object.entries(stats.filesByDate).forEach(([date, info]) => {
        const sizeMB = (info.size / (1024 * 1024)).toFixed(2);
        console.log(`     ${date}: ${info.count} archivo(s), ${sizeMB} MB`);
      });
    } else {
      console.log('\n   ℹ️ No hay archivos de log aún');
    }
  } catch (err) {
    console.error('   ❌ Error obteniendo estadísticas:', err.message);
  }
  
  console.log('');
  
  // 4. Probar limpieza (dry run)
  console.log('🗑️ Verificando logs antiguos...');
  console.log('─'.repeat(70));
  
  try {
    const deleted = await cleanOldLogs();
    if (deleted > 0) {
      console.log(`   ✅ ${deleted} archivo(s) antiguo(s) eliminado(s)`);
    } else {
      console.log('   ✅ No hay logs antiguos para eliminar');
    }
  } catch (err) {
    console.error('   ❌ Error en limpieza:', err.message);
  }
  
  console.log('');
  
  // 5. Recomendaciones
  console.log('💡 Recomendaciones:');
  console.log('─'.repeat(70));
  console.log(`
   DESARROLLO:
   - Usar LOG_LEVEL=debug para más detalle
   - Dejar LOG_TO_FILE=false (solo consola)
   - Monitorear logs en tiempo real en la consola
   
   PRODUCCIÓN:
   - Usar LOG_LEVEL=info (o warn para menos verbosidad)
   - Los logs se guardan automáticamente en ./logs/
   - Rotación diaria automática
   - Retención de ${process.env.LOG_RETENTION_DAYS || 30} días
   - Monitorear espacio en disco
   
   MANTENIMIENTO:
   - Ejecutar este script semanalmente
   - Verificar tamaño de logs con: npm run logs:stats
   - Limpiar manualmente si es necesario: npm run logs:clean
   - Considerar aumentar retención si se necesita auditoría extendida
   
   MONITOREO:
   - Integrar con herramientas como:
     • Grafana + Loki (logs centralizados)
     • ELK Stack (Elasticsearch + Logstash + Kibana)
     • Datadog o New Relic (APM)
   - Alertas ante errores frecuentes o logs excesivos
  `);
  
  console.log('\n✅ Test completado\n');
}

// Ejecutar test
testLogs().catch((err) => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
