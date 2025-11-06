import axios from './axios';

export const authService = {
  login: async (username, password) => {
    const response = await axios.post('/auth/login', { username, password });
    return response.data;
  },

  logout: async () => {
    const response = await axios.post('/auth/logout');
    return response.data;
  },

  checkAuth: async () => {
    try {
      const response = await axios.get('/dashboard/check-auth');
      return response.data;
    } catch (error) {
      return null;
    }
  },
};

export const pedidosService = {
  getAll: async (estado = '', fechaInicio = '', fechaFin = '') => {
    const params = {};
    if (estado) params.estado = estado;
    if (fechaInicio) params.fechaInicio = fechaInicio;
    if (fechaFin) params.fechaFin = fechaFin;
    
    const response = await axios.get('/dashboard/pedidos', { params });
    // El backend devuelve { success: true, data: [...] }
    return response.data.data || response.data;
  },

  updateEstado: async (id, nuevoEstado) => {
    const response = await axios.put(`/dashboard/pedidos/${id}/estado`, {
      nuevoEstado,
    });
    return response.data;
  },
};

export const clientesService = {
  getAll: async () => {
    const response = await axios.get('/dashboard/clientes');
    // El backend puede devolver { success: true, data: [...] } o directamente el array
    return response.data.data || response.data;
  },

  create: async (clienteData) => {
    const response = await axios.post('/dashboard/clientes', clienteData);
    return response.data;
  },

  update: async (id, clienteData) => {
    const response = await axios.put(`/dashboard/clientes/${id}`, clienteData);
    return response.data;
  },

  delete: async (id) => {
    const response = await axios.delete(`/dashboard/clientes/${id}`);
    return response.data;
  },
};

export const conversacionesService = {
  getAll: async () => {
    const response = await axios.get('/dashboard/conversaciones');
    return response.data.data || response.data;
  },
};

export const usuariosService = {
  getAll: async () => {
    const response = await axios.get('/dashboard/usuarios');
    return response.data.data || response.data;
  },

  create: async (usuarioData) => {
    const response = await axios.post('/dashboard/usuarios', usuarioData);
    return response.data;
  },

  cambiarPassword: async (id, password) => {
    const response = await axios.post(`/dashboard/usuarios/${id}/cambiar-password`, {
      password,
    });
    return response.data;
  },

  toggle: async (id) => {
    const response = await axios.put(`/dashboard/usuarios/${id}/toggle`);
    return response.data;
  },
};
