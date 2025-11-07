import dotenv from 'dotenv';
import { getPool } from './src/services/dbService.js';

// Cargar variables de entorno
dotenv.config();

async function checkTableStructure() {
  try {
    console.log('🔍 Verificando estructura de tabla Pedidos...');
    
    const pool = await getPool();
    console.log('✅ Pool de BD obtenido correctamente');
    
    // Verificar todas las columnas de la tabla Pedidos
    const columnsQuery = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Pedidos'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log(`\n📊 Estructura de tabla Pedidos (${columnsQuery.recordset.length} columnas):`);
    columnsQuery.recordset.forEach(col => {
      console.log(`   - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (Nullable: ${col.IS_NULLABLE})`);
    });
    
    // También verificar algunos pedidos reales para ver qué datos hay
    console.log('\n📋 Muestra de pedidos (últimos 5):');
    const sampleQuery = await pool.request().query(`
      SELECT TOP 5 *
      FROM Pedidos
      ORDER BY PedidoID DESC
    `);
    
    if (sampleQuery.recordset.length > 0) {
      console.log(`   Encontrados ${sampleQuery.recordset.length} pedidos:`);
      sampleQuery.recordset.forEach((pedido, index) => {
        console.log(`   ${index + 1}. Pedido ID: ${pedido.PedidoID}`);
        console.log(`      Folio: ${pedido.Folio || 'N/A'}`);
        console.log(`      Cliente: ${pedido.Cliente || 'N/A'}`);
        console.log(`      Estado: ${pedido.Estado || 'N/A'}`);
        console.log(`      Estado Impresión: ${pedido.EstadoImpresion || 'N/A'}`);
        console.log(`      Fecha: ${pedido.Fecha || pedido.FechaCreacion || pedido.Created || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('   No se encontraron pedidos en la base de datos');
    }
    
    process.exit(0);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  }
}

checkTableStructure();