import { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout';
import { Button, Card, Loading, Badge } from '../components/common';
import { conversacionesService } from '../api/services';

export default function ConversacionesPage() {
  const [conversaciones, setConversaciones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversaciones();
  }, []);

  const loadConversaciones = async () => {
    try {
      setLoading(true);
      const data = await conversacionesService.getAll();
      setConversaciones(data);
    } catch (error) {
      console.error('Error al cargar conversaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEstadoBadge = (estado) => {
    const variants = {
      START: 'default',
      MENU: 'info',
      ASK_NAME: 'warning',
      ASK_ADDRESS: 'warning',
      TAKING_ORDER: 'primary',
      AWAITING_CONFIRM: 'success',
    };
    return <Badge variant={variants[estado] || 'default'}>{estado}</Badge>;
  };

  const getEstadoLabel = (estado) => {
    const labels = {
      START: 'Inicio',
      MENU: 'Menú Principal',
      ASK_NAME: 'Preguntando Nombre',
      ASK_ADDRESS: 'Preguntando Dirección',
      TAKING_ORDER: 'Tomando Pedido',
      AWAITING_CONFIRM: 'Esperando Confirmación',
    };
    return labels[estado] || estado;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">💬 Conversaciones</h1>
          <Button variant="primary" onClick={() => loadConversaciones()}>
            🔄 Actualizar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <p className="text-sm text-gray-600">Total Conversaciones</p>
            <p className="text-3xl font-bold text-primary-600">
              {conversaciones.length}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-gray-600">En Proceso de Pedido</p>
            <p className="text-3xl font-bold text-green-600">
              {
                conversaciones.filter(
                  (c) => c.Estado === 'TAKING_ORDER' || c.Estado === 'AWAITING_CONFIRM'
                ).length
              }
            </p>
          </Card>
        </div>

        {/* Lista de Conversaciones */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loading size="lg" />
          </div>
        ) : conversaciones.length === 0 ? (
          <Card>
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">No hay conversaciones activas</p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4">
            {conversaciones.map((conv) => (
              <Card key={conv.NumeroTelefono} className="hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">
                        {conv.NumeroTelefono}
                      </h3>
                      {getEstadoBadge(conv.Estado)}
                    </div>
                    <div className="space-y-2 text-sm">
                      <p className="text-gray-600">
                        <strong>Estado:</strong> {getEstadoLabel(conv.Estado)}
                      </p>
                      {conv.NombreTemporal && (
                        <p className="text-gray-600">
                          <strong>Nombre:</strong> {conv.NombreTemporal}
                        </p>
                      )}
                      <p className="text-gray-600">
                        <strong>Última Interacción:</strong>{' '}
                        {new Date(conv.UltimaInteraccion).toLocaleString('es-MX')}
                      </p>
                      {conv.Buffer && (
                        <div>
                          <p className="text-gray-600 font-semibold">Buffer:</p>
                          <div className="mt-1 bg-gray-50 p-3 rounded text-xs">
                            <pre className="whitespace-pre-wrap">
                              {JSON.stringify(JSON.parse(conv.Buffer), null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
