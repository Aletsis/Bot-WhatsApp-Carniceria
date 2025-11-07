import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../api/services';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authService.checkAuth();
      // La respuesta tiene la estructura {success: true, user: {...}}
      setUser(response.user || response);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await authService.login(username, password);
      if (response.success) {
        setUser(response.user);
        return { success: true };
      }
      return { success: false, message: response.message };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Error al iniciar sesión',
      };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.Rol === 'admin',
    isSupervisor: user?.Rol === 'supervisor',
    isEditor: user?.Rol === 'editor',
    isViewer: user?.Rol === 'viewer',
    // Helpers de permisos combinados
    canManageUsers: user?.Rol === 'admin', // Solo admin
    canManageConfig: user?.Rol === 'admin', // Solo admin
    canManageOrders: ['admin', 'supervisor', 'editor'].includes(user?.Rol), // Admin, supervisor o editor
    canViewAll: ['admin', 'supervisor'].includes(user?.Rol), // Admin o supervisor
    canEdit: ['admin', 'supervisor', 'editor'].includes(user?.Rol), // Admin, supervisor o editor
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};
