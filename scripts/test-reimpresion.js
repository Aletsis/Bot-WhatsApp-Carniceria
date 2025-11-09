/**
 * Script para probar la API de reimpresión directamente
 */

async function testReimpresion() {
  try {
    console.log('🧪 Testing API de reimpresión...\n');

    // Hacer una petición HTTP directa al endpoint de reimpresión
    // Necesitamos un ID de pedido válido
    const pedidoId = 1; // Cambiar por un ID válido

    const response = await fetch(`http://localhost:3000/api/dashboard/pedidos/${pedidoId}/reimprimir`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const result = await response.json();
    
    console.log('📋 Respuesta del servidor:');
    console.log('──────────────────────────────────────────────────');
    console.log('Status:', response.status);
    console.log('Success:', result.success);
    console.log('Message/Error:', result.message || result.error);
    
    if (result.success) {
      console.log('✅ Reimpresión exitosa!');
    } else {
      console.log('❌ Error en reimpresión:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Error haciendo petición:', error.message);
  }
}

testReimpresion();