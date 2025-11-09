/**
 * Script de prueba para verificar que la librería escpos funcione correctamente
 */
import escpos from 'escpos';
import Network from 'escpos-network';

async function testPrinterConnection() {
  try {
    console.log('🧪 Testing conexión de impresora...\n');

    // Configuración de prueba
    const host = '192.168.8.28';
    const port = 9100;

    console.log(`📋 Intentando conectar a: ${host}:${port}`);
    console.log('──────────────────────────────────────────────────');

    // Crear dispositivo de red
    const device = new Network(host, port);
    const printer = new escpos.Printer(device);

    console.log('✅ Network device creado correctamente');
    console.log('✅ Printer instance creada correctamente');
    
    // Intentar conexión (con timeout)
    const connectPromise = new Promise((resolve, reject) => {
      device.open(function(error) {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout de conexión')), 5000);
    });

    await Promise.race([connectPromise, timeoutPromise]);
    console.log('✅ Conexión establecida exitosamente');

    // Imprimir prueba simple
    printer
      .font('a')
      .align('ct')
      .style('bu')
      .size(1, 1)
      .text('PRUEBA DE IMPRESIÓN')
      .text('─────────────────────')
      .text('Servidor: Bot WhatsApp')
      .text('Fecha: ' + new Date().toLocaleString())
      .feed(3)
      .cut()
      .close();

    console.log('✅ Comando de impresión enviado');
    console.log('\n🎉 ¡Prueba exitosa! La impresora debería imprimir un ticket de prueba.');

  } catch (error) {
    console.error('❌ Error en prueba de impresión:', error.message);
    console.error('   Stack:', error.stack);
  }
}

testPrinterConnection();