import { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout';
import { Button, Input, Card, Loading, Modal, Badge } from '../components/common';
import { clientesService } from '../api/services';
import { useAuth } from '../contexts/AuthContext';

export default function ClientesPage() {
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
  const { isEditor } = useAuth();

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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">👥 Clientes</h1>
          <div className="flex gap-2">
            <Button variant="primary" onClick={() => loadClientes()}>
              🔄 Actualizar
            </Button>
            {isEditor && (
              <Button variant="success" onClick={openCreateModal}>
                ➕ Nuevo Cliente
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <p className="text-sm text-gray-600">Total Clientes</p>
            <p className="text-3xl font-bold text-primary-600">{clientes.length}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-600">Activos</p>
            <p className="text-3xl font-bold text-green-600">
              {clientes.filter((c) => c.Activo).length}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-gray-600">Inactivos</p>
            <p className="text-3xl font-bold text-gray-600">
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
          <Card>
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
                    {isEditor && (
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
                      {isEditor && (
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
        )}
      </div>

      {/* Modal Create/Edit */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={modalMode === 'create' ? 'Nuevo Cliente' : 'Editar Cliente'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSubmit}>
              {modalMode === 'create' ? 'Crear' : 'Guardar'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
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
