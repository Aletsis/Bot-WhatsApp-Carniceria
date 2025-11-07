/**
 * Script para ejecutar la migración de la tabla Mensajes
 * 
 * Ejecutar con: node scripts/run-mensajes-migration.js
 */

import sql from 'mssql';
import 'dotenv/config';

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

async function runMigration() {
  let pool;
  
  try {
    console.log('🔌 Conectando a SQL Server...');
    pool = await sql.connect(config);
    console.log('✅ Conexión exitosa\n');
    
    console.log('========================================');
    console.log(' MIGRACIÓN 13 - TABLA MENSAJES');
    console.log('========================================\n');
    
    // Verificar si la tabla existe
    const checkTable = await pool.request().query(`
      SELECT COUNT(*) as Total 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'Mensajes'
    `);
    
    if (checkTable.recordset[0].Total > 0) {
      console.log('⚠️  La tabla Mensajes ya existe, omitiendo creación\n');
    } else {
      // Crear tabla
      await pool.request().query(`
        CREATE TABLE Mensajes (
          MensajeID BIGINT PRIMARY KEY IDENTITY(1,1),
          NumeroTelefono NVARCHAR(30) NOT NULL,
          Tipo NVARCHAR(20) NOT NULL CHECK (Tipo IN ('recibido', 'enviado')),
          Contenido NVARCHAR(MAX) NOT NULL,
          TipoMensaje NVARCHAR(50) DEFAULT 'texto',
          MetadataWhatsApp NVARCHAR(MAX),
          Estado NVARCHAR(20) DEFAULT 'entregado',
          Fecha DATETIME2 NOT NULL DEFAULT SYSDATETIME()
        )
      `);
      console.log('✅ Tabla Mensajes creada exitosamente');
      
      // Crear índice por teléfono y fecha
      await pool.request().query(`
        CREATE INDEX IX_Mensajes_Telefono_Fecha 
        ON Mensajes(NumeroTelefono, Fecha DESC)
      `);
      console.log('✅ Índice IX_Mensajes_Telefono_Fecha creado');
      
      // Crear índice por fecha
      await pool.request().query(`
        CREATE INDEX IX_Mensajes_Fecha 
        ON Mensajes(Fecha DESC)
      `);
      console.log('✅ Índice IX_Mensajes_Fecha creado');
    }
    
    console.log('\n========================================');
    console.log(' ✅ MIGRACIÓN 13 COMPLETADA');
    console.log('========================================\n');
    console.log('📊 Tabla Mensajes lista para almacenar historial de conversaciones');
    console.log('   - Soporta mensajes enviados y recibidos');
    console.log('   - Índices optimizados para consultas rápidas');
    console.log('   - Metadatos de WhatsApp en formato JSON\n');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

// Ejecutar
runMigration();
