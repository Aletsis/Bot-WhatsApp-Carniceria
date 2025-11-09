/**
 * Script para probar el nuevo tamaño de letra en la impresión
 */
import escpos from 'escpos';
import Network from 'escpos-network';

async function testPrintSize() {
  try {
    console.log('🧪 Testing nuevo tamaño de letra...\n');

    const host = '192.168.8.28';
    const port = 9100;

    console.log(`📋 Conectando a impresora: ${host}:${port}`);
    
    const device = new Network(host, port);
    const printer = new escpos.Printer(device);

    // Conectar con timeout
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
    console.log('✅ Conectado a impresora');

    // Imprimir ticket de prueba con diferentes tamaños
    printer
      .font('a')
      .align('ct')
      .style('bu')
      .size(0, 0)  // Tamaño reducido
      .text('CARNICERIAS LA BLANQUITA')
      .text('PRUEBA DE TAMAÑO')
      .style('normal')
      .text('')
      .text('═══════════════════════════════')
      .align('lt')
      .text('Tamaño: Normal (0,0)')
      .text('Fecha: ' + new Date().toLocaleString())
      .text('')
      .text('Contenido del pedido:')
      .text('- 1 kg Carne molida')
      .text('- 500g Bistec')
      .text('- 2 kg Costilla')
      .text('')
      .align('ct')
      .text('═══════════════════════════════')
      .text('Gracias por su preferencia')
      .text('')
      .feed(3)
      .cut()
      .close();

    console.log('✅ Ticket de prueba enviado');
    console.log('📝 El ticket debe imprimirse con letra más pequeña');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testPrintSize();