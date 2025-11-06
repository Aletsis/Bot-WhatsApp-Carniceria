/**
 * Script de prueba para actualización de estado de pedidos
 * 
 * Uso: node scripts/test-update-estado.js
 * 
 * Este script prueba el endpoint de actualización de estado
 * para verificar que funciona correctamente.
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

async function testUpdateEstado() {
  console.log('🧪 Iniciando prueba de actualización de estado...\n');
  
  try {
    // 1. Login primero
    console.log('📝 1. Intentando login...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    }, {
      withCredentials: true
    });
    
    console.log('✅ Login exitoso\n');
    
    // Obtener cookies de sesión
    const cookies = loginResponse.headers['set-cookie'];
    
    // 2. Obtener lista de pedidos
    console.log('📋 2. Obteniendo lista de pedidos...');
    const pedidosResponse = await axios.get(`${BASE_URL}/api/dashboard/pedidos`, {
      headers: {
        Cookie: cookies
      },
      withCredentials: true
    });
    
    const pedidos = pedidosResponse.data.data || pedidosResponse.data;
    console.log(`✅ ${pedidos.length} pedidos encontrados\n`);
    
    if (pedidos.length === 0) {
      console.log('⚠️ No hay pedidos para probar. Crea un pedido primero.');
      return;
    }
    
    // 3. Probar actualización de estado
    const pedidoTest = pedidos[0];
    console.log('🔄 3. Probando actualización de estado...');
    console.log(`   Pedido ID: ${pedidoTest.PedidoID}`);
    console.log(`   Folio: ${pedidoTest.Folio}`);
    console.log(`   Estado actual: ${pedidoTest.Estado}`);
    
    // Cambiar a un estado diferente
    const nuevoEstado = pedidoTest.Estado === 'En espera de surtir' 
      ? 'En ruta' 
      : 'En espera de surtir';
    
    console.log(`   Nuevo estado: ${nuevoEstado}\n`);
    
    const updateResponse = await axios.put(
      `${BASE_URL}/api/dashboard/pedidos/${pedidoTest.PedidoID}/estado`,
      { nuevoEstado },
      {
        headers: {
          Cookie: cookies,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      }
    );
    
    console.log('✅ Estado actualizado exitosamente');
    console.log('   Respuesta:', updateResponse.data);
    
    // 4. Verificar que se actualizó
    console.log('\n✔️ 4. Verificando actualización...');
    const verificacionResponse = await axios.get(`${BASE_URL}/api/dashboard/pedidos`, {
      headers: {
        Cookie: cookies
      },
      withCredentials: true
    });
    
    const pedidosActualizados = verificacionResponse.data.data || verificacionResponse.data;
    const pedidoActualizado = pedidosActualizados.find(p => p.PedidoID === pedidoTest.PedidoID);
    
    if (pedidoActualizado && pedidoActualizado.Estado === nuevoEstado) {
      console.log('✅ Verificación exitosa - Estado actualizado correctamente');
      console.log(`   Estado verificado: ${pedidoActualizado.Estado}\n`);
    } else {
      console.log('❌ Error en verificación - El estado no se actualizó');
    }
    
    console.log('🎉 Prueba completada exitosamente\n');
    
  } catch (error) {
    console.error('\n❌ Error en la prueba:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Error:', error.response.data);
    } else {
      console.error('   Error:', error.message);
    }
    console.log('\n💡 Asegúrate de que:');
    console.log('   - El servidor está corriendo (npm start)');
    console.log('   - Tienes al menos un pedido en la base de datos');
    console.log('   - Las credenciales de admin son correctas (admin/admin123)');
  }
}

testUpdateEstado();
