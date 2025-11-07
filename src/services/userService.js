import sql from 'mssql';
import bcrypt from 'bcrypt';
import { getPool } from './dbService.js';
import logger from '../logger.js';

const SALT_ROUNDS = 10;

/**
 * Obtiene un usuario por su username
 * @param {string} username - Nombre de usuario
 * @returns {Promise<Object|null>} Usuario encontrado o null
 * @throws {Error} Si hay un error de BD
 */
export async function getUserByUsername(username) {
  const pool = await getPool();
  const result = await pool.request()
    .input('username', sql.NVarChar, username)
    .query('SELECT * FROM Usuarios WHERE Username = @username AND Activo = 1');
  
  const user = result.recordset[0] || null;
  logger.debug('Usuario consultado: %s - %s', username, user ? 'Encontrado' : 'No encontrado');
  return user;
}

/**
 * Obtiene un usuario por su ID
 * @param {number} userId - ID del usuario
 * @returns {Promise<Object|null>} Usuario encontrado o null
 * @throws {Error} Si hay un error de BD
 */
export async function getUserById(userId) {
  const pool = await getPool();
  const result = await pool.request()
    .input('userId', sql.Int, userId)
    .query('SELECT * FROM Usuarios WHERE UsuarioID = @userId');
  
  return result.recordset[0] || null;
}

/**
 * Obtiene todos los usuarios activos
 * @returns {Promise<Array>} Lista de usuarios (sin passwords)
 * @throws {Error} Si hay un error de BD
 */
export async function getAllUsers() {
  const pool = await getPool();
  const result = await pool.request()
    .query(`SELECT UsuarioID, Username, Rol, Nombre, Email, NumeroWhatsApp, Activo, 
            FechaCreacion, UltimoAcceso 
            FROM Usuarios 
            ORDER BY FechaCreacion DESC`);
  
  logger.debug('Usuarios consultados: %d encontrados', result.recordset.length);
  return result.recordset;
}

/**
 * Actualiza la fecha de último acceso
 * @param {number} userId - ID del usuario
 */
export async function updateLastAccess(userId) {
  const pool = await getPool();
  await pool.request()
    .input('userId', sql.Int, userId)
    .query('UPDATE Usuarios SET UltimoAcceso = SYSDATETIME() WHERE UsuarioID = @userId');
}

/**
 * Autentica un usuario con username y password
 * @param {string} username - Nombre de usuario
 * @param {string} password - Contraseña en texto plano
 * @returns {Promise<Object|null>} Usuario autenticado (sin password) o null
 * @throws {Error} Si hay un error de BD
 */
export async function authenticateUser(username, password) {
  const user = await getUserByUsername(username);
  
  if (!user) {
    logger.warn('🚫 Intento de login con usuario inexistente: %s', username);
    return null;
  }

  const isValid = await bcrypt.compare(password, user.PasswordHash);
  
  if (!isValid) {
    logger.warn('🚫 Contraseña incorrecta para usuario: %s', username);
    return null;
  }

  // Actualizar último acceso
  try {
    await updateLastAccess(user.UsuarioID);
  } catch (err) {
    logger.warn('⚠️ No se pudo actualizar último acceso: %s', err.message);
    // No fallar la autenticación por esto
  }

  logger.info('✅ Usuario autenticado: %s (Rol: %s)', username, user.Rol);
  
  // Retornar usuario sin password
  const { PasswordHash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Crea un nuevo usuario
 * @param {Object} userData - Datos del usuario
 * @param {string} userData.username - Nombre de usuario
 * @param {string} userData.password - Contraseña en texto plano
 * @param {string} userData.rol - Rol del usuario (admin, editor, viewer)
 * @param {string} [userData.nombre] - Nombre completo
 * @param {string} [userData.email] - Email
 * @param {string} [userData.creadoPor] - Usuario que lo crea
 * @returns {Promise<number>} ID del usuario creado
 * @throws {Error} Si hay un error de BD o el username ya existe
 */
export async function createUser({ username, password, rol, nombre, email, creadoPor }) {
  // Validar rol
  const rolesValidos = ['admin', 'supervisor', 'editor', 'viewer'];
  if (!rolesValidos.includes(rol)) {
    throw new Error(`Rol inválido: ${rol}. Debe ser: ${rolesValidos.join(', ')}`);
  }

  // Hashear contraseña
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const pool = await getPool();
  const result = await pool.request()
    .input('username', sql.NVarChar, username)
    .input('passwordHash', sql.NVarChar, passwordHash)
    .input('rol', sql.NVarChar, rol)
    .input('nombre', sql.NVarChar, nombre || null)
    .input('email', sql.NVarChar, email || null)
    .input('creadoPor', sql.NVarChar, creadoPor || null)
    .query(`INSERT INTO Usuarios (Username, PasswordHash, Rol, Nombre, Email, CreadoPor)
            OUTPUT INSERTED.UsuarioID
            VALUES (@username, @passwordHash, @rol, @nombre, @email, @creadoPor)`);

  const userId = result.recordset[0].UsuarioID;
  logger.info('✅ Usuario creado: %s (ID: %d, Rol: %s)', username, userId, rol);
  return userId;
}

/**
 * Actualiza la contraseña de un usuario
 * @param {number} userId - ID del usuario
 * @param {string} newPassword - Nueva contraseña en texto plano
 * @returns {Promise<void>}
 * @throws {Error} Si hay un error de BD
 */
export async function updatePassword(userId, newPassword) {
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  const pool = await getPool();
  const result = await pool.request()
    .input('userId', sql.Int, userId)
    .input('passwordHash', sql.NVarChar, passwordHash)
    .query('UPDATE Usuarios SET PasswordHash = @passwordHash WHERE UsuarioID = @userId');

  logger.info('✅ Contraseña actualizada para usuario ID: %d', userId);
  return result.rowsAffected[0];
}

/**
 * Desactiva un usuario (soft delete)
 * @param {number} userId - ID del usuario
 * @returns {Promise<number>} Número de filas afectadas
 * @throws {Error} Si hay un error de BD
 */
export async function deactivateUser(userId) {
  const pool = await getPool();
  const result = await pool.request()
    .input('userId', sql.Int, userId)
    .query('UPDATE Usuarios SET Activo = 0 WHERE UsuarioID = @userId');

  logger.info('⚠️ Usuario desactivado ID: %d', userId);
  return result.rowsAffected[0];
}

/**
 * Actualiza información de un usuario (nombre, email, numeroWhatsApp)
 * @param {number} userId - ID del usuario
 * @param {Object} info - Información a actualizar
 * @param {string} [info.nombre] - Nombre del usuario
 * @param {string} [info.email] - Email del usuario
 * @param {string} [info.numeroWhatsApp] - Número de WhatsApp
 * @returns {Promise<number>} Número de filas afectadas
 * @throws {Error} Si hay un error de BD
 */
export async function updateUserInfo(userId, info) {
  const pool = await getPool();
  
  const result = await pool.request()
    .input('userId', sql.Int, userId)
    .input('nombre', sql.NVarChar, info.nombre)
    .input('email', sql.NVarChar, info.email)
    .input('numeroWhatsApp', sql.NVarChar, info.numeroWhatsApp)
    .query(`
      UPDATE Usuarios 
      SET Nombre = @nombre,
          Email = @email,
          NumeroWhatsApp = @numeroWhatsApp
      WHERE UsuarioID = @userId
    `);

  logger.info('✅ Información actualizada para usuario ID: %d', userId);
  return result.rowsAffected[0];
}

/**
 * Registra un intento de acceso
 * @param {number} userId - ID del usuario
 * @param {string} ip - Dirección IP
 * @param {boolean} exitoso - Si el acceso fue exitoso
 * @param {string} [detalles] - Detalles adicionales
 * @returns {Promise<void>}
 */
export async function logAccess(userId, ip, exitoso, detalles = null) {
  try {
    const pool = await getPool();
    await pool.request()
      .input('userId', sql.Int, userId)
      .input('ip', sql.NVarChar, ip)
      .input('exitoso', sql.Bit, exitoso)
      .input('detalles', sql.NVarChar, detalles)
      .query(`INSERT INTO LogAccesos (UsuarioID, IP, Exitoso, Detalles)
              VALUES (@userId, @ip, @exitoso, @detalles)`);
  } catch (err) {
    // No fallar si no se puede loguear el acceso
    logger.warn('⚠️ No se pudo registrar acceso: %s', err.message);
  }
}

/**
 * Genera un hash de contraseña (útil para scripts)
 * @param {string} password - Contraseña en texto plano
 * @returns {Promise<string>} Hash de la contraseña
 */
export async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}
