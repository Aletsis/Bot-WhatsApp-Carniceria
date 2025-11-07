/**
 * Script para Ejecutar Migración 18 - Rol Supervisor
 * 
 * Ejecuta la migración que agrega el rol 'supervisor' al sistema.
 * 
 * Uso:
 *   node scripts/run-migration-18.js
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
  console.log('║   MIGRACIÓN 18: ROL SUPERVISOR             ║');
  console.log('╚════════════════════════════════════════════╝\n');

  let pool;

  try {
    // Leer archivo de migración
    const migrationPath = join(__dirname, '..', 'migrations', '18_rol_supervisor.sql');
    console.log('📄 Leyendo migración:', migrationPath);
    
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    // Conectar a la base de datos
    console.log('🔌 Conectando a SQL Server...');
    pool = await sql.connect(config);
    console.log('✅ Conectado a:', config.database, '\n');

    // Dividir el script en batches (separados por GO)
    const batches = migrationSQL
      .split(/^\s*GO\s*$/gim)
      .map(batch => batch.trim())
      .filter(batch => batch.length > 0);

    console.log(`📦 Encontrados ${batches.length} batches...\n`);

    // Ejecutar cada batch
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      // Saltar solo comentarios de bloque completos
      if (batch.trim().startsWith('/**') && batch.trim().endsWith('*/')) {
        continue;
      }
      
      // Saltar líneas vacías
      if (batch.trim() === '') {
        continue;
      }

      console.log(`Ejecutando batch ${i + 1}/${batches.length}...`);

      try {
        const result = await pool.request().query(batch);
        
        // Mostrar mensajes de SQL Server (PRINT statements)
        if (result.recordset && result.recordset.length > 0) {
          result.recordset.forEach(row => {
            const values = Object.values(row);
            if (values.length > 0) {
              console.log('  ', values.join(' | '));
            }
          });
        }
        
        console.log(`✅ Batch ${i + 1} completado`);
      } catch (batchError) {
        console.error(`❌ Error en batch ${i + 1}:`, batchError.message);
        console.error('SQL:', batch.substring(0, 200));
        throw batchError;
      }
    }

    console.log('\n✅ Migración 18 completada exitosamente\n');

    // Verificar roles disponibles
    console.log('📋 Verificando roles disponibles...');
    const rolesResult = await pool.request().query(`
      SELECT 
        name AS ConstraintName,
        definition AS AllowedRoles
      FROM sys.check_constraints
      WHERE name = 'CK_Usuarios_Rol'
        AND parent_object_id = OBJECT_ID('dbo.Usuarios')
    `);

    if (rolesResult.recordset.length > 0) {
      console.log('✅ Constraint de roles:');
      rolesResult.recordset.forEach(row => {
        console.log(`   ${row.ConstraintName}: ${row.AllowedRoles}`);
      });
    }

    // Mostrar resumen de usuarios
    console.log('\n📊 Resumen de usuarios por rol:');
    const usersResult = await pool.request().query(`
      SELECT 
        Rol,
        COUNT(*) AS Total,
        SUM(CASE WHEN Activo = 1 THEN 1 ELSE 0 END) AS Activos,
        SUM(CASE WHEN Activo = 0 THEN 1 ELSE 0 END) AS Inactivos
      FROM dbo.Usuarios
      GROUP BY Rol
      ORDER BY 
        CASE Rol
          WHEN 'admin' THEN 1
          WHEN 'supervisor' THEN 2
          WHEN 'editor' THEN 3
          WHEN 'viewer' THEN 4
        END
    `);

    if (usersResult.recordset.length > 0) {
      console.table(usersResult.recordset);
    }

    console.log('\n💡 SIGUIENTE PASO:');
    console.log('   1. Actualizar middleware de autorización (src/middleware/auth.js)');
    console.log('   2. Actualizar UI de usuarios (client/src/pages/UsuariosPage.jsx)');
    console.log('   3. Probar creación de usuario supervisor');
    console.log('   4. Verificar permisos en dashboard\n');

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
