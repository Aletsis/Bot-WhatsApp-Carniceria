import sql from 'mssql';
import { getPool } from '../services/dbService.js';
import * as userService from '../services/userService.js';
import logger from '../logger.js';
import { getActiveTimeouts } from '../services/sessionTimeoutService.js';
import { printTicket, isPrintingEnabled } from '../services/printingService.js';
import { updatePedidoEstadoWithVersion } from '../services/transactionService.js';
import whatsappService from '../services/whatsappService.js';

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
    const estado = req.query.estado || '';
    const fechaInicio = req.query.fechaInicio || '';
    const fechaFin = req.query.fechaFin || '';
    
    // Validar que limit sea un número positivo razonable
    const validLimit = Math.min(Math.max(1, limit), 1000); // Entre 1 y 1000
    
    logger.info('Pool obtenido, ejecutando query con limit:', validLimit, 'estado:', estado, 'fechaInicio:', fechaInicio, 'fechaFin:', fechaFin);
    
    // Crear request primero para usar parámetros
    const request = pool.request();
    request.input('limit', sql.Int, validLimit);
    
    // Construir la query usando parámetro para TOP
    let query = `
      SELECT TOP (@limit)
        p.PedidoID,
        p.Folio,
        p.Estado,
        p.Fecha,
        p.Contenido,
        p.Notas,
        p.EstadoImpresion,
        p.FechaImpresion,
        p.ErrorImpresion,
        c.Nombre as NombreCliente,
        c.NumeroTelefono,
        c.Direccion as DireccionCliente
      FROM Pedidos p
      INNER JOIN Clientes c ON p.ClienteID = c.ClienteID
    `;
    
    // Construir condiciones WHERE
    const conditions = [];
    if (estado) {
      conditions.push('p.Estado = @estado');
      request.input('estado', sql.NVarChar, estado);
    }
    if (fechaInicio) {
      conditions.push('p.Fecha >= @fechaInicio');
      request.input('fechaInicio', sql.DateTime2, fechaInicio);
    }
    if (fechaFin) {
      // Agregar un día a la fecha fin para incluir todo el día
      conditions.push('p.Fecha < DATEADD(day, 1, @fechaFin)');
      request.input('fechaFin', sql.DateTime2, fechaFin);
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ` ORDER BY p.Fecha DESC`;
    
    const result = await request.query(query);
    
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
    const { estado, nuevoEstado, notas } = req.body;
    
    // Aceptar tanto 'estado' como 'nuevoEstado' para compatibilidad
    const estadoFinal = estado || nuevoEstado;
    
    if (!estadoFinal) {
      return res.status(400).json({ 
        success: false, 
        error: 'Estado es requerido' 
      });
    }
    
    const validStates = [
      'En espera de surtir', 
      'En ruta',
      'Entregado', 
      'Cancelado'
    ];
    
    if (!validStates.includes(estadoFinal)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Estado no válido. Estados permitidos: ' + validStates.join(', ')
      });
    }
    
    // 🔄 RETRY LOOP con optimistic locking (máximo 3 intentos)
    const MAX_RETRIES = 3;
    let attempt = 0;
    
    while (attempt < MAX_RETRIES) {
      attempt++;
      
      // Obtener pedido actual CON VERSION y datos del cliente
      const pool = await getPool();
      const pedidoResult = await pool.request()
        .input('pedidoId', sql.Int, parseInt(pedidoId))
        .query(`
          SELECT p.PedidoID, p.Estado, p.Version, p.ClienteID,
                 c.NumeroTelefono, c.Nombre
          FROM Pedidos p
          INNER JOIN Clientes c ON p.ClienteID = c.ClienteID
          WHERE p.PedidoID = @pedidoId
        `);
      
      if (pedidoResult.recordset.length === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'Pedido no encontrado' 
        });
      }
      
      const pedido = pedidoResult.recordset[0];
      const currentVersion = pedido.Version || 0;
      
      // 🔐 ACTUALIZACIÓN CON OPTIMISTIC LOCKING
      const success = await updatePedidoEstadoWithVersion(
        parseInt(pedidoId), 
        estadoFinal, 
        currentVersion,
        notas
      );
      
      if (success) {
        logger.info('✅ Estado actualizado (intento %d/%d): Pedido %s → %s', attempt, MAX_RETRIES, pedidoId, estadoFinal);
        
        // 📱 NOTIFICACIÓN AUTOMÁTICA AL CLIENTE
        // Ejecutar en background para no bloquear la respuesta
        whatsappService.notifyCustomerOrderStatus(
          pedido.NumeroTelefono,
          parseInt(pedidoId),
          estadoFinal,
          pedido.Nombre
        ).catch(err => {
          // Error ya loggeado en whatsappService, solo registrar que falló
          logger.warn('⚠️ Notificación no enviada para pedido %s (no crítico)', pedidoId);
        });
        
        return res.json({ success: true, message: 'Estado actualizado correctamente' });
      } else {
        // Conflicto de versión - otro proceso modificó el pedido
        logger.warn('⚠️ Conflicto de versión en intento %d/%d para pedido: %s (esperado v%d)', 
                   attempt, MAX_RETRIES, pedidoId, currentVersion);
        
        if (attempt >= MAX_RETRIES) {
          logger.error('🚨 FALLO después de %d intentos - conflicto de concurrencia: pedido %s', MAX_RETRIES, pedidoId);
          return res.status(409).json({ 
            success: false, 
            error: `Conflicto de concurrencia. El pedido fue modificado por otro usuario. Por favor, recargue e intente de nuevo.` 
          });
        }
        
        // Esperar un poco antes de reintentar (backoff exponencial)
        const delay = Math.pow(2, attempt - 1) * 100; // 100ms, 200ms, 400ms
        await new Promise(resolve => setTimeout(resolve, delay));
        // Continuar al siguiente intento del loop
      }
    }
    
    // No debería llegar aquí, pero por seguridad
    return res.status(500).json({ 
      success: false, 
      error: `Fallo al actualizar pedido después de ${MAX_RETRIES} intentos` 
    });
  } catch (err) {
    logger.error('❌ Error actualizando estado del pedido %s:', req.params.pedidoId, err.message);
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
 * Actualizar estado de pedido (ruta /pedidos/:pedidoId/estado)
 * Esta función maneja el endpoint que usa el frontend
 */
export async function updateEstadoPedidoNuevo(req, res) {
  try {
    const { pedidoId } = req.params;
    const { estado, nuevoEstado } = req.body;
    
    // Aceptar tanto 'estado' como 'nuevoEstado' para compatibilidad
    const estadoRecibido = estado || nuevoEstado;
    
    if (!estadoRecibido) {
      return res.status(400).json({ 
        success: false, 
        error: 'Estado es requerido' 
      });
    }
    
    // Validar estados permitidos (los que vienen del select en el frontend)
    const validStates = [
      'En espera de surtir', 
      'En ruta',
      'Entregado', 
      'Cancelado'
    ];
    
    if (!validStates.includes(estadoRecibido)) {
      logger.warn('⚠️ Estado no válido recibido: %s', estadoRecibido);
      return res.status(400).json({ 
        success: false, 
        error: `Estado no válido. Estados permitidos: ${validStates.join(', ')}`
      });
    }
    
    // 🔄 RETRY LOOP con optimistic locking (máximo 3 intentos)
    const MAX_RETRIES = 3;
    let attempt = 0;
    
    while (attempt < MAX_RETRIES) {
      attempt++;
      
      // Obtener pedido actual CON VERSION y datos del cliente
      const pool = await getPool();
      const pedidoResult = await pool.request()
        .input('pedidoId', sql.Int, parseInt(pedidoId))
        .query(`
          SELECT p.PedidoID, p.Estado, p.Version, p.ClienteID,
                 c.NumeroTelefono, c.Nombre
          FROM Pedidos p
          INNER JOIN Clientes c ON p.ClienteID = c.ClienteID
          WHERE p.PedidoID = @pedidoId
        `);
      
      if (pedidoResult.recordset.length === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'Pedido no encontrado' 
        });
      }
      
      const pedido = pedidoResult.recordset[0];
      const currentVersion = pedido.Version || 0;
      
      // 🔐 ACTUALIZACIÓN CON OPTIMISTIC LOCKING (sin notas)
      const success = await updatePedidoEstadoWithVersion(
        parseInt(pedidoId), 
        estadoRecibido, 
        currentVersion
      );
      
      if (success) {
        logger.info('✅ Estado actualizado (intento %d/%d): Pedido %s → %s', attempt, MAX_RETRIES, pedidoId, estadoRecibido);
        
        // 📱 NOTIFICACIÓN AUTOMÁTICA AL CLIENTE
        // Ejecutar en background para no bloquear la respuesta
        whatsappService.notifyCustomerOrderStatus(
          pedido.NumeroTelefono,
          parseInt(pedidoId),
          estadoRecibido,
          pedido.Nombre
        ).catch(err => {
          // Error ya loggeado en whatsappService, solo registrar que falló
          logger.warn('⚠️ Notificación no enviada para pedido %s (no crítico)', pedidoId);
        });
        
        return res.json({ 
          success: true, 
          message: 'Estado actualizado correctamente'
        });
      } else {
        // Conflicto de versión - otro proceso modificó el pedido
        logger.warn('⚠️ Conflicto de versión en intento %d/%d para pedido: %s (esperado v%d)', 
                   attempt, MAX_RETRIES, pedidoId, currentVersion);
        
        if (attempt >= MAX_RETRIES) {
          logger.error('🚨 FALLO después de %d intentos - conflicto de concurrencia: pedido %s', MAX_RETRIES, pedidoId);
          return res.status(409).json({ 
            success: false, 
            error: `Conflicto de concurrencia. El pedido fue modificado por otro usuario. Por favor, recargue e intente de nuevo.` 
          });
        }
        
        // Esperar un poco antes de reintentar (backoff exponencial)
        const delay = Math.pow(2, attempt - 1) * 100; // 100ms, 200ms, 400ms
        await new Promise(resolve => setTimeout(resolve, delay));
        // Continuar al siguiente intento del loop
      }
    }
    
    // No debería llegar aquí, pero por seguridad
    return res.status(500).json({ 
      success: false, 
      error: `Fallo al actualizar pedido después de ${MAX_RETRIES} intentos` 
    });
  } catch (err) {
    logger.error('❌ Error actualizando estado del pedido %s:', req.params.pedidoId, err.message);
    logger.error('Stack:', err.stack);
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

/**
 * Reimprime un ticket de pedido
 */
export async function reimprimirPedido(req, res) {
  try {
    const { pedidoId } = req.params;
    
    // Verificar si la impresión está habilitada
    if (!isPrintingEnabled()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Servicio de impresión deshabilitado' 
      });
    }
    
    // Obtener datos del pedido
    const pool = await getPool();
    const result = await pool.request()
      .input('PedidoID', sql.Int, pedidoId)
      .query(`
        SELECT 
          p.PedidoID,
          p.Folio,
          p.Contenido,
          p.Fecha,
          c.Nombre as NombreCliente,
          c.NumeroTelefono,
          c.Direccion
        FROM Pedidos p
        INNER JOIN Clientes c ON p.ClienteID = c.ClienteID
        WHERE p.PedidoID = @PedidoID
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Pedido no encontrado' 
      });
    }
    
    const pedido = result.recordset[0];
    
    // Actualizar estado a "Reimprimiendo"
    await pool.request()
      .input('PedidoID', sql.Int, pedidoId)
      .query(`
        UPDATE Pedidos 
        SET EstadoImpresion = 'Reimprimiendo'
        WHERE PedidoID = @PedidoID
      `);
    
    // Intentar reimprimir
    try {
      await printTicket({
        pedidoID: pedido.PedidoID,
        folio: pedido.Folio,
        cliente: pedido.NombreCliente,
        telefono: pedido.NumeroTelefono,
        direccion: pedido.Direccion,
        contenido: pedido.Contenido,
        fecha: new Date(pedido.Fecha).toLocaleString('es-MX', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        })
      });
      
      logger.info('✅ Ticket reimpreso exitosamente - Folio: %s - Usuario: %s', 
        pedido.Folio, req.session?.user?.Username);
      
      res.json({ 
        success: true, 
        message: 'Ticket reimpreso exitosamente',
        folio: pedido.Folio
      });
    } catch (printError) {
      logger.error('❌ Error al reimprimir ticket - Folio: %s - Error: %s', 
        pedido.Folio, printError.message);
      
      // El estado ya se actualizó a "Error" en printTicket()
      res.status(500).json({ 
        success: false, 
        error: 'Error al imprimir ticket: ' + printError.message 
      });
    }
  } catch (err) {
    logger.error('❌ Error en reimpresión:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
}
