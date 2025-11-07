import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout';
import { Button, Input, Card, Loading, Modal, Badge } from '../components/common';
import { clientesService } from '../api/services';
import { useAuth } from '../contexts/AuthContext';

export default function ClientesPage() {
  const { canEdit, getDefaultPage } = useAuth();

  // Si no puede editar, redirigir a su página por defecto
  if (!canEdit) {
    return <Navigate to={getDefaultPage()} replace />;
  }
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [formData, setFormData] = useState({
    numeroTelefono: '',
    nombre: '',
    direccion: '',
  });

  useEffect(() => {
    loadClientes();
  }, []);

  const loadClientes = async () => {
    try {
      setLoading(true);
      const data = await clientesService.getAll();
      setClientes(data);
    } catch (error) {
      console.error('Error al cargar clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setFormData({ numeroTelefono: '', nombre: '', direccion: '' });
    setShowModal(true);
  };

  const openEditModal = (cliente) => {
    setModalMode('edit');
    setSelectedCliente(cliente);
    setFormData({
      numeroTelefono: cliente.NumeroTelefono,
      nombre: cliente.Nombre || '',
      direccion: cliente.Direccion || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalMode === 'create') {
        await clientesService.create(formData);
        alert('Cliente creado exitosamente');
      } else {
        await clientesService.update(selectedCliente.ClienteID, formData);
        alert('Cliente actualizado exitosamente');
      }
      setShowModal(false);
      loadClientes();
    } catch (error) {
      alert('Error al guardar cliente');
    }
  };

  const handleDelete = async (clienteId) => {
    if (!confirm('¿Estás seguro de desactivar este cliente?')) return;
    
    try {
      await clientesService.delete(clienteId);
      alert('Cliente desactivado exitosamente');
      loadClientes();
    } catch (error) {
      alert('Error al desactivar cliente');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">👥 Clientes</h1>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="primary" onClick={() => loadClientes()} size="sm" className="flex-1 sm:flex-none">
              🔄 <span className="hidden sm:inline">Actualizar</span>
            </Button>
            {canEdit && (
              <Button variant="success" onClick={openCreateModal} size="sm" className="flex-1 sm:flex-none">
                ➕ <span className="hidden sm:inline">Nuevo Cliente</span><span className="sm:hidden">Nuevo</span>
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <Card className="p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-600">Total</p>
            <p className="text-xl sm:text-3xl font-bold text-primary-600">{clientes.length}</p>
          </Card>
          <Card className="p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-600">Activos</p>
            <p className="text-xl sm:text-3xl font-bold text-green-600">
              {clientes.filter((c) => c.Activo).length}
            </p>
          </Card>
          <Card className="p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-600">Inactivos</p>
            <p className="text-xl sm:text-3xl font-bold text-gray-600">
              {clientes.filter((c) => !c.Activo).length}
            </p>
          </Card>
        </div>

        {/* Lista de Clientes */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loading size="lg" />
          </div>
        ) : (
          <>
            {/* Vista de tabla para desktop */}
            <Card className="hidden lg:block">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Teléfono
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Nombre
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Dirección
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Estado
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Fecha Alta
                      </th>
                      {canEdit && (
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Acciones
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {clientes.map((cliente) => (
                      <tr key={cliente.ClienteID} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {cliente.NumeroTelefono}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {cliente.Nombre || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {cliente.Direccion || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Badge variant={cliente.Activo ? 'success' : 'default'}>
                            {cliente.Activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(cliente.FechaAlta).toLocaleDateString('es-MX')}
                        </td>
                        {canEdit && (
                          <td className="px-4 py-3 text-sm text-right space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditModal(cliente)}
                            >
                              ✏️ Editar
                            </Button>
                            {cliente.Activo && (
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleDelete(cliente.ClienteID)}
                              >
                                ❌ Desactivar
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Vista de tarjetas para móvil/tablet */}
            <div className="lg:hidden grid gap-3">
              {clientes.map((cliente) => (
                <Card key={cliente.ClienteID} className="p-3 sm:p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900">
                        {cliente.Nombre || 'Sin nombre'}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        <a href={`tel:${cliente.NumeroTelefono}`} className="text-primary-600 hover:underline">
                          📱 {cliente.NumeroTelefono}
                        </a>
                      </p>
                    </div>
                    <Badge variant={cliente.Activo ? 'success' : 'default'}>
                      {cliente.Activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  
                  {cliente.Direccion && (
                    <p className="text-xs sm:text-sm text-gray-600 mb-2">
                      <strong>📍 Dirección:</strong> {cliente.Direccion}
                    </p>
                  )}
                  
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Fecha Alta:</strong> {new Date(cliente.FechaAlta).toLocaleDateString('es-MX')}
                  </p>

                  {canEdit && (
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(cliente)}
                        className="flex-1"
                      >
                        ✏️ Editar
                      </Button>
                      {cliente.Activo && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(cliente.ClienteID)}
                          className="flex-1"
                        >
                          ❌ Desactivar
                        </Button>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal Create/Edit */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={modalMode === 'create' ? 'Nuevo Cliente' : 'Editar Cliente'}
        footer={
          <div className="flex gap-2 w-full justify-end">
            <Button variant="secondary" onClick={() => setShowModal(false)} size="sm" className="flex-1 sm:flex-none">
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSubmit} size="sm" className="flex-1 sm:flex-none">
              {modalMode === 'create' ? 'Crear' : 'Guardar'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <Input
            label="Teléfono"
            type="text"
            value={formData.numeroTelefono}
            onChange={(e) =>
              setFormData({ ...formData, numeroTelefono: e.target.value })
            }
            placeholder="Ej: 5218123456789"
            required
            disabled={modalMode === 'edit'}
          />
          <Input
            label="Nombre"
            type="text"
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            placeholder="Nombre del cliente"
            required
          />
          <Input
            label="Dirección"
            type="text"
            value={formData.direccion}
            onChange={(e) =>
              setFormData({ ...formData, direccion: e.target.value })
            }
            placeholder="Dirección de entrega"
          />
        </form>
      </Modal>
    </DashboardLayout>
  );
}
