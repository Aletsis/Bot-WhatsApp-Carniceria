import express from 'express';
import * as healthController from '../controllers/healthController.js';

const router = express.Router();

/**
 * Rutas de Health Check
 * 
 * Todas las rutas son públicas (no requieren autenticación)
 * para permitir monitoreo externo y health checks de load balancers
 */

/**
 * GET /health
 * Health check completo del sistema
 * Verifica estado de todos los servicios
 * Retorna 200 si el sistema está saludable, 503 si hay problemas
 */
router.get('/', healthController.getHealth);

/**
 * GET /health/live
 * Liveness probe - verifica que el servidor esté vivo
 * Retorna 200 siempre que el servidor responda
 * Usado por Kubernetes/Docker para reiniciar contenedores no responsivos
 */
router.get('/live', healthController.getLiveness);

/**
 * GET /health/ready
 * Readiness probe - verifica que el sistema esté listo para tráfico
 * Retorna 200 si puede procesar requests, 503 si no está listo
 * Usado por load balancers para routing de tráfico
 */
router.get('/ready', healthController.getReadiness);

export default router;
