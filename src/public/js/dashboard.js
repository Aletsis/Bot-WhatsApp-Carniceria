// Estado global
let currentView = 'overview';
let pedidosData = [];

// ============= CARGAR ESTADÍSTICAS =============
async function loadStats() {
  try {
    const response = await fetch('/dashboard/api/stats');
    if (!response.ok) throw new Error('Error al cargar estadísticas');
    
    const { success, data } = await response.json();
    if (!success) throw new Error('Respuesta sin éxito');
    
    document.getElementById('totalClientes').textContent = data.totalClientes || 0;
    document.getElementById('pedidosHoy').textContent = data.pedidosHoy || 0;
    document.getElementById('pedidosPendientes').textContent = data.pedidosPendientes || 0;
    document.getElementById('sesionesActivas').textContent = data.sesionesActivas || 0;
  } catch (err) {
    console.error('Error cargando estadísticas:', err);
    showNotification('Error al cargar estadísticas', 'error');
  }
}

// ============= CARGAR PEDIDOS =============
async function loadPedidos() {
  try {
    const response = await fetch('/dashboard/api/pedidos?limit=50');
    if (!response.ok) throw new Error('Error al cargar pedidos');
    
    const { success, data } = await response.json();
    if (!success) throw new Error('Respuesta sin éxito');
    
    pedidosData = data;
    renderPedidos(data);
  } catch (err) {
    console.error('Error cargando pedidos:', err);
    document.getElementById('pedidosBody').innerHTML = 
      '<tr><td colspan="5" style="text-align:center; color:#e74c3c;">❌ Error al cargar pedidos</td></tr>';
  }
}

function renderPedidos(pedidos) {
  const tbody = document.getElementById('pedidosBody');
  
  if (!pedidos || pedidos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#95a5a6;">No hay pedidos registrados</td></tr>';
    return;
  }
  
  tbody.innerHTML = pedidos.map(p => `
    <tr>
      <td><strong>${escapeHtml(p.FolioPedido || p.Folio)}</strong></td>
      <td>
        ${escapeHtml(p.NombreCliente || p.ClienteNombre || 'Sin nombre')}<br>
        <small style="color:#7f8c8d;">${formatPhone(p.TelefonoCliente || p.NumeroTelefono)}</small>
      </td>
      <td>${formatDate(p.FechaCreacion || p.Fecha)}</td>
      <td><span class="badge badge-${getEstadoClass(p.EstadoPedido || p.Estado)}">${escapeHtml(p.EstadoPedido || p.Estado)}</span></td>
      <td>
        <button onclick="cambiarEstado(${p.PedidoID}, '${escapeHtml(p.EstadoPedido || p.Estado)}')" title="Cambiar estado">
          🔄
        </button>
        <button onclick="verDetalle(${p.PedidoID})" title="Ver detalles">
          👁️
        </button>
      </td>
    </tr>
  `).join('');
}

// ============= CAMBIAR ESTADO DE PEDIDO =============
async function cambiarEstado(pedidoId, estadoActual) {
  const estados = [
    'En espera de surtir',
    'En preparación',
    'Listo para entrega',
    'Entregado',
    'Cancelado'
  ];
  
  const opciones = estados
    .map(e => `<option value="${e}" ${e === estadoActual ? 'selected' : ''}>${e}</option>`)
    .join('');
  
  const nuevoEstado = prompt(
    `Pedido ID: ${pedidoId}\nEstado actual: ${estadoActual}\n\nIngresa el nuevo estado:\n\n` +
    `1 - En espera de surtir\n2 - En preparación\n3 - Listo para entrega\n4 - Entregado\n5 - Cancelado`,
    '2'
  );
  
  if (!nuevoEstado) return;
  
  const indexEstado = parseInt(nuevoEstado) - 1;
  if (indexEstado < 0 || indexEstado >= estados.length) {
    alert('❌ Opción inválida');
    return;
  }
  
  const estadoSeleccionado = estados[indexEstado];
  
  try {
    const response = await fetch(`/dashboard/api/pedidos/${pedidoId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: estadoSeleccionado })
    });
    
    const result = await response.json();
    
    if (result.success) {
      showNotification(`✅ Estado actualizado a: ${estadoSeleccionado}`, 'success');
      loadPedidos();
      loadStats();
    } else {
      throw new Error(result.error || 'Error al actualizar');
    }
  } catch (err) {
    console.error('Error actualizando estado:', err);
    showNotification('❌ Error al actualizar el estado', 'error');
  }
}

// ============= VER DETALLE DE PEDIDO =============
function verDetalle(pedidoId) {
  const pedido = pedidosData.find(p => p.PedidoID === pedidoId);
  
  if (!pedido) {
    alert('❌ Pedido no encontrado');
    return;
  }
  
  const detalleHTML = `
    <div style="background:white; padding:20px; border-radius:8px; max-width:600px; margin:20px auto;">
      <h2 style="margin-bottom:20px;">📋 Detalle del Pedido</h2>
      
      <p><strong>Folio:</strong> ${escapeHtml(pedido.Folio)}</p>
      <p><strong>Cliente:</strong> ${escapeHtml(pedido.ClienteNombre)}</p>
      <p><strong>Teléfono:</strong> ${formatPhone(pedido.NumeroTelefono)}</p>
      <p><strong>Dirección:</strong> ${escapeHtml(pedido.Direccion || 'No especificada')}</p>
      <p><strong>Fecha:</strong> ${formatDate(pedido.Fecha)}</p>
      <p><strong>Estado:</strong> <span class="badge badge-${getEstadoClass(pedido.Estado)}">${escapeHtml(pedido.Estado)}</span></p>
      
      <h3 style="margin-top:20px; margin-bottom:10px;">Contenido del pedido:</h3>
      <pre style="background:#f5f5f5; padding:15px; border-radius:5px; white-space:pre-wrap;">${escapeHtml(pedido.Contenido)}</pre>
      
      <button onclick="closeModal()" style="margin-top:20px; width:100%;">Cerrar</button>
    </div>
  `;
  
  showModal(detalleHTML);
}

// ============= UTILIDADES =============
function getEstadoClass(estado) {
  const classes = {
    'En espera de surtir': 'warning',
    'En preparación': 'info',
    'Listo para entrega': 'success',
    'Entregado': 'primary',
    'Cancelado': 'danger'
  };
  return classes[estado] || 'warning';
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatPhone(phone) {
  if (!phone) return 'N/A';
  // Formato: +52 444 123 4567
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length <= 10) return phone;
  return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showNotification(message, type = 'info') {
  const colors = {
    success: '#27ae60',
    error: '#e74c3c',
    info: '#3498db',
    warning: '#f39c12'
  };
  
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${colors[type]};
    color: white;
    padding: 15px 20px;
    border-radius: 5px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    z-index: 10000;
    animation: slideIn 0.3s;
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function showModal(content) {
  const modal = document.createElement('div');
  modal.id = 'detailModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  `;
  modal.innerHTML = content;
  modal.onclick = (e) => { if (e.target === modal) closeModal(); };
  
  document.body.appendChild(modal);
}

function closeModal() {
  const modal = document.getElementById('detailModal');
  if (modal) modal.remove();
}

// ============= GESTIÓN DE CLIENTES =============
let clientesData = [];
let clientesPage = 1;
const clientesLimit = 20;

async function loadClientes() {
  try {
    const response = await fetch(`/dashboard/api/clientes?page=${clientesPage}&limit=${clientesLimit}`);
    if (!response.ok) throw new Error('Error al cargar clientes');
    
    const { success, data, page } = await response.json();
    if (!success) throw new Error('Respuesta sin éxito');
    
    clientesData = data;
    renderClientes(data);
    
    // Actualizar info de paginación
    document.getElementById('clientesPageInfo').textContent = `Página ${page}`;
  } catch (err) {
    console.error('Error cargando clientes:', err);
    document.getElementById('clientesBody').innerHTML = 
      '<tr><td colspan="7" style="text-align:center; color:#e74c3c;">❌ Error al cargar clientes</td></tr>';
  }
}

function renderClientes(clientes) {
  const tbody = document.getElementById('clientesBody');
  
  if (!clientes || clientes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#95a5a6;">No hay clientes registrados</td></tr>';
    return;
  }
  
  tbody.innerHTML = clientes.map(c => `
    <tr>
      <td class="hide-mobile"><strong>${c.ClienteID}</strong></td>
      <td>${escapeHtml(c.Nombre || 'Sin nombre')}</td>
      <td>${formatPhone(c.NumeroTelefono)}</td>
      <td class="hide-mobile">${escapeHtml(c.Direccion || 'Sin dirección')}</td>
      <td class="hide-mobile"><span class="info-badge">${c.TotalPedidos || 0} pedidos</span></td>
      <td class="hide-mobile">${formatDate(c.FechaAlta)}</td>
      <td>
        <button class="btn-edit" onclick="editarCliente(${c.ClienteID})" title="Editar">
          ✏️
        </button>
        <button onclick="verHistorialCliente(${c.ClienteID})" title="Ver historial">
          📋
        </button>
      </td>
    </tr>
  `).join('');
}

function filtrarClientes() {
  const searchTerm = document.getElementById('clienteSearch').value.toLowerCase();
  
  if (!searchTerm) {
    renderClientes(clientesData);
    return;
  }
  
  const filtered = clientesData.filter(c => 
    (c.Nombre && c.Nombre.toLowerCase().includes(searchTerm)) ||
    (c.NumeroTelefono && c.NumeroTelefono.includes(searchTerm))
  );
  
  renderClientes(filtered);
}

function cambiarPaginaClientes(delta) {
  const newPage = clientesPage + delta;
  if (newPage < 1) return;
  
  clientesPage = newPage;
  loadClientes();
}

function mostrarFormularioNuevoCliente() {
  const formHTML = `
    <div style="background:white; padding:30px; border-radius:8px; max-width:600px; margin:20px auto;">
      <h2 style="margin-bottom:20px;">➕ Nuevo Cliente</h2>
      
      <form id="nuevoClienteForm" onsubmit="crearCliente(event)">
        <div class="form-group">
          <label for="nuevoNombre">Nombre Completo *</label>
          <input type="text" id="nuevoNombre" required minlength="2" maxlength="200">
        </div>
        
        <div class="form-group">
          <label for="nuevoTelefono">Teléfono (con código de país) *</label>
          <input type="tel" id="nuevoTelefono" placeholder="521234567890" required pattern="[0-9]{10,15}">
          <small style="color:#7f8c8d;">Ejemplo: 5214441234567 (incluir código de país sin +)</small>
        </div>
        
        <div class="form-group">
          <label for="nuevaDireccion">Dirección</label>
          <textarea id="nuevaDireccion" placeholder="Calle, número, colonia, CP, ciudad"></textarea>
        </div>
        
        <div class="form-actions">
          <button type="button" class="btn-cancel" onclick="closeModal()">Cancelar</button>
          <button type="submit" class="btn-primary">Guardar Cliente</button>
        </div>
      </form>
    </div>
  `;
  
  showModal(formHTML);
}

async function crearCliente(event) {
  event.preventDefault();
  
  const nombre = document.getElementById('nuevoNombre').value.trim();
  const telefono = document.getElementById('nuevoTelefono').value.trim();
  const direccion = document.getElementById('nuevaDireccion').value.trim();
  
  try {
    const response = await fetch('/dashboard/api/clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, telefono, direccion })
    });
    
    const result = await response.json();
    
    if (result.success) {
      showNotification('✅ Cliente creado exitosamente', 'success');
      closeModal();
      loadClientes();
      loadStats(); // Actualizar contador
    } else {
      throw new Error(result.error || 'Error al crear cliente');
    }
  } catch (err) {
    console.error('Error creando cliente:', err);
    showNotification('❌ ' + err.message, 'error');
  }
}

function editarCliente(clienteId) {
  const cliente = clientesData.find(c => c.ClienteID === clienteId);
  
  if (!cliente) {
    alert('❌ Cliente no encontrado');
    return;
  }
  
  const formHTML = `
    <div style="background:white; padding:30px; border-radius:8px; max-width:600px; margin:20px auto;">
      <h2 style="margin-bottom:20px;">✏️ Editar Cliente</h2>
      
      <form id="editarClienteForm" onsubmit="actualizarCliente(event, ${clienteId})">
        <div class="form-group">
          <label for="editNombre">Nombre Completo *</label>
          <input type="text" id="editNombre" value="${escapeHtml(cliente.Nombre || '')}" required minlength="2" maxlength="200">
        </div>
        
        <div class="form-group">
          <label for="editTelefono">Teléfono *</label>
          <input type="tel" id="editTelefono" value="${cliente.NumeroTelefono}" required readonly>
          <small style="color:#7f8c8d;">El teléfono no se puede cambiar</small>
        </div>
        
        <div class="form-group">
          <label for="editDireccion">Dirección</label>
          <textarea id="editDireccion">${escapeHtml(cliente.Direccion || '')}</textarea>
        </div>
        
        <div class="form-actions">
          <button type="button" class="btn-cancel" onclick="closeModal()">Cancelar</button>
          <button type="submit" class="btn-primary">Actualizar Cliente</button>
        </div>
      </form>
    </div>
  `;
  
  showModal(formHTML);
}

async function actualizarCliente(event, clienteId) {
  event.preventDefault();
  
  const nombre = document.getElementById('editNombre').value.trim();
  const direccion = document.getElementById('editDireccion').value.trim();
  
  try {
    const response = await fetch(`/dashboard/api/clientes/${clienteId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, direccion })
    });
    
    const result = await response.json();
    
    if (result.success) {
      showNotification('✅ Cliente actualizado exitosamente', 'success');
      closeModal();
      loadClientes();
    } else {
      throw new Error(result.error || 'Error al actualizar cliente');
    }
  } catch (err) {
    console.error('Error actualizando cliente:', err);
    showNotification('❌ ' + err.message, 'error');
  }
}

async function verHistorialCliente(clienteId) {
  try {
    const response = await fetch(`/dashboard/api/clientes/${clienteId}/pedidos`);
    const { success, data } = await response.json();
    
    if (!success) throw new Error('Error al cargar historial');
    
    const cliente = clientesData.find(c => c.ClienteID === clienteId);
    
    const historialHTML = `
      <div style="background:white; padding:30px; border-radius:8px; max-width:800px; margin:20px auto;">
        <h2 style="margin-bottom:20px;">📋 Historial de ${escapeHtml(cliente.Nombre)}</h2>
        <p><strong>Teléfono:</strong> ${formatPhone(cliente.NumeroTelefono)}</p>
        <p><strong>Dirección:</strong> ${escapeHtml(cliente.Direccion || 'No especificada')}</p>
        <hr style="margin: 20px 0;">
        
        <h3>Pedidos (${data.length})</h3>
        ${data.length === 0 ? '<p style="color:#95a5a6;">No hay pedidos registrados</p>' : `
          <table style="width:100%; margin-top:15px;">
            <thead>
              <tr style="background:#f8f9fa;">
                <th style="padding:10px; text-align:left;">Folio</th>
                <th style="padding:10px; text-align:left;">Fecha</th>
                <th style="padding:10px; text-align:left;">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(p => `
                <tr style="border-bottom:1px solid #eee;">
                  <td style="padding:10px;">${escapeHtml(p.Folio)}</td>
                  <td style="padding:10px;">${formatDate(p.Fecha)}</td>
                  <td style="padding:10px;"><span class="badge badge-${getEstadoClass(p.Estado)}">${escapeHtml(p.Estado)}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
        
        <button onclick="closeModal()" style="margin-top:20px; width:100%;">Cerrar</button>
      </div>
    `;
    
    showModal(historialHTML);
  } catch (err) {
    console.error('Error cargando historial:', err);
    showNotification('❌ Error al cargar historial', 'error');
  }
}

// ============= CARGAR SESIONES ACTIVAS =============
async function loadSesiones() {
  try {
    const response = await fetch('/dashboard/api/sesiones');
    if (!response.ok) throw new Error('Error al cargar sesiones');
    
    const { success, data } = await response.json();
    if (!success) throw new Error('Respuesta sin éxito');
    
    renderSesiones(data);
  } catch (err) {
    console.error('Error cargando sesiones:', err);
    document.getElementById('sesionesBody').innerHTML = 
      '<tr><td colspan="5" style="text-align:center; color:#e74c3c;">❌ Error al cargar sesiones</td></tr>';
  }
}

function renderSesiones(sesiones) {
  const tbody = document.getElementById('sesionesBody');
  
  if (!sesiones || sesiones.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#95a5a6;">📭 No hay sesiones activas en los últimos 30 minutos</td></tr>';
    return;
  }
  
  tbody.innerHTML = sesiones.map(s => {
    // Formatear fecha de última interacción
    const fecha = new Date(s.UltimaInteraccion);
    const fechaFormateada = fecha.toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Badge para estado
    const estadoBadge = getEstadoBadge(s.Estado);
    
    // Calcular tiempo inactivo
    const minutos = s.MinutosInactivo || 0;
    const tiempoInactivo = minutos < 1 ? 'Menos de 1 min' : `${Math.floor(minutos)} min`;
    
    // Color para tiempo inactivo
    let colorTiempo = '#27ae60'; // verde
    if (minutos > 3) colorTiempo = '#e67e22'; // naranja
    if (minutos > 4.5) colorTiempo = '#e74c3c'; // rojo
    
    return `
      <tr>
        <td><strong>${s.NumeroTelefono || 'N/A'}</strong></td>
        <td>${estadoBadge}</td>
        <td>${fechaFormateada}</td>
        <td><span style="color: ${colorTiempo}; font-weight: bold;">${tiempoInactivo}</span></td>
        <td>
          <button onclick='verDetallesSesion(${JSON.stringify(s).replace(/'/g, "&apos;")})' 
                  style="padding:5px 10px; background:#3498db; color:white; border:none; border-radius:3px; cursor:pointer;">
            👁️ Ver detalles
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function getEstadoBadge(estado) {
  const badges = {
    'START': '<span class="badge badge-info">START</span>',
    'MENU': '<span class="badge badge-primary">MENU</span>',
    'ASK_NAME': '<span class="badge badge-warning">ASK_NAME</span>',
    'ASK_ADDRESS': '<span class="badge badge-warning">ASK_ADDRESS</span>',
    'TAKING_ORDER': '<span class="badge badge-success">TAKING_ORDER</span>',
    'AWAITING_CONFIRM': '<span class="badge badge-warning">AWAITING_CONFIRM</span>'
  };
  
  return badges[estado] || `<span class="badge">${estado}</span>`;
}

function verDetallesSesion(sesion) {
  const fecha = new Date(sesion.UltimaInteraccion);
  const fechaFormateada = fecha.toLocaleString('es-MX', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  const detallesHTML = `
    <div style="max-width: 600px; margin: 0 auto;">
      <h3 style="margin-bottom: 20px;">📱 Detalles de Sesión</h3>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <div style="margin-bottom: 15px;">
          <strong>📞 Teléfono:</strong><br/>
          <span style="font-size: 18px;">${sesion.NumeroTelefono || 'N/A'}</span>
        </div>
        
        <div style="margin-bottom: 15px;">
          <strong>📊 Estado:</strong><br/>
          ${getEstadoBadge(sesion.Estado)}
        </div>
        
        <div style="margin-bottom: 15px;">
          <strong>🕐 Última Interacción:</strong><br/>
          ${fechaFormateada}
        </div>
        
        <div style="margin-bottom: 15px;">
          <strong>⏱️ Tiempo Inactivo:</strong><br/>
          <span style="font-size: 16px; color: ${sesion.MinutosInactivo > 4 ? '#e74c3c' : '#27ae60'};">
            ${sesion.MinutosInactivo < 1 ? 'Menos de 1 minuto' : `${Math.floor(sesion.MinutosInactivo)} minutos`}
          </span>
        </div>
      </div>
      
      <div style="background: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; margin-bottom: 20px;">
        <strong>⚠️ Nota:</strong> Las sesiones se cierran automáticamente después de 5 minutos de inactividad.
      </div>
      
      <button onclick="closeModal()" style="width:100%;">Cerrar</button>
    </div>
  `;
  
  showModal(detallesHTML);
}

// ============= GESTIÓN COMPLETA DE PEDIDOS =============
let pedidosCompletos = [];
let pedidosFiltrados = [];
let paginaActualPedidos = 1;
const pedidosPorPagina = 20;

async function loadPedidosCompletos() {
  try {
    const response = await fetch('/dashboard/api/pedidos?limit=1000'); // Cargar todos
    if (!response.ok) throw new Error('Error al cargar pedidos');
    
    const { success, data } = await response.json();
    if (!success) throw new Error('Respuesta sin éxito');
    
    pedidosCompletos = data;
    pedidosFiltrados = data;
    paginaActualPedidos = 1;
    
    renderPedidosCompletos();
    actualizarContadoresPedidos();
  } catch (err) {
    console.error('Error cargando pedidos:', err);
    document.getElementById('pedidosCompletosBody').innerHTML = 
      '<tr><td colspan="8" style="text-align:center; color:#e74c3c;">❌ Error al cargar pedidos</td></tr>';
  }
}

function renderPedidosCompletos() {
  const tbody = document.getElementById('pedidosCompletosBody');
  
  if (!pedidosFiltrados || pedidosFiltrados.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#95a5a6;">📭 No hay pedidos que mostrar</td></tr>';
    actualizarPaginacionPedidos();
    return;
  }
  
  // Calcular pedidos para la página actual
  const inicio = (paginaActualPedidos - 1) * pedidosPorPagina;
  const fin = inicio + pedidosPorPagina;
  const pedidosPagina = pedidosFiltrados.slice(inicio, fin);
  
  tbody.innerHTML = pedidosPagina.map(p => {
    const fecha = new Date(p.FechaCreacion);
    const fechaFormateada = fecha.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    const horaFormateada = fecha.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    return `
      <tr>
        <td><strong>#${p.FolioPedido || p.PedidoID}</strong></td>
        <td>${p.NombreCliente || 'Sin nombre'}</td>
        <td class="hide-mobile">${p.TelefonoCliente || 'N/A'}</td>
        <td class="hide-mobile">${p.DireccionEntrega ? (p.DireccionEntrega.length > 30 ? p.DireccionEntrega.substring(0, 30) + '...' : p.DireccionEntrega) : 'N/A'}</td>
        <td>
          <div>${fechaFormateada}</div>
          <small style="color: #7f8c8d;">${horaFormateada}</small>
        </td>
        <td>${getEstadoPedidoBadge(p.EstadoPedido)}</td>
        <td>
          <button onclick='verDetallesPedido(${JSON.stringify(p).replace(/'/g, "&apos;")})' 
                  style="padding:5px 10px; background:#3498db; color:white; border:none; border-radius:3px; cursor:pointer; font-size:12px;">
            📄 Ver
          </button>
        </td>
        <td>
          <select onchange="cambiarEstadoPedido(${p.PedidoID}, this.value, '${p.EstadoPedido}')" 
                  style="padding:5px; border:1px solid #ddd; border-radius:3px; cursor:pointer; font-size:12px;">
            <option value="">-- Cambiar --</option>
            <option value="PENDIENTE">⏳ Pendiente</option>
            <option value="EN_PROCESO">🔄 En Proceso</option>
            <option value="ENTREGADO">✅ Entregado</option>
            <option value="CANCELADO">❌ Cancelado</option>
          </select>
        </td>
      </tr>
    `;
  }).join('');
  
  actualizarPaginacionPedidos();
}

function getEstadoPedidoBadge(estado) {
  const badges = {
    'PENDIENTE': '<span class="badge badge-warning">⏳ Pendiente</span>',
    'EN_PROCESO': '<span class="badge badge-info">🔄 En Proceso</span>',
    'ENTREGADO': '<span class="badge badge-success">✅ Entregado</span>',
    'CANCELADO': '<span class="badge badge-danger">❌ Cancelado</span>',
    'En espera de surtir': '<span class="badge badge-warning">⏳ En espera</span>',
    'En preparación': '<span class="badge badge-info">🔄 En preparación</span>',
    'Listo para entrega': '<span class="badge badge-primary">📦 Listo</span>',
    'Entregado': '<span class="badge badge-success">✅ Entregado</span>',
    'Cancelado': '<span class="badge badge-danger">❌ Cancelado</span>'
  };
  
  return badges[estado] || `<span class="badge">${estado}</span>`;
}

function filtrarPedidos() {
  const searchTerm = document.getElementById('pedidoSearch').value.toLowerCase();
  const estadoFilter = document.getElementById('estadoFilter').value;
  const fechaFilter = document.getElementById('fechaFilter').value;
  
  pedidosFiltrados = pedidosCompletos.filter(p => {
    // Filtro de búsqueda
    const matchSearch = !searchTerm || 
      (p.FolioPedido && p.FolioPedido.toString().includes(searchTerm)) ||
      (p.NombreCliente && p.NombreCliente.toLowerCase().includes(searchTerm)) ||
      (p.TelefonoCliente && p.TelefonoCliente.includes(searchTerm));
    
    // Filtro de estado
    const matchEstado = !estadoFilter || p.EstadoPedido === estadoFilter;
    
    // Filtro de fecha
    let matchFecha = true;
    if (fechaFilter) {
      const fechaPedido = new Date(p.FechaCreacion).toISOString().split('T')[0];
      matchFecha = fechaPedido === fechaFilter;
    }
    
    return matchSearch && matchEstado && matchFecha;
  });
  
  paginaActualPedidos = 1;
  renderPedidosCompletos();
  actualizarContadoresPedidos();
}

function actualizarPaginacionPedidos() {
  const totalPaginas = Math.ceil(pedidosFiltrados.length / pedidosPorPagina);
  document.getElementById('pedidosPageInfo').textContent = 
    `Página ${paginaActualPedidos} de ${totalPaginas || 1} (${pedidosFiltrados.length} pedidos)`;
  
  const btnAnterior = document.querySelector('#pedidosPagination button:first-child');
  const btnSiguiente = document.querySelector('#pedidosPagination button:last-child');
  
  btnAnterior.disabled = paginaActualPedidos === 1;
  btnSiguiente.disabled = paginaActualPedidos >= totalPaginas;
}

function cambiarPaginaPedidos(direccion) {
  const totalPaginas = Math.ceil(pedidosFiltrados.length / pedidosPorPagina);
  paginaActualPedidos += direccion;
  
  if (paginaActualPedidos < 1) paginaActualPedidos = 1;
  if (paginaActualPedidos > totalPaginas) paginaActualPedidos = totalPaginas;
  
  renderPedidosCompletos();
  
  // Scroll al inicio de la tabla
  document.getElementById('pedidosCompletosTable').scrollIntoView({ behavior: 'smooth' });
}

function actualizarContadoresPedidos() {
  const entregados = pedidosFiltrados.filter(p => p.EstadoPedido === 'ENTREGADO' || p.EstadoPedido === 'Entregado').length;
  const pendientes = pedidosFiltrados.filter(p => p.EstadoPedido === 'PENDIENTE' || p.EstadoPedido === 'En espera de surtir').length;
  const enProceso = pedidosFiltrados.filter(p => p.EstadoPedido === 'EN_PROCESO' || p.EstadoPedido === 'En preparación' || p.EstadoPedido === 'Listo para entrega').length;
  const cancelados = pedidosFiltrados.filter(p => p.EstadoPedido === 'CANCELADO' || p.EstadoPedido === 'Cancelado').length;
  
  document.getElementById('countEntregados').textContent = entregados;
  document.getElementById('countPendientes').textContent = pendientes;
  document.getElementById('countEnProceso').textContent = enProceso;
  document.getElementById('countCancelados').textContent = cancelados;
}

async function cambiarEstadoPedido(pedidoId, nuevoEstado, estadoActual) {
  if (!nuevoEstado) return;
  
  if (!confirm(`¿Cambiar estado de pedido #${pedidoId}?\n\nDe: ${estadoActual}\nA: ${nuevoEstado}`)) {
    // Resetear el select
    event.target.value = '';
    return;
  }
  
  try {
    const response = await fetch(`/dashboard/api/pedidos/${pedidoId}/estado`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: nuevoEstado })
    });
    
    if (!response.ok) throw new Error('Error al actualizar estado');
    
    const { success } = await response.json();
    if (!success) throw new Error('Respuesta sin éxito');
    
    showNotification('✅ Estado actualizado correctamente', 'success');
    loadPedidosCompletos(); // Recargar lista
  } catch (err) {
    console.error('Error actualizando estado:', err);
    showNotification('❌ Error al actualizar estado', 'error');
    event.target.value = '';
  }
}

function verDetallesPedido(pedido) {
  const fecha = new Date(pedido.FechaCreacion);
  const fechaFormateada = fecha.toLocaleString('es-MX', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const detallesHTML = `
    <div style="max-width: 700px; margin: 0 auto;">
      <h3 style="margin-bottom: 20px;">📋 Detalles del Pedido #${pedido.FolioPedido || pedido.PedidoID}</h3>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
          <h4 style="margin-bottom: 10px; color: #2c3e50;">👤 Cliente</h4>
          <div style="margin-bottom: 8px;"><strong>Nombre:</strong> ${pedido.NombreCliente || 'Sin nombre'}</div>
          <div style="margin-bottom: 8px;"><strong>Teléfono:</strong> ${pedido.TelefonoCliente || 'N/A'}</div>
          <div><strong>Dirección:</strong><br/>${pedido.DireccionEntrega || 'N/A'}</div>
        </div>
        
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
          <h4 style="margin-bottom: 10px; color: #2c3e50;">📊 Información del Pedido</h4>
          <div style="margin-bottom: 8px;"><strong>Fecha:</strong> ${fechaFormateada}</div>
          <div style="margin-bottom: 8px;"><strong>Estado:</strong> ${getEstadoPedidoBadge(pedido.EstadoPedido)}</div>
          <div style="margin-bottom: 8px;"><strong>Folio:</strong> #${pedido.FolioPedido || pedido.PedidoID}</div>
        </div>
      </div>
      
      <div style="background: #fff; padding: 20px; border: 2px solid #e0e0e0; border-radius: 8px; margin-bottom: 20px;">
        <h4 style="margin-bottom: 15px; color: #2c3e50;">🛒 Detalles del Pedido</h4>
        <div style="white-space: pre-wrap; line-height: 1.6; font-family: monospace; background: #f8f9fa; padding: 15px; border-radius: 5px;">
${pedido.DetallesPedido || 'No hay detalles disponibles'}
        </div>
      </div>
      
      ${pedido.Notas ? `
        <div style="background: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; margin-bottom: 20px;">
          <strong>📝 Notas:</strong><br/>
          ${pedido.Notas}
        </div>
      ` : ''}
      
      <button onclick="closeModal()" style="width:100%;">Cerrar</button>
    </div>
  `;
  
  showModal(detallesHTML);
}

// ============= NAVEGACIÓN ENTRE VISTAS =============
function cambiarVista(vista) {
  // Ocultar todas las vistas
  document.querySelectorAll('.view-section').forEach(v => v.style.display = 'none');
  
  // Remover active de todos los links
  document.querySelectorAll('.sidebar nav a').forEach(a => a.classList.remove('active'));
  
  // Mostrar vista seleccionada
  if (vista === 'overview') {
    document.getElementById('overviewView').style.display = 'block';
    document.getElementById('statsSection').style.display = 'grid';
  } else if (vista === 'pedidos') {
    document.getElementById('pedidosView').style.display = 'block';
    document.getElementById('statsSection').style.display = 'grid';
    loadPedidosCompletos();
  } else if (vista === 'clientes') {
    document.getElementById('clientesView').style.display = 'block';
    document.getElementById('statsSection').style.display = 'grid';
    loadClientes();
  } else if (vista === 'sesiones') {
    document.getElementById('sesionesView').style.display = 'block';
    document.getElementById('statsSection').style.display = 'grid';
    loadSesiones();
  }
  
  // Activar link correspondiente
  document.querySelector(`[data-view="${vista}"]`).classList.add('active');
}

// Event listeners para navegación
document.querySelectorAll('.sidebar nav a[data-view]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const vista = link.getAttribute('data-view');
    cambiarVista(vista);
  });
});

// ============= AUTO-ACTUALIZACIÓN =============
setInterval(() => {
  loadStats();
  
  // Solo actualizar la vista activa
  const vistaActiva = document.querySelector('.sidebar nav a.active')?.getAttribute('data-view');
  if (vistaActiva === 'overview') {
    loadPedidos();
  } else if (vistaActiva === 'pedidos') {
    loadPedidosCompletos();
  } else if (vistaActiva === 'clientes') {
    loadClientes();
  } else if (vistaActiva === 'sesiones') {
    loadSesiones();
  }
}, 10000); // Cada 10 segundos

// ============= MENÚ MÓVIL =============
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const sidebar = document.getElementById('sidebar');
const mobileOverlay = document.getElementById('mobileOverlay');

function toggleMobileMenu() {
  sidebar.classList.toggle('active');
  mobileOverlay.classList.toggle('active');
  
  // Cambiar icono del botón
  if (sidebar.classList.contains('active')) {
    mobileMenuToggle.textContent = '✕';
  } else {
    mobileMenuToggle.textContent = '☰';
  }
}

function closeMobileMenu() {
  sidebar.classList.remove('active');
  mobileOverlay.classList.remove('active');
  mobileMenuToggle.textContent = '☰';
}

// Event listeners para menú móvil
mobileMenuToggle.addEventListener('click', toggleMobileMenu);
mobileOverlay.addEventListener('click', closeMobileMenu);

// Cerrar menú al hacer clic en un enlace
document.querySelectorAll('.sidebar nav a').forEach(link => {
  link.addEventListener('click', () => {
    // Dar tiempo para que la navegación se procese
    setTimeout(closeMobileMenu, 100);
  });
});

// Cerrar menú al cambiar el tamaño de ventana a desktop
window.addEventListener('resize', () => {
  if (window.innerWidth > 768) {
    closeMobileMenu();
  }
});

// Prevenir scroll del body cuando el menú está abierto
const style = document.createElement('style');
style.textContent = `
  body.menu-open {
    overflow: hidden;
  }
`;
document.head.appendChild(style);

// Agregar/remover clase al body cuando se abre/cierra el menú
const observer = new MutationObserver(() => {
  if (sidebar.classList.contains('active')) {
    document.body.classList.add('menu-open');
  } else {
    document.body.classList.remove('menu-open');
  }
});
observer.observe(sidebar, { attributes: true, attributeFilter: ['class'] });

// ============= CARGAR INICIAL =============
loadStats();
loadPedidos();

console.log('✅ Dashboard cargado correctamente');
console.log('📱 Vista móvil mejorada habilitada');