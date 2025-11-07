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
router.post('/pedidos/:pedidoId/reimprimir', requireRole(['admin', 'editor']), dashboardController.reimprimirPedido);

// API endpoints - Clientes
router.get('/clientes', dashboardController.getClientes);
router.post('/clientes', requireRole(['admin', 'editor']), dashboardController.createCliente);
router.put('/clientes/:clienteId', requireRole(['admin', 'editor']), dashboardController.updateCliente);
router.delete('/clientes/:clienteId', requireRole(['admin', 'editor']), dashboardController.updateCliente);
router.get('/clientes/:clienteId/pedidos', dashboardController.getPedidosCliente);

// API endpoints - Conversaciones
router.get('/conversaciones', dashboardController.getSesionesActivas);

// API endpoints - Chats (Historial de Mensajes)
router.get('/chats', dashboardController.getConversationList);
router.get('/chats/search', dashboardController.searchMessages);
router.get('/chats/search-conversations', dashboardController.searchConversations);
router.get('/chats/stats', dashboardController.getMessageStats);
router.get('/chats/:telefono', dashboardController.getMessageHistory);
router.post('/chats/:telefono/mark-read', dashboardController.markMessagesAsRead);
router.post('/chats/:telefono/send', dashboardController.sendMessageToClient);

// API endpoints - Usuarios (solo para admins)
router.get('/usuarios', requireRole('admin'), dashboardController.getUsuarios);
router.post('/usuarios', requireRole('admin'), dashboardController.createUsuario);
router.put('/usuarios/:usuarioId/password', requireRole('admin'), dashboardController.cambiarPassword);
router.put('/usuarios/:usuarioId/estado', requireRole('admin'), dashboardController.toggleUsuario);

// API endpoints - Configuraciones (solo para admins)
router.get('/configuraciones', requireRole('admin'), dashboardController.getConfiguraciones);
router.put('/configuraciones', requireRole('admin'), dashboardController.updateConfiguraciones);
router.get('/configuraciones/:categoria', requireRole('admin'), dashboardController.getConfiguracionesPorCategoria);

export default router;