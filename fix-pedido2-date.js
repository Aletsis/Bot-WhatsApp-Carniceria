import dotenv from 'dotenv';
import { getPool } from './src/services/dbService.js';

// Cargar variables de entorno
dotenv.config();

async function fixPedido2Date() {
  try {
    console.log('🔧 Corrigiendo fecha del Pedido 2...');
    
    const pool = await getPool();
    
    // Calcular una fecha razonable (hace 30 minutos)
    const fechaCorregida = new Date(Date.now() - (30 * 60 * 1000)); // 30 minutos atrás
    
    console.log(`📅 Fecha actual: ${new Date().toLocaleString()}`);
    console.log(`📅 Nueva fecha para pedido: ${fechaCorregida.toLocaleString()}`);
    
    // Actualizar la fecha del pedido
    const updateResult = await pool.request()
      .input('pedidoID', 2)
      .input('nuevaFecha', fechaCorregida)
      .query(`
        UPDATE Pedidos 
        SET Fecha = @nuevaFecha
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
        DATEDIFF(MINUTE, Fecha, SYSDATETIME()) AS MinutosSinImprimir
      FROM Pedidos
      WHERE PedidoID = 2
    `);
    
    if (verifyQuery.recordset.length > 0) {
      const pedido = verifyQuery.recordset[0];
      console.log('\n📋 Verificación post-actualización:');
      console.log(`   Pedido: ${pedido.Folio}`);
      console.log(`   Nueva fecha: ${pedido.Fecha}`);
      console.log(`   Minutos sin imprimir: ${pedido.MinutosSinImprimir}`);
      console.log(`   Estado impresión: ${pedido.EstadoImpresion}`);
      
      if (pedido.MinutosSinImprimir > 15) {
        console.log('✅ ¡Ahora el pedido cumple el criterio de tiempo!');
        console.log('🔔 El monitor debería detectarlo en la próxima verificación');
      } else {
        console.log('⏰ El pedido aún no cumple los 15 minutos mínimos');
      }
    }
    
    process.exit(0);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  }
}

fixPedido2Date();