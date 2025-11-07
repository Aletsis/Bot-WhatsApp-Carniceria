/**
 * Script para probar funcionalidad de búsqueda
 * Crea datos de prueba con diferentes nombres y contenidos
 * 
 * Ejecutar con: node scripts/test-search.js
 */

import 'dotenv/config';
import { saveMessage, searchMessages, searchConversations } from '../src/services/messageService.js';
import { getPool } from '../src/services/dbService.js';

async function testSearch() {
  console.log('========================================');
  console.log(' PRUEBA DE BÚSQUEDA EN CHATS');
  console.log('========================================\n');

  try {
    // 1. Crear datos de prueba
    console.log('1️⃣  Creando datos de prueba...\n');
    
    const pool = await getPool();
    
    // Insertar clientes de prueba
    await pool.request().query(`
      MERGE INTO Clientes AS target
      USING (VALUES 
        ('5215512345678', 'Juan Pérez'),
        ('5215587654321', 'María García'),
        ('5215598765432', 'Pedro Martínez')
      ) AS source (NumeroTelefono, Nombre)
      ON target.NumeroTelefono = source.NumeroTelefono
      WHEN NOT MATCHED THEN
        INSERT (NumeroTelefono, Nombre, Direccion)
        VALUES (source.NumeroTelefono, source.Nombre, 'Dirección de prueba');
    `);
    
    console.log('   ✅ Clientes de prueba creados\n');
    
    // 2. Crear mensajes con diferentes contenidos
    const mensajes = [
      { telefono: '5215512345678', tipo: 'recibido', contenido: 'Hola, quiero ordenar 2 kg de pollo' },
      { telefono: '5215512345678', tipo: 'enviado', contenido: 'Perfecto, anotado tu pedido de pollo' },
      { telefono: '5215587654321', tipo: 'recibido', contenido: 'Necesito 1 kg de bistec' },
      { telefono: '5215587654321', tipo: 'enviado', contenido: 'Tu pedido de bistec está listo' },
      { telefono: '5215598765432', tipo: 'recibido', contenido: '¿Tienen chorizo disponible?' },
      { telefono: '5215598765432', tipo: 'enviado', contenido: 'Sí, tenemos chorizo fresco' },
    ];
    
    for (const msg of mensajes) {
      await saveMessage(
        msg.telefono,
        msg.tipo,
        msg.contenido,
        'text',
        { messageId: `test_search_${Date.now()}`, timestamp: Date.now() }
      );
    }
    
    console.log('   ✅ Mensajes de prueba guardados\n');
    
    // 3. Probar búsqueda de mensajes por contenido
    console.log('2️⃣  Probando búsqueda de mensajes...\n');
    
    console.log('   🔍 Buscando "pollo"...');
    let results = await searchMessages('pollo');
    console.log(`      ✅ ${results.length} resultados encontrados`);
    results.forEach(r => {
      console.log(`         - ${r.NombreCliente || r.NumeroTelefono}: "${r.Contenido.substring(0, 40)}..."`);
    });
    console.log('');
    
    console.log('   🔍 Buscando "bistec"...');
    results = await searchMessages('bistec');
    console.log(`      ✅ ${results.length} resultados encontrados`);
    results.forEach(r => {
      console.log(`         - ${r.NombreCliente || r.NumeroTelefono}: "${r.Contenido.substring(0, 40)}..."`);
    });
    console.log('');
    
    // 4. Probar búsqueda de conversaciones por nombre
    console.log('3️⃣  Probando búsqueda de conversaciones...\n');
    
    console.log('   🔍 Buscando nombre "Juan"...');
    results = await searchConversations('Juan');
    console.log(`      ✅ ${results.length} conversaciones encontradas`);
    results.forEach(r => {
      console.log(`         - ${r.NombreCliente} (${r.NumeroTelefono})`);
      console.log(`           Último mensaje: "${r.UltimoMensaje?.substring(0, 40)}..."`);
    });
    console.log('');
    
    console.log('   🔍 Buscando nombre "María"...');
    results = await searchConversations('María');
    console.log(`      ✅ ${results.length} conversaciones encontradas`);
    results.forEach(r => {
      console.log(`         - ${r.NombreCliente} (${r.NumeroTelefono})`);
      console.log(`           Último mensaje: "${r.UltimoMensaje?.substring(0, 40)}..."`);
    });
    console.log('');
    
    // 5. Probar búsqueda de conversaciones por teléfono
    console.log('4️⃣  Probando búsqueda por número de teléfono...\n');
    
    console.log('   🔍 Buscando teléfono "5512345678"...');
    results = await searchConversations('5512345678');
    console.log(`      ✅ ${results.length} conversaciones encontradas`);
    results.forEach(r => {
      console.log(`         - ${r.NombreCliente} (${r.NumeroTelefono})`);
    });
    console.log('');
    
    console.log('   🔍 Buscando teléfono "87654321"...');
    results = await searchConversations('87654321');
    console.log(`      ✅ ${results.length} conversaciones encontradas`);
    results.forEach(r => {
      console.log(`         - ${r.NombreCliente} (${r.NumeroTelefono})`);
    });
    console.log('');
    
    console.log('========================================');
    console.log(' ✅ PRUEBAS DE BÚSQUEDA COMPLETADAS');
    console.log('========================================\n');
    console.log('📝 Resumen:');
    console.log('   ✅ Búsqueda por contenido de mensaje');
    console.log('   ✅ Búsqueda por nombre de cliente');
    console.log('   ✅ Búsqueda por número de teléfono');
    console.log('\nAhora puedes probar la búsqueda en el dashboard:\n');
    console.log('   👥 Modo "Contactos": Busca por nombre o teléfono');
    console.log('   💬 Modo "Mensajes": Busca en contenido de mensajes\n');

  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
    process.exit(1);
  }
}

// Ejecutar pruebas
testSearch();
