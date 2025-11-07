import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useState } from 'react';

export const Navbar = ({ onMenuClick }) => {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-white shadow-md sticky top-0 z-40">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-3">
            {/* Botón de menú móvil */}
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-primary-600"
              aria-label="Abrir menú"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-base sm:text-xl font-bold text-primary-600">
              🥩 <span className="hidden sm:inline">Carnicerías La Blanquita</span>
              <span className="sm:hidden">La Blanquita</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-xs sm:text-sm text-gray-700 hidden sm:inline">
              Hola, <span className="font-semibold">{user?.Nombre || user?.Username}</span>
            </span>
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary-100 text-primary-800">
              {user?.Rol}
            </span>
            <button
              onClick={logout}
              className="text-xs sm:text-sm text-gray-700 hover:text-primary-600 font-medium"
            >
              <span className="hidden sm:inline">Cerrar Sesión</span>
              <span className="sm:hidden">Salir</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { isAdmin, canEdit, canViewAll } = useAuth();

  const menuItems = [];

  // Historial Chats - Todos los usuarios autenticados pueden ver
  menuItems.push({
    name: 'Historial Chats',
    path: '/dashboard/chats',
    icon: '�',
  });

  // Pedidos - Solo admin, supervisor, editor
  if (canEdit) {
    menuItems.push({
      name: 'Pedidos',
      path: '/dashboard/pedidos',
      icon: '�',
    });
  }

  // Clientes - Solo admin, supervisor, editor
  if (canEdit) {
    menuItems.push({
      name: 'Clientes',
      path: '/dashboard/clientes',
      icon: '�',
    });
  }

  // Conversaciones - Solo admin, supervisor
  if (canViewAll) {
    menuItems.push({
      name: 'Conversaciones',
      path: '/dashboard/conversaciones',
      icon: '�',
    });
  }

  // Usuarios - Solo admin
  if (isAdmin) {
    menuItems.push({
      name: 'Usuarios',
      path: '/dashboard/usuarios',
      icon: '👤',
    });
    menuItems.push({
      name: 'Configuración',
      path: '/dashboard/configuracion',
      icon: '⚙️',
    });
  }

  return (
    <>
      {/* Overlay para móvil */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-50 lg:z-auto
          w-64 bg-gray-800 min-h-screen
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="p-4">
          {/* Botón cerrar para móvil */}
          <div className="lg:hidden flex justify-end mb-4">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-2"
              aria-label="Cerrar menú"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <nav className="space-y-2">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  location.pathname === item.path
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.name}</span>
              </Link>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
};

export const DashboardLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 p-3 sm:p-4 lg:p-6 w-full lg:w-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
