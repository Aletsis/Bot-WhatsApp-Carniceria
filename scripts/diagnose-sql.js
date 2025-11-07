/**
 * Script de diagnóstico para SQL Server
 * 
 * Verifica:
 * - Si SQL Server está ejecutándose
 * - Si puede conectarse con las credenciales
 * - Proporciona pasos para solucionar problemas comunes
 */

import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

console.log(`${BLUE}
╔═══════════════════════════════════════════════════════════════╗
║           🔍 DIAGNÓSTICO DE SQL SERVER                        ║
╚═══════════════════════════════════════════════════════════════╝
${RESET}`);

async function testConnection() {
  const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    server: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '1433'),
    database: 'master',
    options: {
      encrypt: false,
      trustServerCertificate: true
    },
    connectionTimeout: 5000
  };

  console.log(`${BLUE}📋 Configuración actual:${RESET}`);
  console.log(`   Host: ${config.server}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   User: ${config.user}`);
  console.log(`   Pass: ${'*'.repeat(config.password.length)}`);
  console.log('');

  try {
    console.log(`${YELLOW}⏳ Intentando conectar a SQL Server...${RESET}`);
    const pool = await sql.connect(config);
    
    console.log(`${GREEN}✅ CONEXIÓN EXITOSA!${RESET}\n`);
    
    // Verificar versión de SQL Server
    const versionResult = await pool.request().query('SELECT @@VERSION AS Version');
    console.log(`${GREEN}📊 Versión de SQL Server:${RESET}`);
    console.log(`   ${versionResult.recordset[0].Version.split('\n')[0]}\n`);
    
    // Verificar bases de datos
    const dbResult = await pool.request().query('SELECT name FROM sys.databases ORDER BY name');
    console.log(`${GREEN}📁 Bases de datos disponibles:${RESET}`);
    dbResult.recordset.forEach(db => {
      const marker = db.name === process.env.DB_NAME ? ' ⭐' : '';
      console.log(`   - ${db.name}${marker}`);
    });
    
    await pool.close();
    
    console.log(`\n${GREEN}╔═══════════════════════════════════════════════════════════════╗${RESET}`);
    console.log(`${GREEN}║  ✅ SQL Server está funcionando correctamente                ║${RESET}`);
    console.log(`${GREEN}╚═══════════════════════════════════════════════════════════════╝${RESET}`);
    
    console.log(`\n${BLUE}➡️  Siguiente paso: Ejecutar 'npm start' para iniciar la aplicación${RESET}`);
    
  } catch (err) {
    console.log(`${RED}❌ ERROR DE CONEXIÓN${RESET}\n`);
    console.log(`Código de error: ${err.code}`);
    console.log(`Mensaje: ${err.message}\n`);
    
    // Diagnóstico detallado según el error
    if (err.code === 'ELOGIN') {
      console.log(`${YELLOW}╔═══════════════════════════════════════════════════════════════╗${RESET}`);
      console.log(`${YELLOW}║  🔐 ERROR DE AUTENTICACIÓN                                   ║${RESET}`);
      console.log(`${YELLOW}╚═══════════════════════════════════════════════════════════════╝${RESET}\n`);
      
      console.log(`${RED}Causa probable:${RESET} SQL Server solo acepta autenticación Windows\n`);
      
      console.log(`${BLUE}📝 SOLUCIÓN - Habilitar autenticación SQL Server:${RESET}\n`);
      console.log(`1️⃣  Abrir SQL Server Management Studio (SSMS)`);
      console.log(`2️⃣  Conectarse al servidor con autenticación Windows`);
      console.log(`3️⃣  Click derecho en el servidor > Propiedades`);
      console.log(`4️⃣  Ir a la sección "Seguridad"`);
      console.log(`5️⃣  En "Autenticación del servidor", seleccionar:`);
      console.log(`    ${GREEN}"Modo de autenticación de SQL Server y Windows"${RESET}`);
      console.log(`6️⃣  Click en "Aceptar"`);
      console.log(`7️⃣  Expandir "Seguridad" > "Inicios de sesión"`);
      console.log(`8️⃣  Click derecho en "sa" > Propiedades`);
      console.log(`9️⃣  En "General", establecer contraseña: ${GREEN}${config.password}${RESET}`);
      console.log(`🔟 En "Estado", verificar:`);
      console.log(`    - Permiso de conexión: ${GREEN}Conceder${RESET}`);
      console.log(`    - Inicio de sesión: ${GREEN}Habilitado${RESET}`);
      console.log(`1️⃣1️⃣  Click en "Aceptar"`);
      console.log(`1️⃣2️⃣  ${RED}REINICIAR SQL SERVER${RESET} (Services.msc > SQL Server > Reiniciar)`);
      console.log(`1️⃣3️⃣  Ejecutar nuevamente: ${GREEN}node scripts/diagnose-sql.js${RESET}\n`);
      
      console.log(`${YELLOW}💡 Alternativa - Usar autenticación Windows:${RESET}\n`);
      console.log(`   Modificar .env:`);
      console.log(`   ${GREEN}DB_USER=DOMAIN\\\\Username${RESET} o ${GREEN}DB_USER=.\\\\Username${RESET}`);
      console.log(`   ${GREEN}DB_PASS=${RESET} (dejar vacío)`);
      console.log(`   ${GREEN}DB_OPTIONS_TRUSTED_CONNECTION=true${RESET}\n`);
      
    } else if (err.code === 'ESOCKET' || err.code === 'ETIMEOUT') {
      console.log(`${YELLOW}╔═══════════════════════════════════════════════════════════════╗${RESET}`);
      console.log(`${YELLOW}║  🔌 ERROR DE CONEXIÓN AL SERVIDOR                            ║${RESET}`);
      console.log(`${YELLOW}╚═══════════════════════════════════════════════════════════════╝${RESET}\n`);
      
      console.log(`${RED}Causa probable:${RESET} SQL Server no está ejecutándose o no acepta conexiones remotas\n`);
      
      console.log(`${BLUE}📝 SOLUCIÓN:${RESET}\n`);
      console.log(`1️⃣  Verificar si SQL Server está ejecutándose:`);
      console.log(`    - Presionar ${GREEN}Win + R${RESET}`);
      console.log(`    - Escribir ${GREEN}services.msc${RESET} y Enter`);
      console.log(`    - Buscar "SQL Server (MSSQLSERVER)" o "SQL Server (SQLEXPRESS)"`);
      console.log(`    - Verificar que el estado sea ${GREEN}"En ejecución"${RESET}`);
      console.log(`    - Si no está ejecutándose, click derecho > ${GREEN}Iniciar${RESET}\n`);
      
      console.log(`2️⃣  Habilitar TCP/IP en SQL Server Configuration Manager:`);
      console.log(`    - Abrir "SQL Server Configuration Manager"`);
      console.log(`    - Ir a: SQL Server Network Configuration > Protocols for MSSQLSERVER`);
      console.log(`    - Click derecho en "TCP/IP" > ${GREEN}Habilitar${RESET}`);
      console.log(`    - ${RED}REINICIAR SQL SERVER${RESET}\n`);
      
      console.log(`3️⃣  Si usas SQL Server Express, actualizar .env:`);
      console.log(`    ${GREEN}DB_HOST=localhost\\\\SQLEXPRESS${RESET}\n`);
      
    } else {
      console.log(`${RED}Error desconocido. Stack trace:${RESET}`);
      console.log(err);
    }
    
    process.exit(1);
  }
}

testConnection();
