/**
 * Test simple de importaciones
 */

try {
  console.log('🧪 Testing importaciones...');
  
  console.log('1. Importando escpos...');
  const escpos = await import('escpos');
  console.log('✅ escpos importado:', typeof escpos.default);
  
  console.log('2. Importando escpos-network...');
  const Network = await import('escpos-network');
  console.log('✅ escpos-network importado:', typeof Network.default);
  
  console.log('3. Creando instancia Network...');
  const device = new Network.default('192.168.8.28', 9100);
  console.log('✅ Network instance creada:', typeof device);
  
  console.log('4. Creando Printer...');
  const printer = new escpos.default.Printer(device);
  console.log('✅ Printer instance creada:', typeof printer);
  
  console.log('\n🎉 ¡Todas las importaciones funcionan correctamente!');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}