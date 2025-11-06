import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-primary-600">
              🥩 Carnicería Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-700">
              Hola, <span className="font-semibold">{user?.nombre || user?.username}</span>
            </span>
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary-100 text-primary-800">
              {user?.rol}
            </span>
            <button
              onClick={logout}
              className="text-sm text-gray-700 hover:text-primary-600 font-medium"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export const Sidebar = () => {
  const location = useLocation();
  const { isAdmin } = useAuth();

  const menuItems = [
    {
      name: 'Pedidos',
      path: '/dashboard/pedidos',
      icon: '📦',
    },
    {
      name: 'Clientes',
      path: '/dashboard/clientes',
      icon: '👥',
    },
    {
      name: 'Conversaciones',
      path: '/dashboard/conversaciones',
      icon: '💬',
    },
  ];

  if (isAdmin) {
    menuItems.push({
      name: 'Usuarios',
      path: '/dashboard/usuarios',
      icon: '👤',
    });
  }

  return (
    <aside className="w-64 bg-gray-800 min-h-screen">
      <div className="p-4">
        <nav className="space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
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
  );
};

export const DashboardLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
