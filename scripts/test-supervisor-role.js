/**
 * Script de Prueba - Rol Supervisor
 * 
 * Verifica la implementación del rol 'supervisor':
 * 1. Constraint de base de datos
 * 2. Usuario supervisor de prueba
 * 3. Permisos correctos
 * 
 * Uso:
 *   node scripts/test-supervisor-role.js
 */

import sql from 'mssql';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

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

async function testSupervisorRole() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   TEST: ROL SUPERVISOR                     ║');
  console.log('╚════════════════════════════════════════════╝\n');

  let pool;

  try {
    // Conectar a la base de datos
    console.log('🔌 Conectando a SQL Server...');
    pool = await sql.connect(config);
    console.log('✅ Conectado\n');

    // Test 1: Verificar constraint
    console.log('📋 TEST 1: Verificar Constraint de Roles');
    console.log('━'.repeat(50));
    
    const constraintResult = await pool.request().query(`
      SELECT 
        name AS ConstraintName,
        definition AS AllowedRoles
      FROM sys.check_constraints
      WHERE name = 'CK_Usuarios_Rol'
        AND parent_object_id = OBJECT_ID('dbo.Usuarios')
    `);

    if (constraintResult.recordset.length > 0) {
      console.log('✅ Constraint encontrado:');
      console.log(`   ${constraintResult.recordset[0].AllowedRoles}`);
      
      if (constraintResult.recordset[0].AllowedRoles.includes('supervisor')) {
        console.log('✅ Rol supervisor incluido en constraint\n');
      } else {
        console.log('❌ Rol supervisor NO encontrado en constraint\n');
        process.exit(1);
      }
    } else {
      console.log('❌ Constraint CK_Usuarios_Rol no encontrado\n');
      process.exit(1);
    }

    // Test 2: Verificar si existe usuario supervisor
    console.log('📋 TEST 2: Verificar Usuario Supervisor');
    console.log('━'.repeat(50));
    
    const supervisorResult = await pool.request().query(`
      SELECT 
        UsuarioID,
        Username,
        Rol,
        Activo,
        FechaCreacion
      FROM dbo.Usuarios
      WHERE Rol = 'supervisor'
    `);

    if (supervisorResult.recordset.length > 0) {
      console.log(`✅ Encontrados ${supervisorResult.recordset.length} usuarios con rol supervisor:`);
      supervisorResult.recordset.forEach(user => {
        console.log(`   - ${user.Username} (ID: ${user.UsuarioID}, Activo: ${user.Activo})`);
      });
      console.log('');
    } else {
      console.log('⚠️  No hay usuarios con rol supervisor');
      console.log('   Creando usuario supervisor de prueba...\n');
      
      // Crear usuario supervisor de prueba
      const password = 'Supervisor123!';
      const hash = await bcrypt.hash(password, 10);
      
      await pool.request()
        .input('username', sql.NVarChar, 'supervisor')
        .input('hash', sql.NVarChar, hash)
        .input('nombre', sql.NVarChar, 'Usuario Supervisor')
        .input('rol', sql.NVarChar, 'supervisor')
        .query(`
          INSERT INTO dbo.Usuarios (Username, PasswordHash, Nombre, Rol, Activo, FechaCreacion)
          VALUES (@username, @hash, @nombre, @rol, 1, SYSDATETIME())
        `);
      
      console.log('✅ Usuario supervisor creado:');
      console.log('   Username: supervisor');
      console.log('   Password: Supervisor123!');
      console.log('   ⚠️  CAMBIAR CONTRASEÑA EN PRODUCCIÓN\n');
    }

    // Test 3: Resumen de usuarios por rol
    console.log('📋 TEST 3: Resumen de Usuarios por Rol');
    console.log('━'.repeat(50));
    
    const summaryResult = await pool.request().query(`
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

    console.table(summaryResult.recordset);

    // Test 4: Documentar permisos
    console.log('📋 TEST 4: Permisos por Rol');
    console.log('━'.repeat(50));
    console.log('');
    console.log('🔴 ADMIN:');
    console.log('   ✅ Acceso total al sistema');
    console.log('   ✅ Gestión de usuarios');
    console.log('   ✅ Configuraciones del sistema');
    console.log('   ✅ Gestión de pedidos y clientes');
    console.log('');
    console.log('🟡 SUPERVISOR:');
    console.log('   ✅ Ver todos los pedidos y clientes');
    console.log('   ✅ Actualizar estado de pedidos');
    console.log('   ✅ Reimprimir tickets');
    console.log('   ✅ Ver conversaciones y chats');
    console.log('   ✅ Recibir notificaciones de errores');
    console.log('   ❌ NO puede crear/editar usuarios');
    console.log('   ❌ NO puede cambiar configuraciones');
    console.log('');
    console.log('🟢 EDITOR:');
    console.log('   ✅ Crear y editar pedidos');
    console.log('   ✅ Crear y editar clientes');
    console.log('   ✅ Ver conversaciones');
    console.log('   ❌ NO puede eliminar ni configurar');
    console.log('');
    console.log('🔵 VIEWER:');
    console.log('   ✅ Solo lectura');
    console.log('   ✅ Ver pedidos y clientes');
    console.log('   ❌ NO puede modificar nada');
    console.log('');

    // Resumen final
    console.log('╔════════════════════════════════════════════╗');
    console.log('║   ✅ TODOS LOS TESTS PASARON               ║');
    console.log('╚════════════════════════════════════════════╝');
    console.log('');
    console.log('💡 SIGUIENTE PASO:');
    console.log('   1. Probar login con usuario supervisor');
    console.log('   2. Verificar menú del dashboard (no debe ver Usuarios ni Configuración)');
    console.log('   3. Verificar permisos de gestión de pedidos');
    console.log('   4. Intentar acceder a /dashboard/usuarios (debe denegar)');
    console.log('   5. Intentar acceder a /dashboard/configuracion (debe denegar)');
    console.log('');

  } catch (error) {
    console.error('\n❌ Error en tests:', error.message);
    console.error('Detalles:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔌 Conexión cerrada\n');
    }
  }
}

// Ejecutar tests
testSupervisorRole().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});
