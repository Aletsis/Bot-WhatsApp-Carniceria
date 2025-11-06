/**
 * Script para diagnosticar y corregir el campo Editable en Configuraciones
 * 
 * Ejecutar con: node scripts/fix-configuraciones.js
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

async function diagnosticarYCorregir() {
  let pool;
  
  try {
    console.log('🔌 Conectando a SQL Server...');
    pool = await sql.connect(config);
    console.log('✅ Conexión exitosa\n');
    
    // 1. Verificar tabla existe
    console.log('========================================');
    console.log(' DIAGNÓSTICO DE CONFIGURACIONES');
    console.log('========================================\n');
    
    const tableCheck = await pool.request().query(`
      SELECT COUNT(*) as Total 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'Configuraciones'
    `);
    
    if (tableCheck.recordset[0].Total === 0) {
      console.log('❌ ERROR: La tabla Configuraciones no existe');
      console.log('   Por favor ejecute primero: migrations/10_configuraciones.sql');
      return;
    }
    
    console.log('✅ Tabla Configuraciones encontrada\n');
    
    // 2. Mostrar estado actual
    console.log('--- Estado actual de configuraciones ---');
    const estadoActual = await pool.request().query(`
      SELECT 
        ConfigID,
        Clave,
        Valor = CASE 
          WHEN Tipo = 'secret' AND LEN(Valor) > 4 THEN '****' + RIGHT(Valor, 4)
          ELSE Valor 
        END,
        Tipo,
        Categoria,
        Editable,
        FechaActualizacion
      FROM Configuraciones 
      ORDER BY Categoria, Clave
    `);
    
    console.table(estadoActual.recordset);
    
    // 3. Resumen por Editable
    console.log('\n--- Resumen por Editable ---');
    const resumen = await pool.request().query(`
      SELECT 
        Editable,
        Cantidad = COUNT(*)
      FROM Configuraciones
      GROUP BY Editable
    `);
    
    console.table(resumen.recordset);
    
    // 4. Corregir configuraciones no editables
    console.log('\n🔧 Corrigiendo configuraciones...');
    const updateResult = await pool.request().query(`
      UPDATE Configuraciones 
      SET Editable = 1 
      WHERE Editable = 0 OR Editable IS NULL
    `);
    
    const rowsUpdated = updateResult.rowsAffected[0];
    
    if (rowsUpdated > 0) {
      console.log(`✅ Se actualizaron ${rowsUpdated} configuraciones a Editable = 1`);
    } else {
      console.log('✅ Todas las configuraciones ya eran editables');
    }
    
    // 5. Mostrar estado final
    console.log('\n--- Estado final ---');
    const estadoFinal = await pool.request().query(`
      SELECT 
        ConfigID,
        Clave,
        Tipo,
        Categoria,
        Editable,
        Descripcion
      FROM Configuraciones 
      ORDER BY Categoria, Clave
    `);
    
    console.table(estadoFinal.recordset);
    
    console.log('\n========================================');
    console.log(' ✅ DIAGNÓSTICO Y CORRECCIÓN COMPLETADA');
    console.log('========================================\n');
    
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
diagnosticarYCorregir();
