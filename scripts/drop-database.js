/**
 * Script para eliminar CarniceriaDB (útil para testing)
 */

import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const RESET = '\x1b[0m';

async function dropDatabase() {
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
    console.log(`${YELLOW}⚠️  Eliminando CarniceriaDB...${RESET}\n`);
    const pool = await sql.connect(config);
    
    // Cerrar todas las conexiones activas primero
    await pool.request().query(`
      ALTER DATABASE [CarniceriaDB] SET SINGLE_USER WITH ROLLBACK IMMEDIATE
    `);
    
    // Eliminar la base de datos
    await pool.request().query('DROP DATABASE [CarniceriaDB]');
    
    await pool.close();
    
    console.log(`${GREEN}✅ CarniceriaDB eliminada exitosamente${RESET}\n`);
    
  } catch (err) {
    if (err.message.includes('does not exist')) {
      console.log(`${YELLOW}⚠️  CarniceriaDB no existe (ya estaba eliminada)${RESET}\n`);
    } else {
      console.log(`${RED}❌ Error:${RESET}`, err.message);
      process.exit(1);
    }
  }
}

dropDatabase();
