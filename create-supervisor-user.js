import dotenv from 'dotenv';
import { getPool } from './src/services/dbService.js';
import * as userService from './src/services/userService.js';

// Cargar variables de entorno
dotenv.config();

async function createSupervisorUser() {
  try {
    console.log('👤 Creando usuario supervisor de prueba...');
    
    const pool = await getPool();
    console.log('✅ Pool de BD obtenido correctamente');
    
    // Verificar si ya existe usuario supervisor
    const existingQuery = await pool.request().query(`
      SELECT UsuarioID, Username, Rol, Activo
      FROM Usuarios
      WHERE Username = 'supervisor' OR Rol = 'supervisor'
    `);
    
    if (existingQuery.recordset.length > 0) {
      console.log('\n⚠️  Ya existen usuarios supervisor:');
      existingQuery.recordset.forEach(user => {
        console.log(`   - ${user.Username} (ID: ${user.UsuarioID}, Rol: ${user.Rol}, Activo: ${user.Activo})`);
      });
      
      // Preguntar si queremos actualizar el usuario existente
      const supervisorUser = existingQuery.recordset.find(u => u.Username === 'supervisor');
      if (supervisorUser && !supervisorUser.NumeroWhatsApp) {
        console.log('\n🔧 Actualizando usuario supervisor existente con WhatsApp...');
        
        await pool.request()
          .input('usuarioID', supervisorUser.UsuarioID)
          .input('whatsapp', '+5214447320221') // Número diferente al admin
          .query(`
            UPDATE Usuarios
            SET NumeroWhatsApp = @whatsapp,
                Activo = 1
            WHERE UsuarioID = @usuarioID
          `);
        
        console.log('✅ Usuario supervisor actualizado con WhatsApp: +5214447320221');
      }
    } else {
      // Crear nuevo usuario supervisor
      console.log('\n👤 Creando nuevo usuario supervisor...');
      
      const supervisorData = {
        username: 'supervisor',
        password: 'supervisor123', // En producción usar contraseña segura
        rol: 'supervisor',
        nombre: 'Usuario Supervisor',
        email: 'supervisor@carniceria.com',
        creadoPor: 1 // ID del admin
      };
      
      const supervisorId = await userService.createUser(supervisorData);
      console.log('✅ Usuario supervisor creado con ID:', supervisorId);
      
      // Agregar número de WhatsApp
      await pool.request()
        .input('usuarioID', supervisorId)
        .input('whatsapp', '+5214447320221')
        .query(`
          UPDATE Usuarios
          SET NumeroWhatsApp = @whatsapp
          WHERE UsuarioID = @usuarioID
        `);
      
      console.log('✅ Número de WhatsApp agregado: +5214447320221');
    }
    
    // Verificar estado final
    console.log('\n📊 Estado final de usuarios:');
    const finalQuery = await pool.request().query(`
      SELECT 
        UsuarioID,
        Username,
        Rol,
        Nombre,
        Email,
        NumeroWhatsApp,
        Activo,
        FechaCreacion
      FROM Usuarios
      WHERE Rol IN ('admin', 'supervisor')
      ORDER BY Rol, Username
    `);
    
    finalQuery.recordset.forEach(user => {
      console.log(`\n   🔰 ${user.Rol.toUpperCase()}: ${user.Username}`);
      console.log(`     - Nombre: ${user.Nombre}`);
      console.log(`     - Email: ${user.Email || 'N/A'}`);
      console.log(`     - WhatsApp: ${user.NumeroWhatsApp || 'NO CONFIGURADO'}`);
      console.log(`     - Activo: ${user.Activo ? '✅' : '❌'}`);
      console.log(`     - Creado: ${user.FechaCreacion}`);
    });
    
    // Resumen de notificaciones
    console.log('\n📢 Configuración de notificaciones:');
    console.log('   🔴 NOTIFICACIONES DE SISTEMA (Solo Admin):');
    console.log('      - PRINTING_ERROR, WHATSAPP_API_ERROR, DATABASE_ERROR, etc.');
    console.log('   🟡 NOTIFICACIONES OPERATIVAS (Admin + Supervisor):');
    console.log('      - ORDER_NOT_PRINTED, PRINTING_DELAYED');
    
    const adminCount = finalQuery.recordset.filter(u => u.Rol === 'admin' && u.NumeroWhatsApp).length;
    const supervisorCount = finalQuery.recordset.filter(u => u.Rol === 'supervisor' && u.NumeroWhatsApp).length;
    
    console.log(`\n📱 Destinatarios configurados:`);
    console.log(`   - Admins con WhatsApp: ${adminCount}`);
    console.log(`   - Supervisores con WhatsApp: ${supervisorCount}`);
    console.log(`   - Total para notificaciones operativas: ${adminCount + supervisorCount}`);
    
    process.exit(0);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  }
}

createSupervisorUser();