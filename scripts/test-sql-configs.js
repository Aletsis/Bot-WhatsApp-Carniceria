/**
 * Script para probar múltiples configuraciones de conexión a SQL Server
 * Útil cuando no estás seguro de la configuración correcta
 */

import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

// Configuraciones a probar
const configurations = [
  {
    name: 'SQL Express con Named Pipes (recomendado)',
    config: {
      server: 'localhost\\SQLEXPRESS',
      database: 'master',
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
      },
      authentication: {
        type: 'default',
        options: {
          userName: process.env.DB_USER,
          password: process.env.DB_PASS
        }
      },
      connectionTimeout: 10000
    }
  },
  {
    name: 'SQL Express en puerto dinámico (alternativa 1)',
    config: {
      server: 'localhost',
      options: {
        encrypt: false,
        trustServerCertificate: true,
        instanceName: 'SQLEXPRESS',
        enableArithAbort: true
      },
      authentication: {
        type: 'default',
        options: {
          userName: process.env.DB_USER,
          password: process.env.DB_PASS
        }
      },
      database: 'master',
      connectionTimeout: 10000
    }
  },
  {
    name: 'SQL Express en puerto 1433 (alternativa 2)',
    config: {
      server: 'localhost',
      port: 1433,
      database: 'master',
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
      },
      authentication: {
        type: 'default',
        options: {
          userName: process.env.DB_USER,
          password: process.env.DB_PASS
        }
      },
      connectionTimeout: 10000
    }
  },
  {
    name: 'Autenticación Windows (alternativa 3)',
    config: {
      server: 'localhost\\SQLEXPRESS',
      database: 'master',
      options: {
        encrypt: false,
        trustServerCertificate: true,
        trustedConnection: true,
        enableArithAbort: true
      },
      connectionTimeout: 10000
    }
  }
];

console.log(`${BLUE}
╔═══════════════════════════════════════════════════════════════╗
║     🔍 PROBANDO MÚLTIPLES CONFIGURACIONES DE SQL SERVER       ║
╚═══════════════════════════════════════════════════════════════╝
${RESET}\n`);

async function testConfiguration(configObj) {
  console.log(`${YELLOW}⏳ Probando: ${configObj.name}${RESET}`);
  
  try {
    const pool = await sql.connect(configObj.config);
    
    // Si llegamos aquí, la conexión fue exitosa
    const versionResult = await pool.request().query('SELECT @@VERSION AS Version, @@SERVERNAME AS ServerName');
    const version = versionResult.recordset[0];
    
    console.log(`${GREEN}✅ ¡CONEXIÓN EXITOSA!${RESET}\n`);
    console.log(`   Servidor: ${version.ServerName}`);
    console.log(`   Versión: ${version.Version.split('\n')[0]}`);
    
    // Listar bases de datos
    const dbResult = await pool.request().query('SELECT name FROM sys.databases ORDER BY name');
    console.log(`\n   📁 Bases de datos:`);
    dbResult.recordset.forEach(db => {
      const marker = db.name === process.env.DB_NAME ? ' ⭐ (configurada)' : '';
      console.log(`      - ${db.name}${marker}`);
    });
    
    await pool.close();
    
    // Mostrar configuración recomendada para .env
    console.log(`\n${GREEN}╔═══════════════════════════════════════════════════════════════╗${RESET}`);
    console.log(`${GREEN}║  ✅ CONFIGURACIÓN RECOMENDADA PARA .ENV                      ║${RESET}`);
    console.log(`${GREEN}╚═══════════════════════════════════════════════════════════════╝${RESET}\n`);
    
    if (configObj.config.authentication?.type === 'default') {
      if (configObj.config.options?.instanceName) {
        console.log(`DB_HOST=localhost`);
        console.log(`DB_INSTANCE=SQLEXPRESS`);
        console.log(`DB_PORT=  # Dejar vacío para puerto dinámico`);
      } else if (configObj.config.port) {
        console.log(`DB_HOST=localhost`);
        console.log(`DB_PORT=${configObj.config.port}`);
      } else {
        console.log(`DB_HOST=${configObj.config.server}`);
        console.log(`DB_PORT=  # Dejar vacío para Named Pipes`);
      }
      console.log(`DB_USER=${process.env.DB_USER}`);
      console.log(`DB_PASS=${process.env.DB_PASS}`);
    } else {
      console.log(`DB_HOST=${configObj.config.server}`);
      console.log(`DB_USE_WINDOWS_AUTH=true`);
      console.log(`DB_USER=  # No requerido con Windows Auth`);
      console.log(`DB_PASS=  # No requerido con Windows Auth`);
    }
    console.log(`DB_NAME=${process.env.DB_NAME}`);
    
    return true;
    
  } catch (err) {
    console.log(`${RED}❌ Error: ${err.message}${RESET}\n`);
    return false;
  }
}

async function runTests() {
  let success = false;
  
  for (const config of configurations) {
    const result = await testConfiguration(config);
    if (result) {
      success = true;
      break;
    }
  }
  
  if (!success) {
    console.log(`${RED}╔═══════════════════════════════════════════════════════════════╗${RESET}`);
    console.log(`${RED}║  ❌ NINGUNA CONFIGURACIÓN FUNCIONÓ                           ║${RESET}`);
    console.log(`${RED}╚═══════════════════════════════════════════════════════════════╝${RESET}\n`);
    
    console.log(`${YELLOW}📝 PASOS PARA SOLUCIONAR:${RESET}\n`);
    console.log(`1️⃣  Verificar que SQL Server esté ejecutándose:`);
    console.log(`    ${BLUE}Win + R → services.msc → SQL Server (SQLEXPRESS)${RESET}\n`);
    
    console.log(`2️⃣  Habilitar TCP/IP y Named Pipes:`);
    console.log(`    ${BLUE}SQL Server Configuration Manager${RESET}`);
    console.log(`    → SQL Server Network Configuration`);
    console.log(`    → Protocols for SQLEXPRESS`);
    console.log(`    → Habilitar: TCP/IP y Named Pipes\n`);
    
    console.log(`3️⃣  Habilitar autenticación SQL Server:`);
    console.log(`    ${BLUE}SQL Server Management Studio (SSMS)${RESET}`);
    console.log(`    → Click derecho en servidor → Propiedades`);
    console.log(`    → Seguridad → "SQL Server and Windows Authentication mode"\n`);
    
    console.log(`4️⃣  Habilitar cuenta 'sa':`);
    console.log(`    → Seguridad → Inicios de sesión → sa → Propiedades`);
    console.log(`    → Estado → Inicio de sesión: ${GREEN}Habilitado${RESET}\n`);
    
    console.log(`5️⃣  ${RED}REINICIAR SQL SERVER${RESET}\n`);
    
    process.exit(1);
  }
}

runTests();
