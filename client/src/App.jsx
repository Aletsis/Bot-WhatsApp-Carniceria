import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import PedidosPage from './pages/PedidosPage';
import ClientesPage from './pages/ClientesPage';
import ConversacionesPage from './pages/ConversacionesPage';
import UsuariosPage from './pages/UsuariosPage';
import ConfiguracionPage from './pages/ConfiguracionPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Ruta pública */}
          <Route path="/" element={<LoginPage />} />

          {/* Rutas protegidas */}
          <Route
            path="/dashboard"
            element={<Navigate to="/dashboard/pedidos" replace />}
          />
          <Route
            path="/dashboard/pedidos"
            element={
              <ProtectedRoute>
                <PedidosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/clientes"
            element={
              <ProtectedRoute>
                <ClientesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/conversaciones"
            element={
              <ProtectedRoute>
                <ConversacionesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/usuarios"
            element={
              <ProtectedRoute>
                <UsuariosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/configuracion"
            element={
              <ProtectedRoute>
                <ConfiguracionPage />
              </ProtectedRoute>
            }
          />

          {/* Ruta 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
