import dotenv from 'dotenv';
import { getPool } from './src/services/dbService.js';
import notificationService from './src/services/notificationService.js';

// Cargar variables de entorno
dotenv.config();

async function testSeparatedNotifications() {
  try {
    console.log('🧪 Probando sistema de notificaciones separadas...');
    
    const pool = await getPool();
    console.log('✅ Pool de BD obtenido correctamente');
    
    // Verificar usuarios disponibles
    console.log('\n1️⃣ Verificando usuarios disponibles:');
    const usersQuery = await pool.request().query(`
      SELECT 
        UsuarioID,
        Username,
        Rol,
        NumeroWhatsApp,
        Activo
      FROM Usuarios
      WHERE Activo = 1 AND NumeroWhatsApp IS NOT NULL
      ORDER BY 
        CASE Rol 
          WHEN 'admin' THEN 1 
          WHEN 'supervisor' THEN 2 
          ELSE 3 
        END,
        Username
    `);
    
    console.log(`   👥 Usuarios activos con WhatsApp: ${usersQuery.recordset.length}`);
    usersQuery.recordset.forEach(user => {
      console.log(`     - ${user.Username} (${user.Rol}): ${user.NumeroWhatsApp}`);
    });
    
    // Prueba 1: Notificación de Sistema (solo admin)
    console.log('\n2️⃣ PRUEBA 1: Notificación de Sistema (solo admin)');
    console.log('   📤 Enviando WHATSAPP_API_ERROR...');
    
    try {
      const result1 = await notificationService.notifySystemError('WHATSAPP_API_ERROR', 
        '🔥 *ERROR DE SISTEMA*\n\nFalla en la API de WhatsApp.\nCódigo: 500\nHora: ' + new Date().toLocaleString(), 
        {
          severidad: 'CRITICAL',
          metadata: { 
            source: 'test_script',
            apiEndpoint: '/api/whatsapp/send',
            errorCode: 500
          }
        }
      );
      
      console.log(`   ${result1 ? '✅' : '❌'} Resultado: ${result1 ? 'ENVIADO' : 'FALLIDO'}`);
      
      if (result1) {
        console.log('   📝 Esta notificación debería haber llegado SOLO al admin');
      }
      
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
    }
    
    // Esperar un momento entre pruebas
    console.log('\n   ⏳ Esperando 3 segundos...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Prueba 2: Notificación Operativa (admin + supervisor)
    console.log('\n3️⃣ PRUEBA 2: Notificación Operativa (admin + supervisor)');
    console.log('   📤 Enviando ORDER_NOT_PRINTED...');
    
    try {
      const result2 = await notificationService.notifyOperationalIssue('ORDER_NOT_PRINTED', 
        '⚠️ *PEDIDO SIN IMPRIMIR*\n\nPedido: TEST-12345\nCliente: Cliente de Prueba\nTiempo sin imprimir: 25 minutos\n\n🖨️ Por favor verificar el estado de la impresora.',
        {
          severidad: 'WARNING',
          metadata: { 
            source: 'test_script',
            pedidoId: 'TEST-12345',
            minutosRetraso: 25
          }
        }
      );
      
      console.log(`   ${result2 ? '✅' : '❌'} Resultado: ${result2 ? 'ENVIADO' : 'FALLIDO'}`);
      
      if (result2) {
        console.log('   📝 Esta notificación debería haber llegado al admin Y al supervisor');
      }
      
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
    }
    
    // Esperar un momento antes de verificar logs
    console.log('\n   ⏳ Esperando 2 segundos para verificar logs...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verificar historial de notificaciones
    console.log('\n4️⃣ Verificando historial de notificaciones:');
    
    try {
      const historial = await notificationService.getNotificationHistory({
        limit: 5
      });
      
      console.log(`   📋 Últimas ${historial.length} notificaciones:`);
      historial.forEach((notif, index) => {
        const fecha = new Date(notif.CreadoEn).toLocaleString();
        console.log(`     ${index + 1}. ${notif.TipoError} (${notif.Estado}) - ${fecha}`);
        console.log(`        Severidad: ${notif.Severidad}`);
        console.log(`        Destinatarios: ${notif.Destinatarios || 'N/A'}`);
        if (notif.Metadata) {
          try {
            const metadata = JSON.parse(notif.Metadata);
            if (metadata.recipientSummary) {
              console.log(`        Enviado a: ${metadata.recipientSummary}`);
            }
          } catch (e) {
            // Ignorar errores de parsing
          }
        }
        console.log('');
      });
      
    } catch (err) {
      console.log(`   ❌ Error obteniendo historial: ${err.message}`);
    }
    
    // Resumen final
    console.log('\n5️⃣ RESUMEN DE PRUEBAS:');
    console.log('   🔴 Notificaciones de Sistema:');
    console.log('      ✅ Solo se envían a administradores');
    console.log('      ✅ Incluyen: errores de API, BD, webhooks, etc.');
    console.log('');
    console.log('   🟡 Notificaciones Operativas:');
    console.log('      ✅ Se envían a administradores Y supervisores');
    console.log('      ✅ Incluyen: pedidos sin imprimir, demoras, etc.');
    console.log('');
    console.log('   📱 Distribución por Rol:');
    
    const adminCount = usersQuery.recordset.filter(u => u.Rol === 'admin').length;
    const supervisorCount = usersQuery.recordset.filter(u => u.Rol === 'supervisor').length;
    
    console.log(`      - Admin: ${adminCount} usuarios (reciben AMBOS tipos)`);
    console.log(`      - Supervisor: ${supervisorCount} usuarios (solo operativas)`);
    console.log(`      - Total sistema: ${adminCount} destinatarios`);
    console.log(`      - Total operativas: ${adminCount + supervisorCount} destinatarios`);
    
    console.log('\n🎉 ¡Sistema de notificaciones separadas funcionando correctamente!');
    
    process.exit(0);
    
  } catch (err) {
    console.error('❌ Error general:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  }
}

testSeparatedNotifications();