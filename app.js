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
import { getPool, getPoolInstance } from './src/services/dbService.js';
import { initializeDatabase, checkSqlServerConnection } from './src/services/dbInitService.js';
import { gracefulShutdown } from './src/helpers/shutdownHelper.js';
import logger from './src/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

function checkEnv() {
    const required = ['DB_HOST','DB_USER','DB_PASS','DB_NAME','PHONE_NUMBER_ID','WHATSAPP_TOKEN'];
    const missing = required.filter(k => !process.env[k]);
    if (missing.length) {
      logger.error('❌ Faltan variables de entorno:', missing.join(', '));
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
  secret: process.env.SESSION_SECRET || 'carniceria-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction, // Solo HTTPS en producción
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

// Rate limiting global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
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
app.use(bodyParser.json());
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

// Rutas públicas API
app.use('/webhook', webhookLimiter, webhookRouter);
app.use('/auth', authRouter); // Login/Logout

// Rutas protegidas API
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
    await checkSqlServerConnection();
    await initializeDatabase();
    await getPool();
    logger.info('🚀 Aplicación inicializada correctamente');
  } catch (err) {
    logger.error('❌ Error al inicializar:', err.message);
    process.exit(1);
  }
}

initApp();

// Handlers globales
process.on('unhandledRejection', (reason) => {
  logger.error('[unhandledRejection] Razón:', reason);
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