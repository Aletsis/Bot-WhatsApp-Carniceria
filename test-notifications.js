import dotenv from 'dotenv';
import { getPool } from './src/services/dbService.js';
import notificationService from './src/services/notificationService.js';

// Cargar variables de entorno
dotenv.config();

async function testNotificationService() {
  try {
    console.log('🔍 Probando servicio de notificaciones...');
    
    const pool = await getPool();
    console.log('✅ Pool de BD obtenido correctamente');
    
    // Verificar administradores en BD
    console.log('\n1️⃣ Verificando admins en BD...');
    const adminQuery = `
      SELECT UsuarioID, Username, NumeroWhatsApp, Rol, Activo
      FROM Usuarios
      WHERE Rol = 'admin' AND Activo = 1 AND NumeroWhatsApp IS NOT NULL
    `;
    
    const adminResult = await pool.request().query(adminQuery);
    console.log(`   👥 Admins activos con WhatsApp: ${adminResult.recordset.length}`);
    
    adminResult.recordset.forEach(admin => {
      console.log(`   - ${admin.Username}: ${admin.NumeroWhatsApp}`);
    });
    
    if (adminResult.recordset.length === 0) {
      console.log('❌ PROBLEMA: No hay admins activos con WhatsApp');
      process.exit(1);
    }
    
    // Probar notificación
    console.log('\n2️⃣ Probando notificación de prueba...');
    
    const mensaje = `🧪 *PRUEBA DE NOTIFICACIÓN*\n\nEste es un mensaje de prueba del sistema de notificaciones.\nFecha: ${new Date().toLocaleString()}\n\n✅ Si recibiste este mensaje, el sistema funciona correctamente.`;
    
    try {
      await notificationService.notifyAdmins('test_notification', mensaje, {
        priority: 'normal',
        metadata: { source: 'diagnostic_script' }
      });
      
      console.log('✅ Notificación enviada exitosamente');
      console.log('📱 Revisa los teléfonos de los administradores para confirmar recepción');
      
    } catch (notifyError) {
      console.log('❌ ERROR al enviar notificación:');
      console.log(`   Mensaje: ${notifyError.message}`);
      console.log(`   Stack: ${notifyError.stack}`);
    }
    
    // Verificar historial de notificaciones
    console.log('\n3️⃣ Verificando historial reciente...');
    
    try {
      const historial = await notificationService.getNotificationHistory({
        limit: 5,
        tipoError: 'test_notification'
      });
      
      console.log(`   📋 Notificaciones recientes: ${historial.length}`);
      historial.forEach(notif => {
        console.log(`   - ${notif.FechaCreacion}: ${notif.TipoError} (${notif.Estado})`);
      });
      
    } catch (historyError) {
      console.log('❌ ERROR al obtener historial:');
      console.log(`   Mensaje: ${historyError.message}`);
    }
    
    process.exit(0);
    
  } catch (err) {
    console.error('❌ Error general:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  }
}

testNotificationService();