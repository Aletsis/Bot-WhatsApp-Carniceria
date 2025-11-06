import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout';
import { Button, Input, Select, Card, Loading, Modal, Badge } from '../components/common';
import { usuariosService } from '../api/services';
import { useAuth } from '../contexts/AuthContext';

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedUsuario, setSelectedUsuario] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rol: 'viewer',
    nombre: '',
    email: '',
  });
  const { isAdmin } = useAuth();

  // Si no es admin, redirigir
  if (!isAdmin) {
    return <Navigate to="/dashboard/pedidos" replace />;
  }

  useEffect(() => {
    loadUsuarios();
  }, []);

  const loadUsuarios = async () => {
    try {
      setLoading(true);
      const data = await usuariosService.getAll();
      setUsuarios(data);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setFormData({
      username: '',
      password: '',
      rol: 'viewer',
      nombre: '',
      email: '',
    });
    setShowModal(true);
  };

  const openPasswordModal = (usuario) => {
    setModalMode('password');
    setSelectedUsuario(usuario);
    setFormData({ ...formData, password: '' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalMode === 'create') {
        await usuariosService.create(formData);
        alert('Usuario creado exitosamente');
      } else if (modalMode === 'password') {
        await usuariosService.updatePassword(
          selectedUsuario.UsuarioID,
          formData.password
        );
        alert('Contraseña actualizada exitosamente');
      }
      setShowModal(false);
      loadUsuarios();
    } catch (error) {
      alert('Error al guardar usuario');
    }
  };

  const handleToggleEstado = async (usuarioId, activo) => {
    try {
      await usuariosService.updateEstado(usuarioId, !activo);
      alert('Estado actualizado exitosamente');
      loadUsuarios();
    } catch (error) {
      alert('Error al actualizar estado');
    }
  };

  const getRolBadge = (rol) => {
    const variants = {
      admin: 'danger',
      editor: 'warning',
      viewer: 'info',
    };
    return <Badge variant={variants[rol]}>{rol.toUpperCase()}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">👤 Usuarios</h1>
          <div className="flex gap-2">
            <Button variant="primary" onClick={() => loadUsuarios()}>
              🔄 Actualizar
            </Button>
            <Button variant="success" onClick={openCreateModal}>
              ➕ Nuevo Usuario
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <p className="text-sm text-gray-600">Total Usuarios</p>
            <p className="text-3xl font-bold text-primary-600">{usuarios.length}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-600">Administradores</p>
            <p className="text-3xl font-bold text-red-600">
              {usuarios.filter((u) => u.Rol === 'admin').length}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-gray-600">Editores</p>
            <p className="text-3xl font-bold text-yellow-600">
              {usuarios.filter((u) => u.Rol === 'editor').length}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-gray-600">Visualizadores</p>
            <p className="text-3xl font-bold text-blue-600">
              {usuarios.filter((u) => u.Rol === 'viewer').length}
            </p>
          </Card>
        </div>

        {/* Lista de Usuarios */}
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
                      Usuario
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Nombre
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Rol
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Último Acceso
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {usuarios.map((usuario) => (
                    <tr key={usuario.UsuarioID} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {usuario.Username}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {usuario.Nombre || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {usuario.Email || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">{getRolBadge(usuario.Rol)}</td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant={usuario.Activo ? 'success' : 'default'}>
                          {usuario.Activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {usuario.UltimoAcceso
                          ? new Date(usuario.UltimoAcceso).toLocaleString('es-MX')
                          : 'Nunca'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPasswordModal(usuario)}
                        >
                          🔑 Cambiar Contraseña
                        </Button>
                        <Button
                          variant={usuario.Activo ? 'danger' : 'success'}
                          size="sm"
                          onClick={() =>
                            handleToggleEstado(usuario.UsuarioID, usuario.Activo)
                          }
                        >
                          {usuario.Activo ? '❌ Desactivar' : '✅ Activar'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Modal Create/Password */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={
          modalMode === 'create'
            ? 'Nuevo Usuario'
            : `Cambiar Contraseña: ${selectedUsuario?.Username}`
        }
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
          {modalMode === 'create' ? (
            <>
              <Input
                label="Usuario"
                type="text"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                placeholder="username"
                required
              />
              <Input
                label="Contraseña"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="••••••••"
                required
              />
              <Input
                label="Nombre"
                type="text"
                value={formData.nombre}
                onChange={(e) =>
                  setFormData({ ...formData, nombre: e.target.value })
                }
                placeholder="Nombre completo"
              />
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="email@ejemplo.com"
              />
              <Select
                label="Rol"
                value={formData.rol}
                onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                options={[
                  { value: 'viewer', label: 'Visualizador (Solo Lectura)' },
                  { value: 'editor', label: 'Editor (Lectura y Escritura)' },
                  { value: 'admin', label: 'Administrador (Control Total)' },
                ]}
              />
            </>
          ) : (
            <Input
              label="Nueva Contraseña"
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              placeholder="••••••••"
              required
            />
          )}
        </form>
      </Modal>
    </DashboardLayout>
  );
}
