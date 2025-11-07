// Script para verificar que la conexión funciona después del fix
import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function testFinalConnection() {
  try {
    console.log('🔧 Verificando conexión final...');
    console.log(`📍 Servidor: ${config.server}:${config.port}`);
    console.log(`👤 Usuario: ${config.user}`);
    console.log(`🗄️ Base de datos: ${config.database}`);
    
    const pool = await sql.connect(config);
    console.log('✅ ¡CONEXIÓN EXITOSA!');
    
    // Probar una consulta simple
    const result = await pool.request().query('SELECT COUNT(*) as TablesCount FROM INFORMATION_SCHEMA.TABLES');
    console.log(`📊 Tablas encontradas: ${result.recordset[0].TablesCount}`);
    
    console.log('\n🎉 ¡Tu aplicación ya puede conectarse a la base de datos!');
    console.log('🚀 Puedes ejecutar: npm start');
    
  } catch (err) {
    console.error('❌ Aún hay problemas:', err.message);
    
    if (err.message.includes('Login failed')) {
      console.log('\n💡 El usuario/contraseña aún no son correctos');
      console.log('   Verifica que hayas habilitado autenticación mixta');
      console.log('   y creado el usuario AppUser');
    }
  }
}

testFinalConnection();