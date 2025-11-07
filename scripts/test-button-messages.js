/**
 * Script para probar mensajes con botones
 * Simula una conversación real con botones interactivos
 * 
 * Ejecutar con: node scripts/test-button-messages.js
 */

import 'dotenv/config';
import { saveMessage } from '../src/services/messageService.js';
import logger from '../src/logger.js';

async function testButtonMessages() {
  console.log('========================================');
  console.log(' PRUEBA DE MENSAJES CON BOTONES');
  console.log('========================================\n');

  try {
    const testPhone = '5215512345678';

    // 1. Bot envía saludo con botones
    console.log('1️⃣  Bot envía menú principal con botones...');
    await saveMessage(
      testPhone,
      'enviado',
      '👋 ¿Como te puedo ayudar?\n[Botones: 🛒 Hacer pedido, 🚚 Estado pedido, 📞 Información]',
      'interactive',
      {
        messageId: 'test_btn_001',
        timestamp: Date.now(),
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: '👋 ¿Como te puedo ayudar?' },
          action: {
            buttons: [
              { type: 'reply', reply: { id: 'BTN_HACER_PEDIDO', title: '🛒 Hacer pedido' } },
              { type: 'reply', reply: { id: 'BTN_ESTATUS_PEDIDO', title: '🚚 Estado pedido' } },
              { type: 'reply', reply: { id: 'BTN_INFORMACION', title: '📞 Información' } }
            ]
          }
        }
      }
    );
    console.log('   ✅ Mensaje con botones guardado\n');

    // 2. Cliente presiona botón
    console.log('2️⃣  Cliente presiona botón "Hacer pedido"...');
    await saveMessage(
      testPhone,
      'recibido',
      '🛒 Hacer pedido',
      'interactive',
      {
        messageId: 'test_btn_002',
        timestamp: Date.now(),
        type: 'interactive',
        interactive: {
          type: 'button_reply',
          button_reply: {
            id: 'BTN_HACER_PEDIDO',
            title: '🛒 Hacer pedido'
          }
        },
        buttonId: 'BTN_HACER_PEDIDO'
      }
    );
    console.log('   ✅ Respuesta de botón guardada\n');

    // 3. Bot responde con texto
    console.log('3️⃣  Bot responde con instrucciones...');
    await saveMessage(
      testPhone,
      'enviado',
      'Perfecto ✅\nEscribe tu pedido en formato natural, ejemplo: "2 kg de pollo". Escribe "Finalizar pedido" cuando termines.',
      'text',
      { messageId: 'test_btn_003', timestamp: Date.now() }
    );
    console.log('   ✅ Texto guardado\n');

    // 4. Cliente escribe pedido
    console.log('4️⃣  Cliente escribe su pedido...');
    await saveMessage(
      testPhone,
      'recibido',
      '2 kg de bistec\n1 kg de chorizo\nFinalizar pedido',
      'text',
      { messageId: 'test_btn_004', timestamp: Date.now() }
    );
    console.log('   ✅ Pedido guardado\n');

    // 5. Bot envía confirmación con botones
    console.log('5️⃣  Bot pide confirmación con botones...');
    await saveMessage(
      testPhone,
      'enviado',
      '📝 Tu pedido hasta ahora:\n2 kg de bistec\n1 kg de chorizo\n\n¿Qué deseas hacer?\n[Botones: ➕ Agregar más, ✅ Confirmar]',
      'interactive',
      {
        messageId: 'test_btn_005',
        timestamp: Date.now(),
        type: 'interactive',
        interactive: {
          type: 'button',
          body: {
            text: '📝 Tu pedido hasta ahora:\n2 kg de bistec\n1 kg de chorizo\n\n¿Qué deseas hacer?'
          },
          action: {
            buttons: [
              { type: 'reply', reply: { id: 'AGREGAR_MAS', title: '➕ Agregar más' } },
              { type: 'reply', reply: { id: 'CONFIRMAR_PEDIDO', title: '✅ Confirmar' } }
            ]
          }
        }
      }
    );
    console.log('   ✅ Confirmación con botones guardada\n');

    // 6. Cliente confirma
    console.log('6️⃣  Cliente presiona "Confirmar"...');
    await saveMessage(
      testPhone,
      'recibido',
      '✅ Confirmar',
      'interactive',
      {
        messageId: 'test_btn_006',
        timestamp: Date.now(),
        type: 'interactive',
        interactive: {
          type: 'button_reply',
          button_reply: {
            id: 'CONFIRMAR_PEDIDO',
            title: '✅ Confirmar'
          }
        },
        buttonId: 'CONFIRMAR_PEDIDO'
      }
    );
    console.log('   ✅ Confirmación guardada\n');

    console.log('========================================');
    console.log(' ✅ CONVERSACIÓN DE PRUEBA CREADA');
    console.log('========================================\n');
    console.log('Ahora puedes ver esta conversación en el dashboard:');
    console.log('📱 Teléfono: ' + testPhone);
    console.log('💬 Mensajes: 6 (3 enviados, 3 recibidos)');
    console.log('🔘 Incluye mensajes con botones interactivos\n');

  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
    process.exit(1);
  }
}

// Ejecutar pruebas
testButtonMessages();
