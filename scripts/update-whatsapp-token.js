/**
 * Script para actualizar el token de WhatsApp en la base de datos
 * 
 * Uso: node scripts/update-whatsapp-token.js
 */

import sql from 'mssql';
import 'dotenv/config';
import readline from 'readline';

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function updateWhatsAppToken() {
  let pool;
  
  try {
    console.log('🔧 Script de Actualización de Token de WhatsApp');
    console.log('================================================\n');
    
    console.log('Para obtener un nuevo token:');
    console.log('1. Ve a https://developers.facebook.com/apps');
    console.log('2. Selecciona tu app de WhatsApp');
    console.log('3. Ve a WhatsApp > API Setup');
    console.log('4. Copia el "Temporary access token" (24h) o genera un token permanente\n');
    
    const nuevoToken = await question('Ingresa el nuevo token de WhatsApp: ');
    
    if (!nuevoToken || nuevoToken.trim() === '') {
      console.log('❌ Token vacío. Operación cancelada.');
      rl.close();
      return;
    }
    
    console.log('\n🔌 Conectando a la base de datos...');
    pool = await sql.connect(config);
    console.log('✅ Conectado\n');
    
    // Verificar si la configuración existe
    const checkResult = await pool.request()
      .input('clave', sql.NVarChar, 'WHATSAPP_TOKEN')
      .query('SELECT * FROM Configuraciones WHERE Clave = @clave');
    
    if (checkResult.recordset.length === 0) {
      console.log('❌ No se encontró la configuración WHATSAPP_TOKEN en la base de datos');
      console.log('   Asegúrate de haber ejecutado la migración 10_configuraciones.sql');
      rl.close();
      return;
    }
    
    // Actualizar el token
    const updateResult = await pool.request()
      .input('clave', sql.NVarChar, 'WHATSAPP_TOKEN')
      .input('valor', sql.NVarChar, nuevoToken.trim())
      .input('fecha', sql.DateTime, new Date())
      .query(`
        UPDATE Configuraciones
        SET Valor = @valor, FechaActualizacion = @fecha
        WHERE Clave = @clave
      `);
    
    if (updateResult.rowsAffected[0] > 0) {
      console.log('✅ Token actualizado exitosamente en la base de datos');
      console.log(`   Últimos 4 caracteres: ...${nuevoToken.slice(-4)}`);
      console.log('\n📝 Nota: El servidor recargará la configuración en máximo 1 minuto');
      console.log('   O reinicia el servidor para aplicar inmediatamente');
    } else {
      console.log('❌ No se pudo actualizar el token');
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    if (pool) {
      await pool.close();
    }
    rl.close();
  }
}

// Ejecutar
updateWhatsAppToken();
