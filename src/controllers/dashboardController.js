import { getPool } from '../services/dbService.js';
import * as userService from '../services/userService.js';
import logger from '../logger.js';
import { getActiveTimeouts } from '../services/sessionTimeoutService.js';

/**
 * Verifica si el usuario está autenticado
 */
export async function checkAuth(req, res) {
  try {
    if (req.session && req.session.user) {
      return res.json({ 
        success: true, 
        user: {
          username: req.session.user.username,
          nombre: req.session.user.nombre,
          rol: req.session.user.rol,
        }
      });
    }
    return res.status(401).json({ success: false, message: 'No autenticado' });
  } catch (err) {
    logger.error('Error verificando autenticación:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function getStats(req, res) {
  try {
    const pool = await getPool();
    
    // Estadísticas principales
    const stats = {
      totalClientes: await pool.request()
        .query('SELECT COUNT(*) as total FROM Clientes WHERE Activo = 1')
        .then(r => r.recordset[0].total),
      
      pedidosHoy: await pool.request()
        .query(`SELECT COUNT(*) as total FROM Pedidos 
                WHERE CAST(Fecha AS DATE) = CAST(SYSDATETIME() AS DATE)`)
        .then(r => r.recordset[0].total),
      
      pedidosPendientes: await pool.request()
        .query(`SELECT COUNT(*) as total FROM Pedidos 
                WHERE Estado = 'En espera de surtir'`)
        .then(r => r.recordset[0].total),
      
      sesionesActivas: await pool.request()
        .query(`SELECT COUNT(*) as total FROM Conversaciones 
                WHERE DATEDIFF(MINUTE, UltimaInteraccion, SYSDATETIME()) <= 30`)
        .then(r => r.recordset[0].total),
      
      timeoutsActivos: getActiveTimeouts().active
    };
    
    res.json({ success: true, data: stats });
  } catch (err) {
    logger.error('Error obteniendo estadísticas:', err.message, err.stack);
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function getPedidosRecientes(req, res) {
  try {
    logger.info('📋 Solicitando pedidos recientes...');
    const pool = await getPool();
    const limit = parseInt(req.query.limit) || 20;
    
    logger.info('Pool obtenido, ejecutando query con limit:', limit);
    
    const result = await pool.request()
      .query(`
        SELECT TOP (${limit})
          p.PedidoID,
          p.Folio,
          p.Estado,
          p.Fecha,
          p.Contenido,
          p.Notas,
          c.Nombre as NombreCliente,
          c.NumeroTelefono,
          c.Direccion as DireccionCliente
        FROM Pedidos p
        INNER JOIN Clientes c ON p.ClienteID = c.ClienteID
        ORDER BY p.Fecha DESC
      `);
    
    logger.info('Query ejecutado, pedidos encontrados:', result.recordset.length);
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    logger.error('❌ Error obteniendo pedidos:', err.message);
    logger.error('Stack trace:', err.stack);
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function updateEstadoPedido(req, res) {
  try {
    const { pedidoId } = req.params;
    const { estado, notas } = req.body;
    
    const validStates = [
      'En espera de surtir', 
      'En preparación', 
      'Listo para entrega', 
      'Entregado', 
      'Cancelado'
    ];
    
    if (!validStates.includes(estado)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Estado no válido' 
      });
    }
    
    const pool = await getPool();
    await pool.request()
      .input('pedidoId', pedidoId)
      .input('estado', estado)
      .input('notas', notas || null)
      .query(`UPDATE Pedidos 
              SET Estado = @estado, Notas = @notas 
              WHERE PedidoID = @pedidoId`);
    
    logger.info('Estado actualizado: Pedido %s → %s', pedidoId, estado);
    res.json({ success: true });
  } catch (err) {
    logger.error('Error actualizando estado:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function getClientes(req, res) {
  try {
    const pool = await getPool();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    
    const result = await pool.request()
      .input('limit', limit)
      .input('offset', offset)
      .query(`
        SELECT 
          c.ClienteID, c.NumeroTelefono, c.Nombre, c.Direccion, c.FechaAlta,
          (SELECT COUNT(*) FROM Pedidos WHERE ClienteID = c.ClienteID) as TotalPedidos
        FROM Clientes c
        WHERE c.Activo = 1
        ORDER BY c.FechaAlta DESC
        OFFSET @offset ROWS
        FETCH NEXT @limit ROWS ONLY
      `);
    
    res.json({ success: true, data: result.recordset, page, limit });
  } catch (err) {
    logger.error('Error obteniendo clientes:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function getSesionesActivas(req, res) {
  try {
    const pool = await getPool();
    
    const result = await pool.request()
      .query(`
        SELECT 
          NumeroTelefono, 
          Estado, 
          UltimaInteraccion,
          DATEDIFF(MINUTE, UltimaInteraccion, SYSDATETIME()) as MinutosInactivo
        FROM Conversaciones
        WHERE DATEDIFF(MINUTE, UltimaInteraccion, SYSDATETIME()) <= 30
        ORDER BY UltimaInteraccion DESC
      `);
    
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    logger.error('Error obteniendo sesiones:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

// ============= GESTIÓN DE CLIENTES =============

/**
 * Crear un nuevo cliente
 */
export async function createCliente(req, res) {
  try {
    const { nombre, telefono, direccion } = req.body;
    
    // Validaciones
    if (!nombre || !telefono) {
      return res.status(400).json({ 
        success: false, 
        error: 'Nombre y teléfono son requeridos' 
      });
    }
    
    if (nombre.length < 2 || nombre.length > 200) {
      return res.status(400).json({ 
        success: false, 
        error: 'El nombre debe tener entre 2 y 200 caracteres' 
      });
    }
    
    if (!/^[0-9]{10,15}$/.test(telefono)) {
      return res.status(400).json({ 
        success: false, 
        error: 'El teléfono debe tener entre 10 y 15 dígitos' 
      });
    }
    
    const pool = await getPool();
    
    // Verificar si ya existe
    const existing = await pool.request()
      .input('telefono', telefono)
      .query('SELECT ClienteID FROM Clientes WHERE NumeroTelefono = @telefono');
    
    if (existing.recordset.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Ya existe un cliente con ese teléfono' 
      });
    }
    
    // Crear cliente
    await pool.request()
      .input('telefono', telefono)
      .input('nombre', nombre)
      .input('direccion', direccion || null)
      .query(`
        INSERT INTO Clientes (NumeroTelefono, Nombre, Direccion) 
        VALUES (@telefono, @nombre, @direccion)
      `);
    
    logger.info('✅ Cliente creado: %s - %s', telefono, nombre);
    res.json({ success: true, message: 'Cliente creado exitosamente' });
  } catch (err) {
    logger.error('Error creando cliente:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Actualizar un cliente existente
 */
export async function updateCliente(req, res) {
  try {
    const { clienteId } = req.params;
    const { nombre, direccion } = req.body;
    
    if (!nombre) {
      return res.status(400).json({ 
        success: false, 
        error: 'El nombre es requerido' 
      });
    }
    
    if (nombre.length < 2 || nombre.length > 200) {
      return res.status(400).json({ 
        success: false, 
        error: 'El nombre debe tener entre 2 y 200 caracteres' 
      });
    }
    
    const pool = await getPool();
    
    await pool.request()
      .input('clienteId', clienteId)
      .input('nombre', nombre)
      .input('direccion', direccion || null)
      .query(`
        UPDATE Clientes 
        SET Nombre = @nombre, Direccion = @direccion 
        WHERE ClienteID = @clienteId
      `);
    
    logger.info('✅ Cliente actualizado: ID %s', clienteId);
    res.json({ success: true, message: 'Cliente actualizado exitosamente' });
  } catch (err) {
    logger.error('Error actualizando cliente:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Obtener pedidos de un cliente específico
 */
export async function getPedidosCliente(req, res) {
  try {
    const { clienteId } = req.params;
    
    const pool = await getPool();
    
    const result = await pool.request()
      .input('clienteId', clienteId)
      .query(`
        SELECT 
          PedidoID, Folio, Estado, Fecha, Contenido
        FROM Pedidos
        WHERE ClienteID = @clienteId
        ORDER BY Fecha DESC
      `);
    
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    logger.error('Error obteniendo pedidos del cliente:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Actualizar estado de pedido (nuevo formato)
 */
export async function updateEstadoPedidoNuevo(req, res) {
  try {
    const { pedidoId } = req.params;
    const { estado } = req.body;
    
    // Mapeo de estados nuevos a estados de BD
    const estadoMap = {
      'PENDIENTE': 'En espera de surtir',
      'EN_PROCESO': 'En preparación',
      'ENTREGADO': 'Entregado',
      'CANCELADO': 'Cancelado'
    };
    
    const estadoDB = estadoMap[estado] || estado;
    
    const pool = await getPool();
    await pool.request()
      .input('pedidoId', pedidoId)
      .input('estado', estadoDB)
      .query(`UPDATE Pedidos 
              SET Estado = @estado 
              WHERE PedidoID = @pedidoId`);
    
    logger.info('✅ Estado actualizado: Pedido %s → %s (%s)', pedidoId, estadoDB, estado);
    res.json({ success: true });
  } catch (err) {
    logger.error('❌ Error actualizando estado:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

// ==================== GESTIÓN DE USUARIOS ====================

/**
 * Obtiene todos los usuarios del sistema
 */
export async function getUsuarios(req, res) {
  try {
    const usuarios = await userService.getAllUsers();
    res.json({ success: true, data: usuarios });
  } catch (err) {
    logger.error('❌ Error obteniendo usuarios:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Crea un nuevo usuario
 */
export async function createUsuario(req, res) {
  try {
    const { username, password, rol, nombre, email } = req.body;
    
    // Validar campos requeridos
    if (!username || !password || !rol) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username, password y rol son requeridos' 
      });
    }
    
    // Validar rol
    if (!['admin', 'editor', 'viewer'].includes(rol)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Rol inválido. Debe ser: admin, editor o viewer' 
      });
    }
    
    // Obtener usuario que lo crea
    const creadoPor = req.session?.user?.Username || 'DASHBOARD';
    
    const usuarioId = await userService.createUser({
      username,
      password,
      rol,
      nombre,
      email,
      creadoPor
    });
    
    logger.info('✅ Usuario creado por %s: %s (ID: %d)', creadoPor, username, usuarioId);
    res.json({ success: true, data: { usuarioId } });
  } catch (err) {
    logger.error('❌ Error creando usuario:', err.message);
    
    // Error de username duplicado
    if (err.message.includes('UNIQUE') || err.message.includes('duplicate')) {
      return res.status(400).json({ 
        success: false, 
        error: 'El username ya existe' 
      });
    }
    
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Cambia la contraseña de un usuario
 */
export async function cambiarPassword(req, res) {
  try {
    const { usuarioId } = req.params;
    const { newPassword } = req.body;
    
    if (!newPassword) {
      return res.status(400).json({ 
        success: false, 
        error: 'Nueva contraseña es requerida' 
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        error: 'La contraseña debe tener al menos 6 caracteres' 
      });
    }
    
    await userService.updatePassword(parseInt(usuarioId), newPassword);
    
    logger.info('✅ Contraseña cambiada por %s para usuario ID: %s', 
      req.session?.user?.Username, usuarioId);
    
    res.json({ success: true });
  } catch (err) {
    logger.error('❌ Error cambiando contraseña:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Activa o desactiva un usuario
 */
export async function toggleUsuario(req, res) {
  try {
    const { usuarioId } = req.params;
    const { activo } = req.body;
    
    if (activo === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'Campo "activo" es requerido' 
      });
    }
    
    const userId = parseInt(usuarioId);
    
    // No permitir desactivarse a sí mismo
    if (userId === req.session?.user?.UsuarioID) {
      return res.status(400).json({ 
        success: false, 
        error: 'No puedes desactivar tu propia cuenta' 
      });
    }
    
    if (activo) {
      await userService.activateUser(userId);
    } else {
      await userService.deactivateUser(userId);
    }
    
    logger.info('✅ Usuario %s %s por %s', 
      usuarioId, 
      activo ? 'activado' : 'desactivado',
      req.session?.user?.Username);
    
    res.json({ success: true });
  } catch (err) {
    logger.error('❌ Error toggle usuario:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
}