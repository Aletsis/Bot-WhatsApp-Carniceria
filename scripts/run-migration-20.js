/**
 * Script para ejecutar la migración 20: Sistema de Monitoreo de Pedidos No Impresos
 * 
 * Esta migración:
 * 1. Agrega campo NotificacionImpresionEnviada a tabla Pedidos
 * 2. Crea índice para consultas eficientes de monitoreo
 * 3. Agrega configuraciones del sistema de monitoreo
 * 
 * Uso:
 *   node scripts/run-migration-20.js
 */

import sql from 'mssql';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '..', '.env') });

// Configuración de conexión
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433'),
  database: process.env.DB_NAME || 'CarniceriaDB',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

const MIGRATION_FILE = join(__dirname, '..', 'migrations', '20_monitoreo_impresion.sql');

async function runMigration() {
    let pool = null;

    try {
        console.log('\n╔════════════════════════════════════════════════════════╗');
        console.log('║   MIGRACIÓN 20: MONITOREO DE PEDIDOS NO IMPRESOS      ║');
        console.log('╚════════════════════════════════════════════════════════╝\n');

        // Leer archivo de migración
        console.log('📂 Leyendo archivo de migración...');
        const migrationSQL = readFileSync(MIGRATION_FILE, 'utf8');
        console.log('✅ Archivo de migración cargado\n');

        // Conectar a la base de datos
        console.log('🔌 Conectando a la base de datos...');
        console.log(`   Server: ${config.server}:${config.port}`);
        console.log(`   Database: ${config.database}`);
        console.log(`   User: ${config.user}\n`);
        
        pool = await sql.connect(config);
        console.log('✅ Conexión establecida\n');

        // Dividir el script en batches (separados por GO)
        const batches = migrationSQL
            .split(/^\s*GO\s*$/mi)
            .map(batch => batch.trim())
            .filter(batch => batch.length > 0);

        console.log(`📊 Total de batches a ejecutar: ${batches.length}\n`);
        console.log('⏳ Ejecutando migración...\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Ejecutar cada batch
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            
            // Saltar batches que solo son comentarios o PRINT simples
            if (batch.match(/^\s*--/) || (batch.match(/^\s*PRINT\s+/i) && batch.length < 100)) {
                continue;
            }

            try {
                await pool.request().query(batch);
                successCount++;
            } catch (error) {
                errorCount++;
                
                // Mostrar mensaje de error pero continuar con otros batches
                if (!error.message.includes('already exists') && 
                    !error.message.includes('There is already an object')) {
                    console.error(`❌ Error en batch ${i + 1}:`, error.message);
                }
                
                // Si es un error crítico, detener la ejecución
                if (error.message.includes('Invalid object name') && 
                    !error.message.includes('Pedidos')) {
                    console.error('\n⛔ Error crítico detectado. Deteniendo migración.\n');
                    throw error;
                }
            }
        }

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('📊 Resumen de la ejecución:');
        console.log(`   ✅ Batches ejecutados exitosamente: ${successCount}`);
        console.log(`   ❌ Batches con errores: ${errorCount}`);

        if (errorCount > 0) {
            console.log('\n⚠️  La migración se completó con algunas advertencias.');
            console.log('   Los errores por objetos existentes son normales en re-ejecuciones.');
        } else {
            console.log('\n✅ MIGRACIÓN COMPLETADA EXITOSAMENTE');
        }

        console.log('\n╔════════════════════════════════════════════════════════╗');
        console.log('║                   PRÓXIMOS PASOS                       ║');
        console.log('╚════════════════════════════════════════════════════════╝\n');
        console.log('1️⃣  Implementar printMonitorService.js');
        console.log('2️⃣  Integrar cron job en app.js');
        console.log('3️⃣  Crear test-print-monitor.js');
        console.log('4️⃣  Documentar Tarea 8 en TAREAS_PENDIENTES.md\n');

    } catch (error) {
        console.error('\n❌ ERROR FATAL:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        // Cerrar conexión
        if (pool) {
            try {
                await pool.close();
                console.log('🔌 Conexión cerrada\n');
            } catch (err) {
                console.error('Error cerrando conexión:', err.message);
            }
        }
    }
}

// Ejecutar migración
runMigration().catch(err => {
    console.error('Error no controlado:', err);
    process.exit(1);
});
