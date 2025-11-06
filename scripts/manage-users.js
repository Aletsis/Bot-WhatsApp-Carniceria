// scripts/manage-users.js
import dotenv from 'dotenv';
import userService from '../src/services/userService.js';
import logger from '../src/logger.js';
import { getPool } from '../src/services/dbService.js';
import readline from 'readline';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

async function listUsers() {
  console.log('\n📋 Usuarios en el sistema:\n');
  const users = await userService.getAllUsers();
  
  if (users.length === 0) {
    console.log('No hay usuarios registrados.');
    return;
  }
  
  console.table(users.map(u => ({
    ID: u.UsuarioID,
    Usuario: u.Username,
    Nombre: u.Nombre || '-',
    Email: u.Email || '-',
    Rol: u.Rol,
    Activo: u.Activo ? '✅' : '❌',
    'Último Acceso': u.UltimoAcceso ? new Date(u.UltimoAcceso).toLocaleString() : 'Nunca'
  })));
}

async function createUser() {
  console.log('\n➕ Crear nuevo usuario\n');
  
  const username = await question('👤 Username: ');
  if (!username) {
    console.log('❌ Username es requerido');
    return;
  }
  
  const password = await question('🔒 Password: ');
  if (!password) {
    console.log('❌ Password es requerido');
    return;
  }
  
  const rol = await question('🎭 Rol (admin/editor/viewer) [viewer]: ') || 'viewer';
  if (!['admin', 'editor', 'viewer'].includes(rol)) {
    console.log('❌ Rol inválido. Debe ser: admin, editor o viewer');
    return;
  }
  
  const nombre = await question('📝 Nombre completo (opcional): ');
  const email = await question('📧 Email (opcional): ');
  
  try {
    const userId = await userService.createUser({
      username,
      password,
      rol,
      nombre: nombre || null,
      email: email || null,
      creadoPor: 'SCRIPT'
    });
    
    console.log(`\n✅ Usuario creado exitosamente con ID: ${userId}`);
  } catch (err) {
    console.error('❌ Error al crear usuario:', err.message);
  }
}

async function changePassword() {
  console.log('\n🔑 Cambiar contraseña\n');
  
  await listUsers();
  
  const userId = parseInt(await question('\n🆔 ID del usuario: '));
  if (isNaN(userId)) {
    console.log('❌ ID inválido');
    return;
  }
  
  const user = await userService.getUserById(userId);
  if (!user) {
    console.log('❌ Usuario no encontrado');
    return;
  }
  
  console.log(`\nCambiando contraseña para: ${user.Username}`);
  
  const newPassword = await question('🔒 Nueva contraseña: ');
  if (!newPassword) {
    console.log('❌ Contraseña es requerida');
    return;
  }
  
  try {
    await userService.updatePassword(userId, newPassword);
    console.log('\n✅ Contraseña actualizada exitosamente');
  } catch (err) {
    console.error('❌ Error al cambiar contraseña:', err.message);
  }
}

async function deactivateUser() {
  console.log('\n🚫 Desactivar usuario\n');
  
  await listUsers();
  
  const userId = parseInt(await question('\n🆔 ID del usuario a desactivar: '));
  if (isNaN(userId)) {
    console.log('❌ ID inválido');
    return;
  }
  
  const confirm = await question('⚠️  ¿Estás seguro? (si/no): ');
  if (confirm.toLowerCase() !== 'si' && confirm.toLowerCase() !== 'sí') {
    console.log('Operación cancelada');
    return;
  }
  
  try {
    await userService.deactivateUser(userId);
    console.log('\n✅ Usuario desactivado exitosamente');
  } catch (err) {
    console.error('❌ Error al desactivar usuario:', err.message);
  }
}

async function activateUser() {
  console.log('\n✅ Activar usuario\n');
  
  await listUsers();
  
  const userId = parseInt(await question('\n🆔 ID del usuario a activar: '));
  if (isNaN(userId)) {
    console.log('❌ ID inválido');
    return;
  }
  
  try {
    await userService.activateUser(userId);
    console.log('\n✅ Usuario activado exitosamente');
  } catch (err) {
    console.error('❌ Error al activar usuario:', err.message);
  }
}

async function generatePasswordHash() {
  console.log('\n🔐 Generar hash de contraseña\n');
  
  const password = await question('🔒 Contraseña: ');
  if (!password) {
    console.log('❌ Contraseña es requerida');
    return;
  }
  
  try {
    const hash = await userService.hashPassword(password);
    console.log('\n✅ Hash generado:');
    console.log(hash);
    console.log('\n💡 Puedes usar este hash en scripts SQL o código.');
  } catch (err) {
    console.error('❌ Error al generar hash:', err.message);
  }
}

async function mainMenu() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  🔧 Gestión de Usuarios - Dashboard   ║');
  console.log('╚════════════════════════════════════════╝\n');
  console.log('1. 📋 Listar usuarios');
  console.log('2. ➕ Crear usuario');
  console.log('3. 🔑 Cambiar contraseña');
  console.log('4. 🚫 Desactivar usuario');
  console.log('5. ✅ Activar usuario');
  console.log('6. 🔐 Generar hash de contraseña');
  console.log('0. 🚪 Salir\n');
  
  const option = await question('Selecciona una opción: ');
  
  try {
    switch (option) {
      case '1':
        await listUsers();
        break;
      case '2':
        await createUser();
        break;
      case '3':
        await changePassword();
        break;
      case '4':
        await deactivateUser();
        break;
      case '5':
        await activateUser();
        break;
      case '6':
        await generatePasswordHash();
        break;
      case '0':
        console.log('\n👋 ¡Hasta luego!');
        rl.close();
        process.exit(0);
      default:
        console.log('❌ Opción no válida');
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
  
  // Volver al menú
  await mainMenu();
}

async function init() {
  try {
    // Verificar conexión a BD
    await getPool();
    console.log('✅ Conectado a la base de datos\n');
    
    await mainMenu();
  } catch (err) {
    console.error('❌ Error al conectar con la base de datos:', err.message);
    console.error('💡 Verifica que la base de datos esté corriendo y las variables de entorno estén configuradas.');
    rl.close();
    process.exit(1);
  }
}

init();
