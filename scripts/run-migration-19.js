/**
 * Script para ejecutar Migración 19 - Sistema de Notificaciones de Errores
 * 
 * Ejecuta la migración que:
 * 1. Agrega campo NumeroWhatsApp a tabla Usuarios
 * 2. Crea tabla NotificacionesLog
 * 3. Crea índices para throttling
 * 4. Agrega configuraciones del sistema
 * 
 * Uso:
 *   node scripts/run-migration-19.js
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

async function runMigration() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   MIGRACIÓN 19: NOTIFICACIONES ADMIN       ║');
  console.log('╚════════════════════════════════════════════╝\n');

  let pool;

  try {
    // Leer archivo de migración
    const migrationPath = join(__dirname, '..', 'migrations', '19_notificaciones_admin.sql');
    console.log('📂 Leyendo migración desde:', migrationPath);
    
    const sqlContent = readFileSync(migrationPath, 'utf8');
    
    // Dividir en batches por GO
    const batches = sqlContent
      .split(/^\s*GO\s*$/mi)
      .map(batch => batch.trim())
      .filter(batch => {
        // Filtrar batches vacíos y solo comentarios
        if (!batch) return false;
        // Si después de remover comentarios no queda nada, omitir
        const withoutComments = batch.replace(/--.*$/gm, '').trim();
        return withoutComments.length > 0;
      });

    console.log('📦 Encontrados %d batches para ejecutar\n', batches.length);

    // Conectar a la base de datos
    console.log('🔌 Conectando a SQL Server...');
    pool = await sql.connect(config);
    console.log('✅ Conectado a %s@%s\n', config.database, config.server);

    // Ejecutar cada batch
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      try {
        process.stdout.write(`Ejecutando batch ${i + 1}/${batches.length}... `);
        
        const result = await pool.request().query(batch);
        
        // Mostrar mensajes PRINT de SQL Server
        if (result.recordset && result.recordset.length > 0) {
          result.recordset.forEach(row => {
            if (row['']) {
              console.log(row['']);
            }
          });
        }
        
        console.log('✅');
      } catch (err) {
        console.log('❌\n');
        console.error('Error en batch %d:', i + 1);
        console.error('SQL:', batch.substring(0, 200) + '...');
        console.error('Error:', err.message);
        throw err;
      }
    }

    console.log('\n✅ Migración ejecutada correctamente\n');

    // Verificaciones finales
    console.log('━'.repeat(50));
    console.log('📊 VERIFICACIÓN FINAL');
    console.log('━'.repeat(50));
    console.log('');

    // 1. Verificar columna NumeroWhatsApp
    console.log('1️⃣  Columna NumeroWhatsApp en Usuarios:');
    const columnCheck = await pool.request().query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Usuarios' 
        AND COLUMN_NAME = 'NumeroWhatsApp'
    `);
    
    if (columnCheck.recordset.length > 0) {
      console.table(columnCheck.recordset);
    } else {
      console.log('❌ Columna no encontrada\n');
    }

    // 2. Verificar tabla NotificacionesLog
    console.log('2️⃣  Tabla NotificacionesLog:');
    const tableCheck = await pool.request().query(`
      SELECT COUNT(*) as ColumnCount
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'NotificacionesLog'
    `);
    
    const columnCount = tableCheck.recordset[0].ColumnCount;
    console.log('✅ Tabla creada con %d columnas\n', columnCount);

    // 3. Verificar índices
    console.log('3️⃣  Índices de NotificacionesLog:');
    const indexCheck = await pool.request().query(`
      SELECT 
        name AS IndexName,
        type_desc AS Type
      FROM sys.indexes
      WHERE object_id = OBJECT_ID('dbo.NotificacionesLog')
        AND name IS NOT NULL
      ORDER BY name
    `);
    
    if (indexCheck.recordset.length > 0) {
      indexCheck.recordset.forEach(idx => {
        console.log('  • %s (%s)', idx.IndexName, idx.Type);
      });
      console.log('');
    }

    // 4. Configuraciones creadas
    console.log('4️⃣  Configuraciones de notificaciones:');
    const configCheck = await pool.request().query(`
      SELECT 
        Clave,
        Valor,
        Descripcion
      FROM dbo.Configuraciones
      WHERE Categoria = 'NOTIFICATIONS'
      ORDER BY Clave
    `);
    
    if (configCheck.recordset.length > 0) {
      console.table(configCheck.recordset);
    }

    // 5. Administradores
    console.log('5️⃣  Administradores que pueden recibir notificaciones:');
    const adminCheck = await pool.request().query(`
      SELECT 
        UsuarioID,
        Username,
        Nombre,
        NumeroWhatsApp,
        CASE 
          WHEN NumeroWhatsApp IS NULL THEN 'Sin configurar'
          ELSE 'Configurado'
        END AS EstadoNotificaciones
      FROM dbo.Usuarios
      WHERE Rol = 'admin' 
        AND Activo = 1
      ORDER BY UsuarioID
    `);
    
    if (adminCheck.recordset.length > 0) {
      console.table(adminCheck.recordset);
    } else {
      console.log('⚠️  No hay administradores activos\n');
    }

    console.log('');
    console.log('╔════════════════════════════════════════════╗');
    console.log('║   ✅ MIGRACIÓN COMPLETADA                  ║');
    console.log('╚════════════════════════════════════════════╝');
    console.log('');
    console.log('💡 SIGUIENTES PASOS:');
    console.log('');
    console.log('1️⃣  Configurar números de WhatsApp de administradores:');
    console.log('   UPDATE dbo.Usuarios');
    console.log('   SET NumeroWhatsApp = \'52XXXXXXXXXX\'');
    console.log('   WHERE UsuarioID = X AND Rol = \'admin\';');
    console.log('');
    console.log('2️⃣  Implementar notificationService.js');
    console.log('3️⃣  Integrar notificaciones en servicios críticos');
    console.log('4️⃣  Probar sistema de notificaciones');
    console.log('');

  } catch (error) {
    console.error('\n❌ Error ejecutando migración:', error.message);
    console.error('Detalles:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔌 Conexión cerrada\n');
    }
  }
}

// Ejecutar migración
runMigration().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});
