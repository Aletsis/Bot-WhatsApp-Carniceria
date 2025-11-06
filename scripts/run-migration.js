import dotenv from 'dotenv';
import sql from 'mssql';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import logger from '../src/logger.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration(migrationFile) {
  const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    server: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
    database: process.env.DB_NAME,
    options: {
      encrypt: false,
      trustServerCertificate: true
    }
  };

  let pool;
  try {
    logger.info('🚀 Ejecutando migración: %s', migrationFile);
    
    pool = await sql.connect(config);
    
    // Leer archivo SQL
    const migrationPath = join(__dirname, '..', 'migrations', migrationFile);
    const sqlContent = readFileSync(migrationPath, 'utf8');
    
    // Dividir por GO (SQL Server batch separator)
    const batches = sqlContent.split(/^\s*GO\s*$/mi).filter(batch => batch.trim());
    
    // Ejecutar cada batch
    for (const batch of batches) {
      if (batch.trim()) {
        await pool.request().query(batch);
      }
    }
    
    logger.info('✅ Migración ejecutada exitosamente');
    
    process.exit(0);
  } catch (err) {
    logger.error('❌ Error ejecutando migración:', err.message);
    process.exit(1);
  } finally {
    if (pool) await pool.close();
  }
}

// Obtener nombre de archivo de migración de argumentos
const migrationFile = process.argv[2];

if (!migrationFile) {
  logger.error('❌ Uso: node scripts/run-migration.js <archivo-migracion.sql>');
  process.exit(1);
}

runMigration(migrationFile);
