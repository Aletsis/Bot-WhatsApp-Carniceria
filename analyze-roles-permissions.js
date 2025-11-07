import dotenv from 'dotenv';
import { getPool } from './src/services/dbService.js';

// Cargar variables de entorno
dotenv.config();

async function analyzeRolesAndPermissions() {
  try {
    console.log('🔍 Analizando sistema de roles y permisos...');
    
    const pool = await getPool();
    console.log('✅ Pool de BD obtenido correctamente');
    
    // 1. Verificar roles disponibles en constraint
    console.log('\n1️⃣ Verificando constraint de roles:');
    const constraintQuery = await pool.request().query(`
      SELECT 
        name,
        definition
      FROM sys.check_constraints
      WHERE parent_object_id = OBJECT_ID('dbo.Usuarios')
        AND definition LIKE '%Rol%'
    `);
    
    if (constraintQuery.recordset.length > 0) {
      constraintQuery.recordset.forEach(constraint => {
        console.log(`   ✅ Constraint: ${constraint.name}`);
        console.log(`   📝 Definición: ${constraint.definition}`);
      });
    } else {
      console.log('   ❌ No se encontró constraint de roles');
    }
    
    // 2. Verificar usuarios existentes y sus roles
    console.log('\n2️⃣ Usuarios existentes en el sistema:');
    const usersQuery = await pool.request().query(`
      SELECT 
        UsuarioID,
        Username,
        Rol,
        Nombre,
        Email,
        NumeroWhatsApp,
        Activo,
        FechaCreacion,
        UltimoAcceso
      FROM Usuarios
      ORDER BY Rol, Username
    `);
    
    console.log(`   👥 Total usuarios: ${usersQuery.recordset.length}`);
    
    // Agrupar por roles
    const roleGroups = {};
    usersQuery.recordset.forEach(user => {
      if (!roleGroups[user.Rol]) {
        roleGroups[user.Rol] = [];
      }
      roleGroups[user.Rol].push(user);
    });
    
    Object.keys(roleGroups).forEach(role => {
      const users = roleGroups[role];
      console.log(`\n   🔰 Rol: ${role.toUpperCase()} (${users.length} usuarios)`);
      users.forEach(user => {
        console.log(`     - ${user.Username} (${user.Nombre || 'Sin nombre'})`);
        console.log(`       Email: ${user.Email || 'N/A'}, WhatsApp: ${user.NumeroWhatsApp || 'N/A'}`);
        console.log(`       Activo: ${user.Activo ? '✅' : '❌'}, Último acceso: ${user.UltimoAcceso || 'Nunca'}`);
        console.log('');
      });
    });
    
    // 3. Análisis de permisos por rol (basado en middleware)
    console.log('\n3️⃣ Matriz de permisos por rol:');
    
    const permissions = {
      'Gestión de Usuarios': ['admin'],
      'Gestión de Configuraciones': ['admin'],
      'Gestión de Pedidos': ['admin', 'supervisor', 'editor'],
      'Ver Pedidos': ['admin', 'supervisor', 'editor', 'viewer'],
      'Reimprimir Tickets': ['admin', 'editor'],
      'Gestión de Clientes': ['admin', 'editor'],
      'Recibir Notificaciones': ['admin', 'supervisor'],
      'Dashboard Principal': ['admin', 'supervisor', 'editor', 'viewer']
    };
    
    const allRoles = ['admin', 'supervisor', 'editor', 'viewer'];
    
    console.log('   📊 Matriz de permisos:');
    console.log('   ' + ''.padEnd(30) + allRoles.map(r => r.padEnd(12)).join(''));
    console.log('   ' + ''.padEnd(30) + ''.padEnd(48, '-'));
    
    Object.keys(permissions).forEach(permission => {
      const allowedRoles = permissions[permission];
      let line = `   ${permission.padEnd(30)}`;
      allRoles.forEach(role => {
        const hasPermission = allowedRoles.includes(role);
        line += (hasPermission ? '✅' : '❌').padEnd(12);
      });
      console.log(line);
    });
    
    // 4. Verificar rutas protegidas
    console.log('\n4️⃣ Verificando implementación de permisos en rutas:');
    
    const routePermissions = {
      'POST /dashboard/usuarios': 'admin',
      'PUT /dashboard/usuarios/:id': 'admin',
      'GET /dashboard/configuraciones': 'admin',
      'PUT /dashboard/configuraciones': 'admin',
      'POST /dashboard/pedidos/:id/reimprimir': 'admin, editor',
      'POST /dashboard/clientes': 'admin, editor',
      'PUT /dashboard/clientes/:id': 'admin, editor'
    };
    
    Object.keys(routePermissions).forEach(route => {
      console.log(`   🛡️  ${route}: ${routePermissions[route]}`);
    });
    
    // 5. Recomendaciones de seguridad
    console.log('\n5️⃣ Recomendaciones de seguridad:');
    
    const inactiveUsers = usersQuery.recordset.filter(u => !u.Activo);
    if (inactiveUsers.length > 0) {
      console.log(`   ⚠️  ${inactiveUsers.length} usuarios inactivos encontrados`);
    } else {
      console.log('   ✅ Todos los usuarios están activos');
    }
    
    const usersWithoutWhatsApp = usersQuery.recordset.filter(u => 
      ['admin', 'supervisor'].includes(u.Rol) && !u.NumeroWhatsApp
    );
    if (usersWithoutWhatsApp.length > 0) {
      console.log(`   ⚠️  ${usersWithoutWhatsApp.length} admin/supervisor sin WhatsApp (no recibirán notificaciones)`);
    } else {
      console.log('   ✅ Todos los admin/supervisor tienen WhatsApp configurado');
    }
    
    const oldAccess = usersQuery.recordset.filter(u => 
      u.UltimoAcceso && new Date(u.UltimoAcceso) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    if (oldAccess.length > 0) {
      console.log(`   ⚠️  ${oldAccess.length} usuarios sin acceso en los últimos 30 días`);
    } else {
      console.log('   ✅ Todos los usuarios han accedido recientemente');
    }
    
    process.exit(0);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  }
}

analyzeRolesAndPermissions();