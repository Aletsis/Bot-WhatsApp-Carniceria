/**
 * Script de prueba para el sistema de mensajes
 * 
 * Ejecutar con: node scripts/test-messages.js
 */

import 'dotenv/config';
import { saveMessage, getMessageHistory, getConversationList, getMessageStats } from '../src/services/messageService.js';
import logger from '../src/logger.js';

async function testMessageService() {
  console.log('========================================');
  console.log(' PRUEBA DEL SISTEMA DE MENSAJES');
  console.log('========================================\n');

  try {
    const testPhone = '5215512345678';

    // 1. Guardar un mensaje de prueba recibido
    console.log('1️⃣  Guardando mensaje recibido de prueba...');
    const mensajeId1 = await saveMessage(
      testPhone,
      'recibido',
      'Hola, quiero hacer un pedido',
      'texto',
      { messageId: 'test_001', timestamp: Date.now() },
      'entregado'
    );
    console.log(`   ✅ Mensaje recibido guardado con ID: ${mensajeId1}\n`);

    // 2. Guardar un mensaje de prueba enviado
    console.log('2️⃣  Guardando mensaje enviado de prueba...');
    const mensajeId2 = await saveMessage(
      testPhone,
      'enviado',
      '¡Hola! Claro, con gusto te ayudo. ¿Qué deseas ordenar?',
      'texto',
      { messageId: 'test_002', timestamp: Date.now() },
      'entregado'
    );
    console.log(`   ✅ Mensaje enviado guardado con ID: ${mensajeId2}\n`);

    // 3. Recuperar historial
    console.log('3️⃣  Recuperando historial de conversación...');
    const history = await getMessageHistory(testPhone, 10, 0);
    console.log(`   ✅ Historial recuperado: ${history.length} mensajes`);
    history.forEach(msg => {
      console.log(`      [${msg.Tipo}] ${msg.Contenido.substring(0, 50)}...`);
    });
    console.log('');

    // 4. Obtener lista de conversaciones
    console.log('4️⃣  Obteniendo lista de conversaciones...');
    const conversations = await getConversationList(10, 0);
    console.log(`   ✅ Conversaciones encontradas: ${conversations.length}`);
    conversations.forEach(conv => {
      console.log(`      📱 ${conv.NumeroTelefono} - ${conv.NombreCliente || 'Sin nombre'}`);
      console.log(`         Último: ${conv.UltimoMensaje?.substring(0, 40)}...`);
    });
    console.log('');

    // 5. Obtener estadísticas
    console.log('5️⃣  Obteniendo estadísticas...');
    const stats = await getMessageStats();
    console.log('   ✅ Estadísticas:');
    console.log(`      Total de mensajes: ${stats.TotalMensajes}`);
    console.log(`      Mensajes recibidos: ${stats.TotalRecibidos}`);
    console.log(`      Mensajes enviados: ${stats.TotalEnviados}`);
    console.log(`      Conversaciones: ${stats.TotalConversaciones}`);
    console.log(`      Mensajes últimas 24h: ${stats.MensajesUltimas24h}`);
    console.log(`      Mensajes última semana: ${stats.MensajesUltima7d}`);
    console.log('');

    console.log('========================================');
    console.log(' ✅ TODAS LAS PRUEBAS EXITOSAS');
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
    process.exit(1);
  }
}

// Ejecutar pruebas
testMessageService();
