/**
 * Script para probar que los saltos de línea se preserven correctamente
 */
import escpos from 'escpos';
import Network from 'escpos-network';

async function testLineBreaks() {
  try {
    console.log('🧪 Testing saltos de línea en impresión...\n');

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

    // Contenido de prueba con saltos de línea
    const contenidoPrueba = `1 KG DE CARNE MOLIDA
2 BISTECES DE RES
500G DE CHORIZO

NOTA ESPECIAL:
- Sin grasa extra
- Bien limpio
- Para entregar mañana

Total aproximado: $350`;

    // Imprimir usando la nueva lógica
    printer
      .font('a')
      .align('ct')
      .style('bu')
      .size(0, 0)
      .text('CARNICERIAS LA BLANQUITA')
      .text('PRUEBA SALTOS DE LÍNEA')
      .style('normal')
      .text('')
      .text('═══════════════════════════════')
      .align('lt')
      .text('DETALLE DEL PEDIDO:')
      .text('═══════════════════════════════');

    // Procesar línea por línea como en el código actualizado
    const contenidoLineas = contenidoPrueba.split('\n');
    contenidoLineas.forEach(linea => {
      printer.text(linea.trim());
    });

    printer
      .text('')
      .text('═══════════════════════════════')
      .align('ct')
      .text('Cada línea debe aparecer separada')
      .text('')
      .feed(3)
      .cut()
      .close();

    console.log('✅ Ticket de prueba enviado');
    console.log('📝 Los saltos de línea deben preservarse correctamente');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testLineBreaks();