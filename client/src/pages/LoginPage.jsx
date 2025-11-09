import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input } from '../components/common';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated, getDefaultPage } = useAuth();

  // Si ya está autenticado, redirigir a su página por defecto
  if (isAuthenticated) {
    return <Navigate to={getDefaultPage()} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(username, password);
      if (!result.success) {
        setError(result.message || 'Credenciales inválidas');
      }
    } catch (err) {
      setError('Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100" style={{backgroundColor: '#fef2f2', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-2xl" style={{maxWidth: '28rem', width: '100%', padding: '2rem', backgroundColor: 'white', borderRadius: '0.75rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'}}>
        <div className="text-center" style={{textAlign: 'center'}}>
          <h1 className="text-4xl font-bold text-gray-900" style={{fontSize: '2.25rem', fontWeight: 'bold', color: '#111827'}}>🥩</h1>
          <h2 className="mt-4 text-3xl font-extrabold text-gray-900" style={{marginTop: '1rem', fontSize: '1.875rem', fontWeight: '800', color: '#111827'}}>
            Carnicería La Blanquita
          </h2>
          <p className="mt-2 text-sm text-gray-600" style={{marginTop: '0.5rem', fontSize: '0.875rem', color: '#4b5563'}}>
            Inicia sesión para acceder al panel de control
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit} style={{marginTop: '2rem'}}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm" style={{backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '0.75rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem'}}>
              {error}
            </div>
          )}

          <div className="space-y-4" style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            <Input
              label="Usuario"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ingresa tu usuario"
              required
              autoFocus
            />

            <Input
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingresa tu contraseña"
              required
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </Button>

          <div className="text-center text-sm text-gray-600">
            <p>Usuario por defecto: <strong>admin</strong></p>
            <p>Contraseña por defecto: <strong>admin123</strong></p>
          </div>
        </form>
      </div>
    </div>
  );
}
