/**
 * Script para probar el envío de mensajes desde el dashboard
 * 
 * Este script prueba:
 * 1. Envío de mensaje a un cliente
 * 2. Verificación de que el mensaje se guardó en la base de datos
 * 3. Validación de errores (teléfono inválido, mensaje vacío)
 */

import axios from 'axios';

const API_URL = 'http://localhost:3000/api/dashboard';

// Configurar autenticación (necesitamos estar logueados)
const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true
});

async function login() {
  try {
    console.log('🔐 Iniciando sesión...');
    const response = await axios.post('http://localhost:3000/api/auth/login', {
      username: 'admin',
      password: 'admin123' // Cambia esto por tu contraseña
    }, {
      withCredentials: true
    });
    
    if (response.data.success) {
      console.log('✅ Sesión iniciada correctamente');
      return response.headers['set-cookie'];
    }
  } catch (error) {
    console.error('❌ Error en login:', error.response?.data || error.message);
    throw error;
  }
}

async function testSendMessage(telefono, mensaje) {
  try {
    console.log(`\n📤 Enviando mensaje a ${telefono}:`);
    console.log(`   Contenido: "${mensaje}"`);
    
    const response = await axiosInstance.post(`/chats/${telefono}/send`, {
      mensaje
    });
    
    if (response.data.success) {
      console.log('✅ Mensaje enviado exitosamente');
      console.log('   Detalles:', response.data);
      return true;
    }
  } catch (error) {
    console.error('❌ Error enviando mensaje:', error.response?.data || error.message);
    return false;
  }
}

async function verifyMessageInDB(telefono) {
  try {
    console.log(`\n🔍 Verificando mensajes en BD para ${telefono}...`);
    
    const response = await axiosInstance.get(`/chats/${telefono}`, {
      params: { limit: 5, offset: 0 }
    });
    
    if (response.data.success) {
      const messages = response.data.messages;
      console.log(`✅ Se encontraron ${messages.length} mensajes recientes`);
      
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        console.log('   Último mensaje:');
        console.log(`   - Tipo: ${lastMessage.Tipo}`);
        console.log(`   - Contenido: "${lastMessage.Contenido}"`);
        console.log(`   - Fecha: ${lastMessage.Fecha}`);
      }
    }
  } catch (error) {
    console.error('❌ Error verificando BD:', error.response?.data || error.message);
  }
}

async function testValidations() {
  console.log('\n🧪 Probando validaciones...');
  
  // Test 1: Mensaje vacío
  console.log('\n1️⃣ Test: Mensaje vacío');
  await testSendMessage('5214447320220', '   ');
  
  // Test 2: Teléfono inválido
  console.log('\n2️⃣ Test: Teléfono inválido');
  await testSendMessage('123', 'Hola');
}

async function runTests() {
  console.log('═══════════════════════════════════════════════');
  console.log('   TEST: Envío de mensajes desde dashboard');
  console.log('═══════════════════════════════════════════════\n');
  
  try {
    // Primero hacer login
    await login();
    
    // Test 1: Enviar mensaje de prueba
    const testPhone = '5214447320220'; // Cambia esto por un número de prueba
    const testMessage = 'Hola, este es un mensaje de prueba desde el dashboard 📱';
    
    console.log('\n━━━ Test 1: Envío de mensaje normal ━━━');
    const success = await testSendMessage(testPhone, testMessage);
    
    if (success) {
      // Esperar un momento para que se guarde
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verificar en BD
      await verifyMessageInDB(testPhone);
    }
    
    // Test 2: Validaciones
    console.log('\n━━━ Test 2: Validaciones ━━━');
    await testValidations();
    
    console.log('\n═══════════════════════════════════════════════');
    console.log('✅ Tests completados');
    console.log('═══════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('\n❌ Error ejecutando tests:', error.message);
    process.exit(1);
  }
}

// Ejecutar tests
runTests();
