import debug from 'debug';
const log = debug('carnibot:print');
import escpos from 'escpos';
// require network/usb adapters as needed in runtime

function openDevice(device) {
    return new Promise((resolve, reject) => {
        device.open(err => {
        if (err) return reject(err);
        resolve();
        });
    });
}
  
export async function printTicket(data, host = '192.168.0.100', port = 9100) {
    const device = new Network(host, port);
    const printer = new escpos.Printer(device);
  
    try {
        await openDevice(device);
  
        printer
            .align('ct')
            .style('b')
            .size(1, 1)
            .text('Carnicería - Ticket')
            .drawLine()
            .align('lt')
            .text(`Pedido: ${data.pedidoId}`)
            .text(`Cliente: ${data.cliente}`)
            .text(`Fecha: ${new Date().toLocaleString()}`)
            .drawLine();
  
        data.items.forEach(item => {
            printer.text(`${item.cantidad} x ${item.producto}`);
        });
  
        printer.drawLine();
        printer.text(`Total: $${data.total}`);
        printer.cut();
    } catch (err) {
        console.error('❌ Error al imprimir:', err.message);
        throw err;
    }
}