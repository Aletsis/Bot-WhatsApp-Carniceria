import express from 'express';
import bodyParser from 'body-parser';
import session from 'express-session';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import webhookRouter from './src/routes/webhook.js';
import dashboardRouter from './src/routes/dashboard.js';
import authRouter from './src/routes/auth.js';
import healthRouter from './src/routes/health.js';
import { getPool, getPoolInstance } from './src/services/dbService.js';
import { initializeDatabase, checkSqlServerConnection } from './src/services/dbInitService.js';
import { gracefulShutdown } from './src/helpers/shutdownHelper.js';
import { restoreActiveTimeouts, startCleanupJob } from './src/services/sessionTimeoutService.js';
import { captureRawBody, validateWebhookSecurityConfig } from './src/middleware/webhookVerification.js';
import logger from './src/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

function checkEnv() {
    const required = [
      'DB_HOST',
      'DB_USER',
      'DB_PASS',
      'DB_NAME',
      'PHONE_NUMBER_ID',
      'WHATSAPP_TOKEN',
      'SESSION_SECRET',
      'WEBHOOK_VERIFY_TOKEN'
    ];
    const missing = required.filter(k => !process.env[k]);
    if (missing.length) {
      logger.error('❌ Faltan variables de entorno:', missing.join(', '));
      logger.error('💡 Asegúrate de tener un archivo .env con todas las variables requeridas');
      process.exit(1);
    }
    
    // Validar longitud mínima del SESSION_SECRET
    if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) {
      logger.error('❌ SESSION_SECRET debe tener al menos 32 caracteres');
      logger.error('💡 Genera uno con: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
      process.exit(1);
    }
}
checkEnv();

const app = express();

// Configurar trust proxy
const isProduction = process.env.NODE_ENV === 'production';
app.set('trust proxy', isProduction ? 1 : 'loopback');

// Configurar sesiones
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction, // Solo HTTPS en producción
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    sameSite: isProduction ? 'strict' : 'lax' // 'lax' en desarrollo para que funcione con Vite proxy
  }
}));

// Rate limiting global (más permisivo en desarrollo)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: isProduction ? 100 : 1000, // 1000 en desarrollo, 100 en producción
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  skip: (req) => {
    // En desarrollo, no aplicar rate limit a localhost
    if (!isProduction && (req.ip === '::1' || req.ip === '127.0.0.1' || req.ip === '::ffff:127.0.0.1')) {
      return true;
    }
    return false;
  },
  handler: (req, res) => {
    logger.warn('🚨 Rate limit excedido desde IP: %s', req.ip);
    res.status(429).json({ error: 'Too many requests, please try again later.' });
  }
});

// Rate limiting para webhook
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: { error: 'Too many webhook requests' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  handler: (req, res) => {
    logger.warn('🚨 Webhook rate limit excedido desde: %s', req.ip);
    res.status(429).json({ error: 'Too many webhook requests' });
  }
});

// Aplicar middlewares
app.use(globalLimiter);

// Configurar body parser con captura de raw body para verificación de firma
// IMPORTANTE: verify() se ejecuta ANTES de parsear el JSON
app.use(bodyParser.json({ verify: captureRawBody }));
app.use(bodyParser.urlencoded({ extended: true })); // Para procesar forms

// Servir archivos estáticos del dashboard React (producción)
if (isProduction) {
  const clientBuildPath = path.join(__dirname, 'client', 'dist');
  app.use(express.static(clientBuildPath));
  logger.info('📦 Sirviendo dashboard React desde:', clientBuildPath);
} else {
  // En desarrollo, el cliente React se sirve en puerto 5173 con Vite
  logger.info('🔧 Modo desarrollo: Dashboard React en http://localhost:5173');
}

// Rutas públicas (sin autenticación)
app.use('/health', healthRouter); // Health checks para monitoreo

// Rutas públicas API
app.use('/webhook', webhookLimiter, webhookRouter);

// Rutas de API para React (con prefijo /api)
app.use('/api/auth', authRouter); // Login/Logout
app.use('/api/dashboard', dashboardRouter); // Dashboard endpoints

// Rutas legacy (para retrocompatibilidad)
app.use('/auth', authRouter);
app.use('/dashboard', dashboardRouter);

// En producción, cualquier ruta no encontrada sirve el index.html del React app
if (isProduction) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({ 
      message: 'Carniceria WhatsApp Bot API',
      dashboard: 'http://localhost:5173'
    });
  });
}

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    logger.info('✅ Servidor corriendo en http://localhost:%s', PORT);
});

// Inicializar base de datos
async function initApp() {
  try {
    // Primero inicializar el pool global a la BD principal
    await getPool();
    logger.info('[DB Init] 🔌 Pool de conexión inicializado');
    
    // Ahora podemos inicializar la base de datos que usará el pool compartido
    await initializeDatabase();
    
    // Validar configuración de seguridad del webhook
    logger.info('🔐 Validando configuración de seguridad...');
    validateWebhookSecurityConfig();
    
    // Restaurar timeouts activos desde BD (sobrevivir a reinicios)
    await restoreActiveTimeouts();
    
    // Iniciar job de limpieza periódica de sesiones abandonadas
    startCleanupJob();
    
    logger.info('🚀 Aplicación inicializada correctamente');
  } catch (err) {
    logger.error('❌ Error al inicializar:', err.message);
    console.error('[INIT] Error completo:', err);
    process.exit(1);
  }
}

initApp();

// Handlers globales
process.on('unhandledRejection', (reason, promise) => {
  console.error('[unhandledRejection] Promesa rechazada:', promise);
  console.error('[unhandledRejection] Razón completa:', reason);
  if (reason instanceof Error) {
    logger.error('[unhandledRejection] Error: %s', reason.message);
    logger.error('[unhandledRejection] Stack: %s', reason.stack);
  } else {
    logger.error('[unhandledRejection] Razón:', reason);
  }
  gracefulShutdown({ server, pool: getPoolInstance() });
});

process.on('uncaughtException', err => {
  console.error('[uncaughtException] Error completo:', err);
  logger.error('[uncaughtException] Error no capturado:', err.message);
  logger.error('[uncaughtException] Stack:', err.stack);
  gracefulShutdown({ server, pool: getPoolInstance() });
});

process.on('SIGINT', () => gracefulShutdown({ server, pool: getPoolInstance() }));
process.on('SIGTERM', () => gracefulShutdown({ server, pool: getPoolInstance() }));
