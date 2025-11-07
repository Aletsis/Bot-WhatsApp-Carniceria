/**
 * Script de Prueba - Sistema de Notificaciones de Errores
 * 
 * Prueba el envío de notificaciones vía WhatsApp a administradores
 * 
 * Uso:
 *   node scripts/test-notifications.js [--force]
 * 
 * Opciones:
 *   --force : Ignorar throttling y enviar siempre
 */

import { notifyAdmins, getNotificationHistory, getNotificationStats } from '../src/services/notificationService.js';
import logger from '../src/logger.js';

async function testNotifications() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   TEST: SISTEMA DE NOTIFICACIONES          ║');
  console.log('╚════════════════════════════════════════════╝\n');

  const forceNotify = process.argv.includes('--force');
  
  if (forceNotify) {
    console.log('⚡ Modo FORCE activado - Ignorando throttling\n');
  }

  try {
    // Test 1: Notificación de error de impresión
    console.log('━'.repeat(50));
    console.log('📋 TEST 1: Notificación de Error de Impresión');
    console.log('━'.repeat(50));
    console.log('');

    const result1 = await notifyAdmins(
      'PRINTING_ERROR',
      'Error al imprimir pedido #12345.\nError: Impresora no responde.\nIntentando reconectar...',
      {
        severidad: 'ERROR',
        metadata: {
          pedidoID: 12345,
          folio: 'P-2025-001',
          impresora: '192.168.1.100',
          intentos: 3
        },
        forceNotify
      }
    );

    console.log('Resultado Test 1:', result1 ? '✅ Enviado' : '❌ No enviado (throttle o error)');
    console.log('');

    // Esperar 2 segundos
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Notificación de errores recurrentes (CRITICAL)
    console.log('━'.repeat(50));
    console.log('📋 TEST 2: Notificación de Errores Recurrentes (CRITICAL)');
    console.log('━'.repeat(50));
    console.log('');

    const result2 = await notifyAdmins(
      'PRINTING_RECURRING',
      '⚠️ ALERTA: Se han detectado 5 errores de impresión en los últimos 10 minutos.\n\n' +
      'Pedidos afectados:\n' +
      '• Pedido #12345 - Folio P-2025-001\n' +
      '• Pedido #12346 - Folio P-2025-002\n' +
      '• Pedido #12347 - Folio P-2025-003\n\n' +
      'Acción recomendada: Verificar estado de la impresora.',
      {
        severidad: 'CRITICAL',
        metadata: {
          cantidadErrores: 5,
          ventanaTiempo: 10,
          pedidosAfectados: [12345, 12346, 12347]
        },
        forceNotify
      }
    );

    console.log('Resultado Test 2:', result2 ? '✅ Enviado' : '❌ No enviado (throttle o error)');
    console.log('');

    // Esperar 2 segundos
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 3: Notificación de error de base de datos
    console.log('━'.repeat(50));
    console.log('📋 TEST 3: Notificación de Error de Base de Datos');
    console.log('━'.repeat(50));
    console.log('');

    const result3 = await notifyAdmins(
      'DATABASE_ERROR',
      'Error de conexión a la base de datos.\n' +
      'ConnectionError: Failed to connect to localhost:1433 - Could not connect\n\n' +
      'El sistema intentará reconectar automáticamente.',
      {
        severidad: 'CRITICAL',
        metadata: {
          error: 'Connection timeout',
          servidor: 'localhost:1433',
          database: 'CarniceriaDB'
        },
        forceNotify
      }
    );

    console.log('Resultado Test 3:', result3 ? '✅ Enviado' : '❌ No enviado (throttle o error)');
    console.log('');

    // Test 4: Notificación WARNING (pedido no impreso)
    console.log('━'.repeat(50));
    console.log('📋 TEST 4: Notificación WARNING (Pedido No Impreso)');
    console.log('━'.repeat(50));
    console.log('');

    const result4 = await notifyAdmins(
      'ORDER_NOT_PRINTED',
      'El pedido #12348 lleva 15 minutos sin ser impreso.\n\n' +
      'Cliente: Juan Pérez\n' +
      'Teléfono: 52XXXXXXXXXX\n' +
      'Total: $350.00\n\n' +
      'Por favor, verificar el estado de la impresión.',
      {
        severidad: 'WARNING',
        metadata: {
          pedidoID: 12348,
          folio: 'P-2025-004',
          minutosEspera: 15,
          cliente: 'Juan Pérez'
        },
        forceNotify
      }
    );

    console.log('Resultado Test 4:', result4 ? '✅ Enviado' : '❌ No enviado (throttle o error)');
    console.log('');

    // Mostrar historial
    console.log('━'.repeat(50));
    console.log('📊 HISTORIAL DE NOTIFICACIONES (Últimas 10)');
    console.log('━'.repeat(50));
    console.log('');

    const history = await getNotificationHistory({ limit: 10 });
    
    if (history.length === 0) {
      console.log('⚠️  No hay notificaciones en el historial\n');
    } else {
      console.table(history.map(n => ({
        ID: n.NotificacionID,
        Tipo: n.TipoError,
        Severidad: n.Severidad,
        Estado: n.Estado,
        Destinatarios: n.Destinatarios.split(',').length + ' admins',
        Fecha: new Date(n.CreadoEn).toLocaleString('es-MX')
      })));
    }

    // Mostrar estadísticas
    console.log('━'.repeat(50));
    console.log('📈 ESTADÍSTICAS (Últimos 7 días)');
    console.log('━'.repeat(50));
    console.log('');

    const stats = await getNotificationStats();
    
    if (stats) {
      console.log('Resumen General:');
      console.log('  • Total notificaciones: %d', stats.general.TotalNotificaciones);
      console.log('  • Enviadas: %d', stats.general.Enviadas);
      console.log('  • Errores: %d', stats.general.Errores);
      console.log('  • Throttled (bloqueadas): %d', stats.general.Throttled);
      
      if (stats.general.UltimaNotificacion) {
        console.log('  • Última: %s', new Date(stats.general.UltimaNotificacion).toLocaleString('es-MX'));
      }
      
      console.log('');
      
      if (stats.porTipo.length > 0) {
        console.log('Por Tipo de Error:');
        console.table(stats.porTipo.map(t => ({
          Tipo: t.TipoError,
          Cantidad: t.Cantidad,
          Última: new Date(t.Ultima).toLocaleString('es-MX')
        })));
      }
    }

    console.log('');
    console.log('╔════════════════════════════════════════════╗');
    console.log('║   ✅ TESTS COMPLETADOS                     ║');
    console.log('╚════════════════════════════════════════════╝');
    console.log('');
    console.log('💡 NOTAS:');
    console.log('');
    console.log('1️⃣  Si ves "No enviado (throttle)", es normal:');
    console.log('   El sistema está evitando spam. Las notificaciones');
    console.log('   del mismo tipo solo se envían cada X minutos.');
    console.log('');
    console.log('2️⃣  Para ignorar throttling y probar envío:');
    console.log('   node scripts/test-notifications.js --force');
    console.log('');
    console.log('3️⃣  Verifica que los administradores tengan');
    console.log('   NumeroWhatsApp configurado en la BD:');
    console.log('   UPDATE dbo.Usuarios');
    console.log('   SET NumeroWhatsApp = \'52XXXXXXXXXX\'');
    console.log('   WHERE Rol = \'admin\' AND UsuarioID = X;');
    console.log('');

  } catch (error) {
    console.error('\n❌ Error en tests:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Ejecutar tests
testNotifications()
  .then(() => {
    console.log('✅ Tests finalizados exitosamente\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
