import sql from 'mssql';

const config = {
  user: 'sa',
  password: 'Fina2017.',
  server: 'localhost',
  port: 1433,
  database: 'master',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function checkUser() {
  try {
    console.log('Intentando conectar como SA...');
    const pool = await sql.connect(config);
    console.log('✅ Conexión como SA exitosa!');
    
    // Verificar si el usuario AppUser existe
    const result = await pool.request().query(`SELECT name FROM sys.server_principals WHERE name = 'AppUser'`);
    
    if (result.recordset.length > 0) {
      console.log('✅ Usuario AppUser existe');
      
      // Verificar si tiene acceso a la base de datos
      const dbAccess = await pool.request().query(`
        USE CarniceriaDB;
        SELECT name FROM sys.database_principals WHERE name = 'AppUser'
      `);
      
      if (dbAccess.recordset.length > 0) {
        console.log('✅ Usuario AppUser tiene acceso a CarniceriaDB');
      } else {
        console.log('❌ Usuario AppUser NO tiene acceso a CarniceriaDB');
      }
      
    } else {
      console.log('❌ Usuario AppUser NO existe - necesitas crearlo');
    }
    
    // Verificar si la base de datos existe
    const dbExists = await pool.request().query(`SELECT name FROM sys.databases WHERE name = 'CarniceriaDB'`);
    if (dbExists.recordset.length > 0) {
      console.log('✅ Base de datos CarniceriaDB existe');
    } else {
      console.log('❌ Base de datos CarniceriaDB NO existe');
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    
    if (err.message.includes('Login failed')) {
      console.log('\n💡 Posibles soluciones:');
      console.log('1. La contraseña de SA puede ser incorrecta');
      console.log('2. SQL Server puede estar configurado solo para autenticación Windows');
      console.log('3. Intenta usar autenticación integrada de Windows');
    }
  }
}

checkUser();