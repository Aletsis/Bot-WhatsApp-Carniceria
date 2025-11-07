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
    numeroWhatsApp: '',
  });
  const { isAdmin, getDefaultPage } = useAuth();

  // Si no es admin, redirigir a su página por defecto
  if (!isAdmin) {
    return <Navigate to={getDefaultPage()} replace />;
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
      numeroWhatsApp: '',
    });
    setShowModal(true);
  };

  const openEditModal = (usuario) => {
    setModalMode('edit');
    setSelectedUsuario(usuario);
    setFormData({
      ...formData,
      nombre: usuario.Nombre || '',
      email: usuario.Email || '',
      numeroWhatsApp: usuario.NumeroWhatsApp || '',
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
      } else if (modalMode === 'edit') {
        await usuariosService.updateInfo(selectedUsuario.UsuarioID, {
          nombre: formData.nombre,
          email: formData.email,
          numeroWhatsApp: formData.numeroWhatsApp,
        });
        alert('Información actualizada exitosamente');
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
      alert('Error al guardar usuario: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleToggleEstado = async (usuarioId, activo) => {
    if (!confirm(`¿Estás seguro de ${activo ? 'desactivar' : 'activar'} este usuario?`)) {
      return;
    }
    
    try {
      await usuariosService.updateEstado(usuarioId, !activo);
      alert('Estado actualizado exitosamente');
      loadUsuarios();
    } catch (error) {
      alert('Error al actualizar estado: ' + (error.response?.data?.error || error.message));
    }
  };

  const getRolBadge = (rol) => {
    const variants = {
      admin: 'danger',
      supervisor: 'warning',
      editor: 'success',
      viewer: 'info',
    };
    
    const labels = {
      admin: 'ADMIN',
      supervisor: 'SUPERVISOR',
      editor: 'EDITOR',
      viewer: 'VIEWER',
    };
    
    return <Badge variant={variants[rol] || 'default'}>{labels[rol] || rol.toUpperCase()}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">👤 Usuarios</h1>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="primary" onClick={() => loadUsuarios()} size="sm" className="flex-1 sm:flex-none">
              🔄 <span className="hidden sm:inline">Actualizar</span>
            </Button>
            <Button variant="success" onClick={openCreateModal} size="sm" className="flex-1 sm:flex-none">
              ➕ <span className="hidden sm:inline">Nuevo Usuario</span><span className="sm:hidden">Nuevo</span>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <Card className="p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-600">Total</p>
            <p className="text-xl sm:text-3xl font-bold text-primary-600">{usuarios.length}</p>
          </Card>
          <Card className="p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-600">Admins</p>
            <p className="text-xl sm:text-3xl font-bold text-red-600">
              {usuarios.filter((u) => u.Rol === 'admin').length}
            </p>
          </Card>
          <Card className="p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-600">Editores</p>
            <p className="text-xl sm:text-3xl font-bold text-yellow-600">
              {usuarios.filter((u) => u.Rol === 'editor').length}
            </p>
          </Card>
          <Card className="p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-600">Viewers</p>
            <p className="text-xl sm:text-3xl font-bold text-blue-600">
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
          <>
            {/* Vista de tabla para desktop */}
            <Card className="hidden lg:block">
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
                        WhatsApp
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
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {usuario.NumeroWhatsApp ? (
                            <span className="inline-flex items-center gap-1">
                              📱 {usuario.NumeroWhatsApp}
                            </span>
                          ) : (
                            <span className="text-gray-400">Sin configurar</span>
                          )}
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
                            onClick={() => openEditModal(usuario)}
                          >
                            ✏️ Editar Info
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openPasswordModal(usuario)}
                          >
                            🔑 Contraseña
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

            {/* Vista de tarjetas para móvil/tablet */}
            <div className="lg:hidden grid gap-3">
              {usuarios.map((usuario) => (
                <Card key={usuario.UsuarioID} className="p-3 sm:p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900">
                        {usuario.Username}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {usuario.Nombre || 'Sin nombre'}
                      </p>
                      {usuario.Email && (
                        <p className="text-xs text-gray-500 mt-1">
                          ✉️ {usuario.Email}
                        </p>
                      )}
                      {usuario.NumeroWhatsApp && (
                        <p className="text-xs text-gray-500 mt-1">
                          📱 {usuario.NumeroWhatsApp}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      {getRolBadge(usuario.Rol)}
                      <Badge variant={usuario.Activo ? 'success' : 'default'}>
                        {usuario.Activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 mb-3">
                    <strong>Último acceso:</strong>{' '}
                    {usuario.UltimoAcceso
                      ? new Date(usuario.UltimoAcceso).toLocaleString('es-MX', {
                          dateStyle: 'short',
                          timeStyle: 'short'
                        })
                      : 'Nunca'}
                  </p>

                  <div className="flex flex-col gap-2 pt-2 border-t">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(usuario)}
                        className="flex-1"
                      >
                        ✏️ Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openPasswordModal(usuario)}
                        className="flex-1"
                      >
                        🔑 Contraseña
                      </Button>
                    </div>
                    <Button
                      variant={usuario.Activo ? 'danger' : 'success'}
                      size="sm"
                      onClick={() =>
                        handleToggleEstado(usuario.UsuarioID, usuario.Activo)
                      }
                      className="w-full"
                    >
                      {usuario.Activo ? '❌ Desactivar' : '✅ Activar'}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal Create/Password */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={
          modalMode === 'create'
            ? 'Nuevo Usuario'
            : modalMode === 'edit'
            ? `Editar Usuario: ${selectedUsuario?.Username}`
            : `Cambiar Contraseña: ${selectedUsuario?.Username}`
        }
        footer={
          <div className="flex gap-2 w-full justify-end">
            <Button variant="secondary" onClick={() => setShowModal(false)} size="sm" className="flex-1 sm:flex-none">
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSubmit} size="sm" className="flex-1 sm:flex-none">
              {modalMode === 'create' ? 'Crear' : modalMode === 'edit' ? 'Actualizar' : 'Guardar'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
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
              <Input
                label="WhatsApp (opcional)"
                type="text"
                value={formData.numeroWhatsApp}
                onChange={(e) =>
                  setFormData({ ...formData, numeroWhatsApp: e.target.value })
                }
                placeholder="+5214447320220"
                help="Número completo con código de país para recibir notificaciones"
              />
              <Select
                label="Rol"
                value={formData.rol}
                onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                options={[
                  { value: 'viewer', label: 'Visualizador (Solo Lectura)' },
                  { value: 'editor', label: 'Editor (Crear/Editar Pedidos y Clientes)' },
                  { value: 'supervisor', label: 'Supervisor (Gestión Completa de Pedidos, Sin Config)' },
                  { value: 'admin', label: 'Administrador (Control Total del Sistema)' },
                ]}
              />
            </>
          ) : modalMode === 'edit' ? (
            <>
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
              <Input
                label="WhatsApp"
                type="text"
                value={formData.numeroWhatsApp}
                onChange={(e) =>
                  setFormData({ ...formData, numeroWhatsApp: e.target.value })
                }
                placeholder="+5214447320220"
                help="Número completo con código de país para recibir notificaciones. Dejar vacío para no recibir notificaciones."
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
