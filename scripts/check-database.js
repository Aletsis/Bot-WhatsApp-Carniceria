/**
 * Script para verificar si CarniceriaDB existe y qué tablas tiene
 */

import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

async function checkDatabase() {
  const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    server: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '1433'),
    database: 'master',
    options: {
      encrypt: false,
      trustServerCertificate: true
    }
  };

  try {
    console.log(`${BLUE}🔍 Conectando a SQL Server...${RESET}\n`);
    const pool = await sql.connect(config);
    
    // Verificar si CarniceriaDB existe
    const dbCheck = await pool.request()
      .input('dbName', sql.NVarChar, 'CarniceriaDB')
      .query('SELECT database_id, name FROM sys.databases WHERE name = @dbName');
    
    if (dbCheck.recordset.length === 0) {
      console.log(`${RED}❌ CarniceriaDB NO EXISTE${RESET}\n`);
      
      console.log(`${YELLOW}Creando CarniceriaDB ahora...${RESET}`);
      
      try {
        await pool.request().query('CREATE DATABASE [CarniceriaDB]');
        console.log(`${GREEN}✅ CarniceriaDB creada exitosamente${RESET}\n`);
      } catch (createErr) {
        console.log(`${RED}❌ Error creando base de datos:${RESET}`, createErr.message);
        process.exit(1);
      }
    } else {
      console.log(`${GREEN}✅ CarniceriaDB existe${RESET}`);
      console.log(`   ID: ${dbCheck.recordset[0].database_id}\n`);
    }
    
    await pool.close();
    
    // Ahora conectarse a CarniceriaDB para verificar tablas
    const dbConfig = {
      ...config,
      database: 'CarniceriaDB'
    };
    
    console.log(`${BLUE}🔍 Conectando a CarniceriaDB...${RESET}\n`);
    const dbPool = await sql.connect(dbConfig);
    
    const tablesResult = await dbPool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);
    
    if (tablesResult.recordset.length === 0) {
      console.log(`${YELLOW}⚠️  CarniceriaDB está vacía (sin tablas)${RESET}\n`);
    } else {
      console.log(`${GREEN}📊 Tablas en CarniceriaDB (${tablesResult.recordset.length}):${RESET}`);
      tablesResult.recordset.forEach(table => {
        console.log(`   ✓ ${table.TABLE_NAME}`);
      });
      console.log('');
    }
    
    await dbPool.close();
    
    console.log(`${GREEN}✅ Verificación completada${RESET}\n`);
    
  } catch (err) {
    console.log(`${RED}❌ Error:${RESET}`, err.message);
    console.log(err);
    process.exit(1);
  }
}

checkDatabase();
