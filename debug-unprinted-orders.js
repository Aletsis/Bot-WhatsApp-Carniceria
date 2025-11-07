import dotenv from 'dotenv';
import { getPool } from './src/services/dbService.js';
import notificationService from './src/services/notificationService.js';

// Cargar variables de entorno
dotenv.config();

async function debugCheckUnprintedOrders() {
  try {
    console.log('🔍 Iniciando diagnóstico de checkUnprintedOrders...');
    
    const pool = await getPool();
    console.log('✅ Pool de BD obtenido correctamente');
    
    // Paso 1: Verificar pedidos no impresos
    console.log('\n1️⃣ Verificando pedidos no impresos...');
    
    const unprintedQuery = `
      SELECT 
        p.PedidoID,
        p.Cliente,
        p.FechaCreacion,
        p.Estado,
        p.EstadoImpresion,
        p.FechaImpresion,
        DATEDIFF(MINUTE, p.FechaCreacion, GETDATE()) as MinutosTranscurridos
      FROM Pedidos p
      WHERE p.EstadoImpresion IN ('pendiente', 'reintento')
        AND DATEDIFF(MINUTE, p.FechaCreacion, GETDATE()) >= 15
      ORDER BY p.FechaCreacion ASC
    `;
    
    const unprintedResult = await pool.request().query(unprintedQuery);
    console.log(`   📋 Pedidos no impresos encontrados: ${unprintedResult.recordset.length}`);
    
    unprintedResult.recordset.forEach(pedido => {
      console.log(`   - Pedido ${pedido.PedidoID}: ${pedido.Cliente} (${pedido.MinutosTranscurridos} min)`);
      console.log(`     Estado: ${pedido.Estado}, Impresión: ${pedido.EstadoImpresion}`);
    });
    
    if (unprintedResult.recordset.length === 0) {
      console.log('✅ No hay pedidos que requieran notificación');
      process.exit(0);
    }
    
    // Paso 2: Verificar función getAdminPhoneNumbers
    console.log('\n2️⃣ Verificando función getAdminPhoneNumbers...');
    
    try {
      const adminPhones = await notificationService.getAdminPhoneNumbers();
      console.log(`   📱 Números de admin obtenidos: ${adminPhones.length}`);
      adminPhones.forEach(phone => {
        console.log(`   - ${phone}`);
      });
      
      if (adminPhones.length === 0) {
        console.log('❌ PROBLEMA: No se obtuvieron números de teléfono de admin');
        return;
      }
      
    } catch (err) {
      console.log('❌ ERROR en getAdminPhoneNumbers:');
      console.log(`   Mensaje: ${err.message}`);
      console.log(`   Stack: ${err.stack}`);
      return;
    }
    
    // Paso 3: Probar envío de notificación individual
    console.log('\n3️⃣ Probando envío de notificación...');
    
    const testPedido = unprintedResult.recordset[0];
    const mensaje = `🚨 *ALERTA: Pedido sin imprimir*\n\nPedido: ${testPedido.PedidoID}\nCliente: ${testPedido.Cliente}\nTiempo sin imprimir: ${testPedido.MinutosTranscurridos} minutos\n\nPor favor, verificar el estado de la impresora.`;
    
    try {
      // Obtener números de admin nuevamente
      const adminPhones = await notificationService.getAdminPhoneNumbers();
      
      console.log(`   📤 Enviando notificación de prueba a ${adminPhones.length} admin(s)...`);
      
      for (const phoneNumber of adminPhones) {
        console.log(`   🔄 Enviando a ${phoneNumber}...`);
        
        // Aquí simularemos el envío sin hacer la llamada real a WhatsApp
        console.log(`   ✅ Simulación exitosa para ${phoneNumber}`);
        
        // Log de notificación
        await notificationService.logNotification('admin_unprinted_orders', mensaje, phoneNumber);
        console.log(`   📝 Log de notificación registrado`);
      }
      
      console.log('✅ Proceso de notificación completado exitosamente');
      
    } catch (err) {
      console.log('❌ ERROR en proceso de notificación:');
      console.log(`   Mensaje: ${err.message}`);
      console.log(`   Stack: ${err.stack}`);
    }
    
    process.exit(0);
    
  } catch (err) {
    console.error('❌ Error general:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  }
}

debugCheckUnprintedOrders();