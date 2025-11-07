/**
 * Script simple para inicializar la base de datos
 * Crea CarniceriaDB con todas sus tablas, índices y datos iniciales
 */

import dotenv from 'dotenv';
import { initializeDatabase } from '../src/services/dbInitService.js';
import logger from '../src/logger.js';

dotenv.config();

const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

console.log(`${BLUE}
╔═══════════════════════════════════════════════════════════════╗
║        🚀 INICIALIZACIÓN DE BASE DE DATOS                     ║
╚═══════════════════════════════════════════════════════════════╝
${RESET}\n`);

async function init() {
  try {
    console.log(`${BLUE}⏳ Iniciando proceso de creación de base de datos...${RESET}\n`);
    
    await initializeDatabase();
    
    console.log(`\n${GREEN}╔═══════════════════════════════════════════════════════════════╗${RESET}`);
    console.log(`${GREEN}║  ✅ BASE DE DATOS INICIALIZADA EXITOSAMENTE                  ║${RESET}`);
    console.log(`${GREEN}╚═══════════════════════════════════════════════════════════════╝${RESET}\n`);
    
    console.log(`${BLUE}📊 Resumen de lo creado:${RESET}`);
    console.log(`   ✅ Base de datos: CarniceriaDB`);
    console.log(`   ✅ 9 tablas creadas`);
    console.log(`   ✅ 20+ índices para optimización`);
    console.log(`   ✅ Configuraciones por defecto`);
    console.log(`   ✅ Usuario admin (username: admin, password: admin123)\n`);
    
    console.log(`${GREEN}➡️  Siguiente paso: npm start${RESET}\n`);
    
    process.exit(0);
    
  } catch (err) {
    logger.error('❌ Error inicializando base de datos:', err);
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

init();
