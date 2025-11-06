import { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout';
import { Button, Select, Badge, Card, Loading, Modal } from '../components/common';
import { pedidosService } from '../api/services';
import { useAuth } from '../contexts/AuthContext';

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const { isEditor } = useAuth();

  useEffect(() => {
    loadPedidos();
  }, [filtroEstado]);

  const loadPedidos = async () => {
    try {
      setLoading(true);
      const data = await pedidosService.getAll(filtroEstado);
      setPedidos(data);
    } catch (error) {
      console.error('Error al cargar pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEstado = async (pedidoId, nuevoEstado) => {
    try {
      await pedidosService.updateEstado(pedidoId, nuevoEstado);
      await loadPedidos();
      alert('Estado actualizado correctamente');
    } catch (error) {
      alert('Error al actualizar estado');
    }
  };

  const getEstadoBadge = (estado) => {
    const variants = {
      'En espera de surtir': 'warning',
      'En ruta': 'info',
      'Entregado': 'success',
    };
    return <Badge variant={variants[estado] || 'default'}>{estado}</Badge>;
  };

  const viewDetails = (pedido) => {
    setSelectedPedido(pedido);
    setShowModal(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">📦 Pedidos</h1>
          <Button variant="primary" onClick={() => loadPedidos()}>
            🔄 Actualizar
          </Button>
        </div>

        {/* Filtros */}
        <Card>
          <div className="flex gap-4 items-end">
            <Select
              label="Filtrar por Estado"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              options={[
                { value: '', label: 'Todos los pedidos' },
                { value: 'En espera de surtir', label: 'En espera de surtir' },
                { value: 'En ruta', label: 'En ruta' },
                { value: 'Entregado', label: 'Entregado' },
              ]}
              className="flex-1"
            />
            <div className="text-sm text-gray-600">
              <strong>{pedidos.length}</strong> pedidos encontrados
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
          <div className="grid gap-4">
            {pedidos.map((pedido) => (
              <Card key={pedido.PedidoID} className="hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">
                        {pedido.Folio}
                      </h3>
                      {getEstadoBadge(pedido.Estado)}
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>
                        <strong>Cliente:</strong> {pedido.NombreCliente}
                      </p>
                      <p>
                        <strong>Teléfono:</strong> {pedido.NumeroTelefono}
                      </p>
                      <p>
                        <strong>Fecha:</strong>{' '}
                        {new Date(pedido.Fecha).toLocaleString('es-MX')}
                      </p>
                      <p className="mt-2">
                        <strong>Contenido:</strong>
                      </p>
                      <p className="text-gray-700 bg-gray-50 p-2 rounded">
                        {pedido.Contenido.length > 150
                          ? pedido.Contenido.substring(0, 150) + '...'
                          : pedido.Contenido}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewDetails(pedido)}
                    >
                      Ver Detalles
                    </Button>
                    {isEditor && pedido.Estado !== 'Entregado' && (
                      <Select
                        value={pedido.Estado}
                        onChange={(e) =>
                          handleUpdateEstado(pedido.PedidoID, e.target.value)
                        }
                        options={[
                          { value: 'En espera de surtir', label: 'En espera' },
                          { value: 'En ruta', label: 'En ruta' },
                          { value: 'Entregado', label: 'Entregado' },
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
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cerrar
          </Button>
        }
      >
        {selectedPedido && (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-500">Estado</p>
              <div className="mt-1">{getEstadoBadge(selectedPedido.Estado)}</div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Cliente</p>
              <p className="mt-1 text-gray-900">{selectedPedido.NombreCliente}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Teléfono</p>
              <p className="mt-1 text-gray-900">{selectedPedido.NumeroTelefono}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Fecha</p>
              <p className="mt-1 text-gray-900">
                {new Date(selectedPedido.Fecha).toLocaleString('es-MX')}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Contenido del Pedido</p>
              <p className="mt-1 text-gray-900 bg-gray-50 p-3 rounded whitespace-pre-wrap">
                {selectedPedido.Contenido}
              </p>
            </div>
            {selectedPedido.Notas && (
              <div>
                <p className="text-sm font-medium text-gray-500">Notas</p>
                <p className="mt-1 text-gray-900">{selectedPedido.Notas}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
