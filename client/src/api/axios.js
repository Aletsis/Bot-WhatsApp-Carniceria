import axios from 'axios';

// Configuración base de axios
const axiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000,
  withCredentials: true, // Importante para cookies de sesión
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para manejo de errores global
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirigir a login si no está autenticado
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
