import dotenv from 'dotenv';
import { getPool } from './src/services/dbService.js';

// Cargar variables de entorno
dotenv.config();

async function checkAdminWhatsApp() {
  try {
    const pool = await getPool();
    
    // Verificar usuarios admin con WhatsApp
    const result = await pool.request().query(`
      SELECT 
        UsuarioID,
        Username,
        NumeroWhatsApp,
        Rol,
        Activo
      FROM Usuarios
      WHERE Rol = 'admin' AND Activo = 1
      ORDER BY UsuarioID
    `);
    
    console.log('👥 Usuarios admin encontrados:');
    result.recordset.forEach(admin => {
      console.log(`  - ${admin.Username} (ID: ${admin.UsuarioID})`);
      console.log(`    WhatsApp: ${admin.NumeroWhatsApp || 'NO CONFIGURADO'}`);
      console.log(`    Rol: ${admin.Rol}, Activo: ${admin.Activo}`);
      console.log('');
    });
    
    const adminsConWhatsApp = result.recordset.filter(admin => 
      admin.NumeroWhatsApp && admin.NumeroWhatsApp.trim().length > 0
    );
    
    console.log(`📊 Total admins: ${result.recordset.length}`);
    console.log(`📱 Admins con WhatsApp: ${adminsConWhatsApp.length}`);
    
    if (adminsConWhatsApp.length === 0) {
      console.log('❌ PROBLEMA: No hay admins con número de WhatsApp configurado');
    } else {
      console.log('✅ Hay admins con WhatsApp configurado');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  }
}

checkAdminWhatsApp();