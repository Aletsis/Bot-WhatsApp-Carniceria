import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import debug from 'debug';
import webhookRouter from './routes/webhook.js';
import { getPool, getPoolInstance } from './services/dbService.js';
import { gracefulShutdown } from './helpers/shutdownHelper.js';

dotenv.config();

function checkEnv() {
    const required = ['DB_HOST','DB_USER','DB_PASS','DB_NAME','PHONE_NUMBER_ID','WHATSAPP_TOKEN'];
    const missing = required.filter(k => !process.env[k]);
    if (missing.length) {
      console.error('❌ Faltan variables de entorno:', missing.join(', '));
      process.exit(1);
    }
}
checkEnv();

const log = debug('carnibot:app');
const app = express();
app.use(bodyParser.json());


app.get('/', (req, res) => res.send('Carniceria WhatsApp Bot is RUNNING'));
app.use('/webhook', webhookRouter);


const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});

// Inicializar conexión a BD
getPool().catch(err => {
  console.error('❌ Error al inicializar la BD:', err.message);
  process.exit(1);
});

/* -------------------
   Handlers globales
------------------- */
process.on('unhandledRejection', (reason, promise) => {
  console.error('[unhandledRejection] Razón:', reason);
  gracefulShutdown({ server, pool: getPoolInstance() });
});

process.on('uncaughtException', err => {
  console.error('[uncaughtException] Error no capturado:', err);
  gracefulShutdown({ server, pool: getPoolInstance() });
});

// Señales del sistema (Ctrl+C o kill)
process.on('SIGINT', () => gracefulShutdown({ server, pool: getPoolInstance() }));
process.on('SIGTERM', () => gracefulShutdown({ server, pool: getPoolInstance() }));