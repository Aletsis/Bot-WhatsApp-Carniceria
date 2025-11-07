import sql from 'mssql';

const configs = [
  // SQL Server Express
  {
    name: 'SQL Server Express',
    server: 'localhost\\SQLEXPRESS',
    database: 'master',
    options: {
      encrypt: false,
      trustServerCertificate: true,
      trustedConnection: true
    }
  },
  // Instancia por defecto
  {
    name: 'SQL Server Default',
    server: 'localhost',
    database: 'master',
    options: {
      encrypt: false,
      trustServerCertificate: true,
      trustedConnection: true
    }
  },
  // Con SA y contraseña
  {
    name: 'SQL Server Express con SA',
    server: 'localhost\\SQLEXPRESS',
    user: 'sa',
    password: 'Fina2017.',
    database: 'master',
    options: {
      encrypt: false,
      trustServerCertificate: true
    }
  },
  {
    name: 'SQL Server Default con SA',
    server: 'localhost',
    user: 'sa',
    password: 'Fina2017.',
    database: 'master',
    options: {
      encrypt: false,
      trustServerCertificate: true
    }
  }
];

async function testConnections() {
  for (const config of configs) {
    try {
      console.log(`\n🔍 Probando: ${config.name}`);
      console.log(`   Servidor: ${config.server}`);
      
      const pool = await sql.connect(config);
      console.log('✅ Conexión exitosa!');
      
      // Verificar usuario actual
      const currentUser = await pool.request().query('SELECT SYSTEM_USER as CurrentUser, USER_NAME() as UserName');
      console.log('   Usuario actual:', currentUser.recordset[0]);
      
      // Verificar si la base de datos existe
      const dbExists = await pool.request().query(`SELECT name FROM sys.databases WHERE name = 'CarniceriaDB'`);
      if (dbExists.recordset.length > 0) {
        console.log('✅ Base de datos CarniceriaDB existe');
        
        // Probar conexión directa a la base de datos
        const dbConfig = { ...config, database: 'CarniceriaDB' };
        const dbPool = await sql.connect(dbConfig);
        console.log('✅ Conexión directa a CarniceriaDB exitosa');
        
        console.log(`\n🎯 SOLUCIÓN ENCONTRADA!`);
        console.log(`   Actualiza tu .env con:`);
        console.log(`   DB_HOST=${config.server}`);
        if (config.user) {
          console.log(`   DB_USER=${config.user}`);
        }
        
        break;
        
      } else {
        console.log('❌ Base de datos CarniceriaDB NO existe');
        console.log('   Puedes crearla con este config');
      }
      
      // Cerrar conexión
      await pool.close();
      
    } catch (err) {
      console.log(`❌ Error con ${config.name}:`, err.message);
    }
  }
}

testConnections();