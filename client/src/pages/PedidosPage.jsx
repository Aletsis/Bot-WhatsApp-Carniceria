import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout';
import { Button, Select, Badge, Card, Loading, Modal, Input } from '../components/common';
import { pedidosService } from '../api/services';
import { useAuth } from '../contexts/AuthContext';

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const { canEdit, canManageOrders, getDefaultPage, user } = useAuth();

  // Si no puede gestionar pedidos, redirigir a su página por defecto
  if (!canManageOrders) {
    return <Navigate to={getDefaultPage()} replace />;
  }

  useEffect(() => {
    loadPedidos();
  }, [filtroEstado, fechaInicio, fechaFin]);

  const loadPedidos = async () => {
    try {
      setLoading(true);
      const data = await pedidosService.getAll(filtroEstado, fechaInicio, fechaFin);
      setPedidos(data);
    } catch (error) {
      console.error('Error al cargar pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEstado = async (pedidoId, nuevoEstado) => {
    try {
      const response = await pedidosService.updateEstado(pedidoId, nuevoEstado);
      await loadPedidos();
      
      // Mostrar mensaje de éxito
      alert(response.message || 'Estado actualizado correctamente');
    } catch (error) {
      // Mostrar mensaje de error detallado
      const errorMsg = error.response?.data?.error || error.message || 'Error al actualizar estado';
      console.error('Error completo:', error);
      alert(`Error: ${errorMsg}`);
    }
  };

  const handleReimprimir = async (pedidoId) => {
    if (!confirm('¿Deseas reimprimir este ticket?')) {
      return;
    }

    try {
      const response = await pedidosService.reimprimir(pedidoId);
      await loadPedidos();
      alert(response.message || 'Ticket reimpreso correctamente');
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || 'Error al reimprimir';
      console.error('Error completo:', error);
      alert(`Error: ${errorMsg}`);
    }
  };

  const getEstadoBadge = (estado) => {
    const variants = {
      'En espera de surtir': 'warning',
      'En ruta': 'info',
      'Entregado': 'success',
      'Cancelado': 'danger',
    };
    return <Badge variant={variants[estado] || 'default'}>{estado}</Badge>;
  };

  const getEstadoImpresionBadge = (estadoImpresion) => {
    if (!estadoImpresion) return null;
    
    const config = {
      'Pendiente': { variant: 'warning', icon: '⏳', label: 'Impresión pendiente' },
      'Impreso': { variant: 'success', icon: '✅', label: 'Impreso' },
      'Error': { variant: 'danger', icon: '❌', label: 'Error de impresión' },
      'NoRequerida': { variant: 'default', icon: 'ℹ️', label: 'No requiere impresión' },
      'Reimprimiendo': { variant: 'info', icon: '🔄', label: 'Reimprimiendo...' },
    };
    
    const info = config[estadoImpresion] || { variant: 'default', icon: '❓', label: estadoImpresion };
    
    return (
      <Badge variant={info.variant} className="text-xs">
        {info.icon} {info.label}
      </Badge>
    );
  };

  const viewDetails = (pedido) => {
    setSelectedPedido(pedido);
    setShowModal(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">📦 Pedidos</h1>
          <Button variant="primary" onClick={() => loadPedidos()} size="sm" className="sm:size-md">
            🔄 Actualizar
          </Button>
        </div>

        {/* Filtros */}
        <Card>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <Select
                label="Filtrar por Estado"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                options={[
                  { value: '', label: 'Todos los pedidos' },
                  { value: 'En espera de surtir', label: 'En espera de surtir' },
                  { value: 'En ruta', label: 'En ruta' },
                  { value: 'Entregado', label: 'Entregado' },
                  { value: 'Cancelado', label: 'Cancelado' },
                ]}
              />
              <Input
                type="date"
                label="Fecha Inicio"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
              <Input
                type="date"
                label="Fecha Fin"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="text-sm text-gray-600">
                <strong>{pedidos.length}</strong> pedidos encontrados
              </div>
              {(filtroEstado || fechaInicio || fechaFin) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFiltroEstado('');
                    setFechaInicio('');
                    setFechaFin('');
                  }}
                >
                  🗑️ Limpiar filtros
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Lista de Pedidos */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loading size="lg" />
          </div>
        ) : pedidos.length === 0 ? (
          <Card>
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">No hay pedidos para mostrar</p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-3 sm:gap-4">
            {pedidos.map((pedido) => (
              <Card key={pedido.PedidoID} className="hover:shadow-lg transition-shadow">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                  <div className="flex-1 w-full sm:w-auto">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900">
                        {pedido.Folio}
                      </h3>
                      {getEstadoBadge(pedido.Estado)}
                      {pedido.EstadoImpresion && getEstadoImpresionBadge(pedido.EstadoImpresion)}
                    </div>
                    <div className="space-y-1 text-xs sm:text-sm text-gray-600">
                      <p>
                        <strong>Cliente:</strong> {pedido.NombreCliente}
                      </p>
                      <p>
                        <strong>Teléfono:</strong> {pedido.NumeroTelefono}
                      </p>
                      <p>
                        <strong>Fecha:</strong>{' '}
                        {new Date(pedido.Fecha).toLocaleString('es-MX', {
                          dateStyle: 'short',
                          timeStyle: 'short'
                        })}
                      </p>
                      <p className="mt-2">
                        <strong>Contenido:</strong>
                      </p>
                      <p className="text-gray-700 bg-gray-50 p-2 rounded text-xs sm:text-sm">
                        {pedido.Contenido && pedido.Contenido.length > 100
                          ? pedido.Contenido.substring(0, 100) + '...'
                          : pedido.Contenido || 'Sin contenido'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto sm:ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewDetails(pedido)}
                      className="flex-1 sm:flex-none"
                    >
                      Ver Detalles
                    </Button>
                    {canEdit && (pedido.EstadoImpresion === 'Error' || pedido.EstadoImpresion === 'Pendiente') && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleReimprimir(pedido.PedidoID)}
                        className="flex-1 sm:flex-none"
                      >
                        🖨️ Reimprimir
                      </Button>
                    )}
                    {canEdit && pedido.Estado !== 'Entregado' && pedido.Estado !== 'Cancelado' && (
                      <Select
                        value={pedido.Estado}
                        onChange={(e) =>
                          handleUpdateEstado(pedido.PedidoID, e.target.value)
                        }
                        options={[
                          { value: 'En espera de surtir', label: 'En espera' },
                          { value: 'En ruta', label: 'En ruta' },
                          { value: 'Entregado', label: 'Entregado' },
                          { value: 'Cancelado', label: 'Cancelado' },
                        ]}
                        className="text-sm"
                      />
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Detalles */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={`Pedido ${selectedPedido?.Folio}`}
        footer={
          <div className="flex gap-2 w-full justify-end">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cerrar
            </Button>
          </div>
        }
      >
        {selectedPedido && (
          <div className="space-y-3 sm:space-y-4">
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
              <p className="text-xs sm:text-sm font-medium text-gray-500 mb-2">Estado del Pedido</p>
              <div className="flex items-center gap-3 flex-wrap">
                {getEstadoBadge(selectedPedido.Estado)}
                {selectedPedido.EstadoImpresion && getEstadoImpresionBadge(selectedPedido.EstadoImpresion)}
              </div>
              
              {/* Mostrar botón de reimprimir en el modal si hay error */}
              {canEdit && (selectedPedido.EstadoImpresion === 'Error' || selectedPedido.EstadoImpresion === 'Pendiente') && (
                <div className="mt-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      handleReimprimir(selectedPedido.PedidoID);
                      setShowModal(false);
                    }}
                  >
                    🖨️ Reimprimir Ticket
                  </Button>
                  {selectedPedido.ErrorImpresion && (
                    <p className="text-xs text-red-600 mt-2">
                      Error: {selectedPedido.ErrorImpresion}
                    </p>
                  )}
                </div>
              )}
              
              {/* Selector de cambio de estado */}
              {selectedPedido.Estado !== 'Entregado' && selectedPedido.Estado !== 'Cancelado' && (
                <div className="mt-3">
                  {canEdit ? (
                    <>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                        Cambiar estado:
                      </label>
                      <Select
                        value={selectedPedido.Estado}
                        onChange={(e) => {
                          handleUpdateEstado(selectedPedido.PedidoID, e.target.value);
                          setShowModal(false);
                        }}
                        options={[
                          { value: 'En espera de surtir', label: '📋 En espera de surtir' },
                          { value: 'En ruta', label: '🚚 En ruta' },
                          { value: 'Entregado', label: '✅ Entregado' },
                          { value: 'Cancelado', label: '❌ Cancelado' },
                        ]}
                      />
                    </>
                  ) : (
                    <p className="text-xs text-gray-500 mt-2">
                      ℹ️ Solo los editores pueden cambiar el estado del pedido
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-500">Cliente</p>
                <p className="mt-1 text-sm sm:text-base text-gray-900 font-medium">{selectedPedido.NombreCliente}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-500">Teléfono</p>
                <p className="mt-1 text-sm sm:text-base text-gray-900">
                  <a href={`tel:${selectedPedido.NumeroTelefono}`} className="text-primary-600 hover:underline">
                    {selectedPedido.NumeroTelefono}
                  </a>
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">Fecha de Pedido</p>
              <p className="mt-1 text-sm sm:text-base text-gray-900">
                {new Date(selectedPedido.Fecha).toLocaleString('es-MX', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>

            <div className="border-t pt-3 sm:pt-4">
              <p className="text-xs sm:text-sm font-medium text-gray-700 mb-2">📝 Contenido del Pedido</p>
              <div className="bg-blue-50 border border-blue-200 p-3 sm:p-4 rounded-lg">
                <p className="text-xs sm:text-sm text-gray-900 whitespace-pre-wrap">
                  {selectedPedido.Contenido || 'Sin contenido especificado'}
                </p>
              </div>
            </div>

            {selectedPedido.Notas && (
              <div className="border-t pt-3 sm:pt-4">
                <p className="text-xs sm:text-sm font-medium text-gray-700 mb-2">💬 Notas Adicionales</p>
                <div className="bg-yellow-50 border border-yellow-200 p-3 sm:p-4 rounded-lg">
                  <p className="text-xs sm:text-sm text-gray-900">{selectedPedido.Notas}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
