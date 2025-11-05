import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import webhookRouter from './src/routes/webhook.js';
import { getPool, getPoolInstance } from './src/services/dbService.js';
import { initializeDatabase, checkSqlServerConnection } from './src/services/dbInitService.js';
import { gracefulShutdown } from './src/helpers/shutdownHelper.js';
import logger from './src/logger.js';

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

// Rate limiting global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests por ventana
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('🚨 Rate limit excedido desde IP: %s', req.ip);
    res.status(429).json({ error: 'Too many requests, please try again later.' });
  }
});

// Rate limiting específico para webhook
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 30, // 30 mensajes por minuto por IP
  message: { error: 'Too many webhook requests' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('🚨 Webhook rate limit excedido desde: %s', req.ip);
    res.status(429).json({ error: 'Too many webhook requests' });
  }
});

// Aplicar middlewares
app.use(globalLimiter);
app.use(bodyParser.json());

// Rutas
app.get('/', (req, res) => res.send('Carniceria WhatsApp Bot is RUNNING'));
app.use('/webhook', webhookLimiter, webhookRouter);

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    logger.info('✅ Servidor corriendo en http://localhost:%s', PORT);
});

// Inicializar base de datos automáticamente
async function initApp() {
  try {
    await checkSqlServerConnection();
    await initializeDatabase();
    await getPool();
    
    logger.info('🚀 Aplicación inicializada correctamente');
  } catch (err) {
    logger.error('❌ Error al inicializar la aplicación:', err.message);
    process.exit(1);
  }
}

initApp();

/* -------------------
   Handlers globales
------------------- */
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