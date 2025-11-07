import sql from 'mssql';

const config = {
  server: 'localhost',
  port: 1433,
  database: 'master',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    trustedConnection: true // Usar autenticación integrada de Windows
  }
};

async function checkWithWindowsAuth() {
  try {
    console.log('Intentando conectar con autenticación integrada de Windows...');
    const pool = await sql.connect(config);
    console.log('✅ Conexión exitosa!');
    
    // Verificar usuario actual
    const currentUser = await pool.request().query('SELECT SYSTEM_USER as CurrentUser, USER_NAME() as UserName');
    console.log('Usuario actual:', currentUser.recordset[0]);
    
    // Verificar si la base de datos existe
    const dbExists = await pool.request().query(`SELECT name FROM sys.databases WHERE name = 'CarniceriaDB'`);
    if (dbExists.recordset.length > 0) {
      console.log('✅ Base de datos CarniceriaDB existe');
    } else {
      console.log('❌ Base de datos CarniceriaDB NO existe');
      console.log('🔧 Puedes crearla con: npm run init-db');
    }
    
    // Verificar si el usuario AppUser existe
    const userExists = await pool.request().query(`SELECT name FROM sys.server_principals WHERE name = 'AppUser'`);
    if (userExists.recordset.length > 0) {
      console.log('✅ Usuario AppUser existe');
    } else {
      console.log('❌ Usuario AppUser NO existe');
      console.log('🔧 Necesitas crear este usuario en SQL Server');
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    
    if (err.message.includes('Login failed')) {
      console.log('\n💡 Soluciones posibles:');
      console.log('1. Tu usuario de Windows no tiene permisos en SQL Server');
      console.log('2. SQL Server no acepta conexiones de red (solo local)');
      console.log('3. Necesitas ejecutar como administrador');
      console.log('4. Usar SQL Server Management Studio para configurar usuarios');
    }
  }
}

checkWithWindowsAuth();