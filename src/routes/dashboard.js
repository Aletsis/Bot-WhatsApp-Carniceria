import express from 'express';
import * as dashboardController from '../controllers/dashboardController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// API endpoints públicos (sin autenticación)
router.get('/check-auth', dashboardController.checkAuth);

// Aplicar autenticación a todas las rutas del dashboard
router.use(requireAuth);

// Servir el HTML del dashboard
router.get('/', (req, res) => {
  res.sendFile('index.html', { root: './src/public' });
});

// API endpoints - Pedidos
router.get('/pedidos', dashboardController.getPedidosRecientes);
router.put('/pedidos/:pedidoId', dashboardController.updateEstadoPedido);
router.put('/pedidos/:pedidoId/estado', dashboardController.updateEstadoPedidoNuevo);

// API endpoints - Clientes
router.get('/clientes', dashboardController.getClientes);
router.post('/clientes', requireRole(['admin', 'editor']), dashboardController.createCliente);
router.put('/clientes/:clienteId', requireRole(['admin', 'editor']), dashboardController.updateCliente);
router.delete('/clientes/:clienteId', requireRole(['admin', 'editor']), dashboardController.updateCliente);
router.get('/clientes/:clienteId/pedidos', dashboardController.getPedidosCliente);

// API endpoints - Conversaciones
router.get('/conversaciones', dashboardController.getSesionesActivas);

// API endpoints - Usuarios (solo para admins)
router.get('/usuarios', requireRole('admin'), dashboardController.getUsuarios);
router.post('/usuarios', requireRole('admin'), dashboardController.createUsuario);
router.put('/usuarios/:usuarioId/password', requireRole('admin'), dashboardController.cambiarPassword);
router.put('/usuarios/:usuarioId/estado', requireRole('admin'), dashboardController.toggleUsuario);

export default router;