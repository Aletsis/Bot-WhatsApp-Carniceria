import { authenticateUser } from '../middleware/auth.js';
import logger from '../logger.js';

/**
 * Renderiza la página de login
 */
export function showLoginForm(req, res) {
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Login - Dashboard Carnicería</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
        }
        .login-container {
          background: white;
          padding: 40px;
          border-radius: 10px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          width: 100%;
          max-width: 400px;
        }
        h1 {
          text-align: center;
          color: #2c3e50;
          margin-bottom: 30px;
          font-size: 28px;
        }
        .form-group {
          margin-bottom: 20px;
        }
        label {
          display: block;
          margin-bottom: 8px;
          color: #555;
          font-weight: 500;
        }
        input {
          width: 100%;
          padding: 12px;
          border: 2px solid #e0e0e0;
          border-radius: 5px;
          font-size: 16px;
          transition: border-color 0.3s;
        }
        input:focus {
          outline: none;
          border-color: #667eea;
        }
        button {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 5px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: transform 0.2s;
        }
        button:hover {
          transform: translateY(-2px);
        }
        .error {
          background: #fee;
          color: #c33;
          padding: 12px;
          border-radius: 5px;
          margin-bottom: 20px;
          border-left: 4px solid #c33;
        }
        .info {
          background: #e3f2fd;
          color: #1976d2;
          padding: 12px;
          border-radius: 5px;
          margin-top: 20px;
          font-size: 14px;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="login-container">
        <h1>🥩 Dashboard Carnicería</h1>
        ${req.query.error ? '<div class="error">❌ Usuario o contraseña incorrectos</div>' : ''}
        <form method="POST" action="/login">
          <div class="form-group">
            <label for="username">👤 Usuario</label>
            <input type="text" id="username" name="username" required autofocus>
          </div>
          <div class="form-group">
            <label for="password">🔒 Contraseña</label>
            <input type="password" id="password" name="password" required>
          </div>
          <button type="submit">Iniciar Sesión</button>
        </form>
        <div class="info">
          <strong>Credenciales de prueba:</strong><br>
          Usuario: <code>admin</code> | Contraseña: <code>admin123</code>
        </div>
      </div>
    </body>
    </html>
  `);
}

/**
 * Procesa el login
 */
export async function processLogin(req, res) {
  try {
    const { username, password } = req.body;
    
    // Validar campos
    if (!username || !password) {
      return res.redirect('/login?error=missing_fields');
    }
    
    // Autenticar usuario
    const user = await authenticateUser(username, password);
    
    if (!user) {
      return res.redirect('/login?error=invalid_credentials');
    }
    
    // Crear sesión
    req.session.user = user;
    req.session.loginTime = new Date();
    
    logger.info('✅ Login exitoso: %s', username);
    res.redirect('/dashboard');
    
  } catch (err) {
    logger.error('❌ Error en login:', err);
    res.redirect('/login?error=server_error');
  }
}

/**
 * Cierra la sesión
 */
export function logout(req, res) {
  const username = req.session?.user?.username;
  
  req.session.destroy(err => {
    if (err) {
      logger.error('❌ Error al cerrar sesión:', err);
      return res.redirect('/dashboard');
    }
    
    logger.info('👋 Logout: %s', username);
    res.redirect('/login');
  });
}