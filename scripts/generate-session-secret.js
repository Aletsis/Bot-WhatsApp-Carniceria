import crypto from 'crypto';

/**
 * Script para generar SESSION_SECRET seguro
 * 
 * Uso:
 *   node scripts/generate-session-secret.js
 * 
 * Genera un string aleatorio de 64 caracteres hexadecimales
 * apropiado para usar como SESSION_SECRET en el archivo .env
 */

console.log('');
console.log('🔐 Generando SESSION_SECRET seguro...');
console.log('');

const secret = crypto.randomBytes(32).toString('hex');

console.log('✅ SESSION_SECRET generado:');
console.log('');
console.log(secret);
console.log('');
console.log('📋 Copia este valor y agrégalo a tu archivo .env:');
console.log('');
console.log(`SESSION_SECRET=${secret}`);
console.log('');
console.log('⚠️  IMPORTANTE:');
console.log('   - NO compartas este valor públicamente');
console.log('   - Genera uno diferente para cada ambiente (dev/prod)');
console.log('   - Guárdalo en un lugar seguro como respaldo');
console.log('');
