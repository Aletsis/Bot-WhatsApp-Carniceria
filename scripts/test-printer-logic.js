/**
 * Test directo de la lógica de PRINTER_ENABLED
 */
import * as configService from '../src/services/configService.js';

try {
  console.log('🧪 Testing nueva lógica PRINTER_ENABLED...\n');

  const allConfigs = await configService.getAllConfigs();
  const printerConfigs = allConfigs.PRINTER || [];
  console.log('📦 Configuraciones PRINTER encontradas:', printerConfigs.length);
  
  printerConfigs.forEach(config => {
    console.log(`   - ${config.Clave}: ${config.Valor} (${config.Tipo})`);
  });

  const printerEnabledConfig = printerConfigs.find(config => config.Clave === 'PRINTER_ENABLED');
  console.log('\n🔍 Configuración PRINTER_ENABLED:');
  console.log('   Object:', printerEnabledConfig);
  
  const isPrintingEnabled = printerEnabledConfig?.Valor === 'true';
  console.log('   Resultado:', isPrintingEnabled);
  
  if (isPrintingEnabled) {
    console.log('✅ Impresión HABILITADA - Reimpresión debería funcionar');
  } else {
    console.log('❌ Impresión DESHABILITADA - Se mostrará error');
  }

} catch (error) {
  console.error('❌ Error:', error.message);
}