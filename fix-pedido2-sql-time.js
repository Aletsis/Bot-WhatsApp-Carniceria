import dotenv from 'dotenv';
import { getPool } from './src/services/dbService.js';

// Cargar variables de entorno
dotenv.config();

async function fixPedido2DateWithSQLTime() {
  try {
    console.log('🔧 Corrigiendo fecha del Pedido 2 usando tiempo de SQL Server...');
    
    const pool = await getPool();
    
    // Obtener la hora actual de SQL Server
    const timeQuery = await pool.request().query(`
      SELECT 
        GETDATE() as FechaActual,
        SYSDATETIME() as FechaActualPrecisa,
        DATEADD(MINUTE, -30, SYSDATETIME()) as FechaMenos30Min
    `);
    
    const sqlTime = timeQuery.recordset[0];
    console.log(`📅 SQL Server GETDATE(): ${sqlTime.FechaActual}`);
    console.log(`📅 SQL Server SYSDATETIME(): ${sqlTime.FechaActualPrecisa}`);
    console.log(`📅 Fecha propuesta (30 min atrás): ${sqlTime.FechaMenos30Min}`);
    
    // Actualizar usando la fecha de SQL Server
    const updateResult = await pool.request()
      .input('pedidoID', 2)
      .query(`
        UPDATE Pedidos 
        SET Fecha = DATEADD(MINUTE, -30, SYSDATETIME())
        WHERE PedidoID = @pedidoID
      `);
    
    console.log(`✅ Pedido 2 actualizado. Filas afectadas: ${updateResult.rowsAffected[0]}`);
    
    // Verificar el cambio
    const verifyQuery = await pool.request().query(`
      SELECT 
        PedidoID,
        Folio,
        Fecha,
        EstadoImpresion,
        SYSDATETIME() as FechaActual,
        DATEDIFF(MINUTE, Fecha, SYSDATETIME()) AS MinutosSinImprimir
      FROM Pedidos
      WHERE PedidoID = 2
    `);
    
    if (verifyQuery.recordset.length > 0) {
      const pedido = verifyQuery.recordset[0];
      console.log('\n📋 Verificación post-actualización:');
      console.log(`   Pedido: ${pedido.Folio}`);
      console.log(`   Fecha del pedido: ${pedido.Fecha}`);
      console.log(`   Fecha actual SQL: ${pedido.FechaActual}`);
      console.log(`   Minutos sin imprimir: ${pedido.MinutosSinImprimir}`);
      console.log(`   Estado impresión: ${pedido.EstadoImpresion}`);
      
      if (pedido.MinutosSinImprimir > 15) {
        console.log('✅ ¡Ahora el pedido cumple el criterio de tiempo!');
        console.log('🔔 El monitor debería detectarlo en la próxima verificación');
      } else if (pedido.MinutosSinImprimir >= 0) {
        console.log(`⏰ El pedido tiene ${pedido.MinutosSinImprimir} minutos (necesita > 15)`);
      } else {
        console.log('❌ Aún hay problema con la fecha (minutos negativos)');
      }
    }
    
    // También verificar si ahora aparece en la consulta del monitor
    console.log('\n🔎 Verificando si aparece en la consulta del monitor:');
    const monitorQuery = await pool.request()
      .input('timeoutMinutes', 15)
      .query(`
        SELECT 
          p.PedidoID,
          p.Folio,
          p.EstadoImpresion,
          DATEDIFF(MINUTE, p.Fecha, SYSDATETIME()) AS MinutosSinImprimir
        FROM Pedidos p
        WHERE p.PedidoID = 2
          AND p.EstadoImpresion IN ('Pendiente', 'Error')
          AND DATEDIFF(MINUTE, p.Fecha, SYSDATETIME()) > @timeoutMinutes
          AND p.NotificacionImpresionEnviada IS NULL
      `);
    
    if (monitorQuery.recordset.length > 0) {
      console.log('✅ ¡El pedido SÍ aparece en la consulta del monitor!');
      console.log('🚀 El próximo ciclo del monitor debería notificarlo');
    } else {
      console.log('❌ El pedido aún NO aparece en la consulta del monitor');
    }
    
    process.exit(0);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  }
}

fixPedido2DateWithSQLTime();