import express from 'express';
import * as dashboardController from '../controllers/dashboardController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Aplicar autenticación a todas las rutas del dashboard
router.use(requireAuth);

// Servir el HTML del dashboard
router.get('/', (req, res) => {
  res.sendFile('index.html', { root: './src/public' });
});

// API endpoints - Pedidos
router.get('/api/stats', dashboardController.getStats);
router.get('/api/pedidos', dashboardController.getPedidosRecientes);
router.put('/api/pedidos/:pedidoId', dashboardController.updateEstadoPedido);
router.put('/api/pedidos/:pedidoId/estado', dashboardController.updateEstadoPedidoNuevo);

// API endpoints - Clientes
router.get('/api/clientes', dashboardController.getClientes);
router.post('/api/clientes', dashboardController.createCliente);
router.put('/api/clientes/:clienteId', dashboardController.updateCliente);
router.get('/api/clientes/:clienteId/pedidos', dashboardController.getPedidosCliente);

// API endpoints - Sesiones
router.get('/api/sesiones', dashboardController.getSesionesActivas);

// API endpoints - Usuarios (solo para admins)
router.get('/api/usuarios', requireRole('admin'), dashboardController.getUsuarios);
router.post('/api/usuarios', requireRole('admin'), dashboardController.createUsuario);
router.put('/api/usuarios/:usuarioId/password', requireRole('admin'), dashboardController.cambiarPassword);
router.put('/api/usuarios/:usuarioId/toggle', requireRole('admin'), dashboardController.toggleUsuario);

export default router;