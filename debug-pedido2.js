import dotenv from 'dotenv';
import { getPool } from './src/services/dbService.js';

// Cargar variables de entorno
dotenv.config();

async function debugPedido2() {
  try {
    console.log('🔍 Investigando el Pedido 2 (fecha futura)...');
    
    const pool = await getPool();
    
    // Obtener información detallada del Pedido 2
    const pedidoQuery = await pool.request().query(`
      SELECT 
        p.*,
        c.Nombre as ClienteNombre,
        c.NumeroTelefono,
        GETDATE() as FechaActual,
        SYSDATETIME() as FechaActualPrecisa,
        DATEDIFF(MINUTE, p.Fecha, GETDATE()) as MinutosDiferencia,
        DATEDIFF(MINUTE, p.Fecha, SYSDATETIME()) as MinutosDiferenciaPrecisa
      FROM Pedidos p
      LEFT JOIN Clientes c ON p.ClienteID = c.ClienteID
      WHERE p.PedidoID = 2
    `);
    
    if (pedidoQuery.recordset.length > 0) {
      const pedido = pedidoQuery.recordset[0];
      console.log('\n📋 Detalles del Pedido 2:');
      console.log(`   PedidoID: ${pedido.PedidoID}`);
      console.log(`   Folio: ${pedido.Folio}`);
      console.log(`   Cliente: ${pedido.ClienteNombre} (Tel: ${pedido.NumeroTelefono})`);
      console.log(`   Estado: ${pedido.Estado}`);
      console.log(`   Estado Impresión: ${pedido.EstadoImpresion}`);
      console.log(`   Fecha Pedido: ${pedido.Fecha}`);
      console.log(`   Fecha Actual (GETDATE): ${pedido.FechaActual}`);
      console.log(`   Fecha Actual (SYSDATETIME): ${pedido.FechaActualPrecisa}`);
      console.log(`   Diferencia GETDATE: ${pedido.MinutosDiferencia} minutos`);
      console.log(`   Diferencia SYSDATETIME: ${pedido.MinutosDiferenciaPrecisa} minutos`);
      console.log(`   Notificación enviada: ${pedido.NotificacionImpresionEnviada || 'NULL'}`);
      
      // Análisis
      console.log('\n🔍 Análisis:');
      if (pedido.MinutosDiferenciaPrecisa < 0) {
        console.log('   ❌ PROBLEMA: La fecha del pedido está en el futuro');
        console.log('   📝 Esto puede deberse a:');
        console.log('      - Diferencia de zona horaria');
        console.log('      - Error en el sistema que creó el pedido');
        console.log('      - Problema de sincronización de hora');
      } else if (pedido.MinutosDiferenciaPrecisa >= 15) {
        if (pedido.NotificacionImpresionEnviada) {
          console.log('   ✅ El pedido cumple los criterios PERO ya fue notificado');
        } else {
          console.log('   ❌ El pedido debería ser notificado pero no lo está siendo');
        }
      } else {
        console.log('   ⏰ El pedido aún no cumple el tiempo mínimo (15 min)');
      }
      
      // Probar manualmente la consulta del monitor
      console.log('\n🔎 Probando consulta del monitor manualmente:');
      const monitorQuery = await pool.request()
        .input('timeoutMinutes', 15)
        .query(`
          SELECT 
            p.PedidoID,
            p.Folio,
            p.EstadoImpresion,
            p.Fecha,
            DATEDIFF(MINUTE, p.Fecha, SYSDATETIME()) AS MinutosSinImprimir,
            p.NotificacionImpresionEnviada
          FROM Pedidos p
          WHERE p.PedidoID = 2
            AND p.EstadoImpresion IN ('Pendiente', 'Error')
            AND DATEDIFF(MINUTE, p.Fecha, SYSDATETIME()) > @timeoutMinutes
            AND p.NotificacionImpresionEnviada IS NULL
        `);
      
      if (monitorQuery.recordset.length > 0) {
        console.log('   ✅ El pedido SÍ aparece en la consulta del monitor');
        console.log('   🤔 Puede haber un problema con el proceso de notificación');
      } else {
        console.log('   ❌ El pedido NO aparece en la consulta del monitor');
        console.log('   📝 Razones posibles:');
        console.log(`      - Estado: ${pedido.EstadoImpresion} (debe ser Pendiente o Error)`);
        console.log(`      - Tiempo: ${pedido.MinutosDiferenciaPrecisa} min (debe ser > 15)`);
        console.log(`      - Notificación: ${pedido.NotificacionImpresionEnviada ? 'Ya enviada' : 'NULL'}`);
      }
      
    } else {
      console.log('❌ No se encontró el Pedido 2');
    }
    
    process.exit(0);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  }
}

debugPedido2();