import { useState, useEffect } from 'react';
import { configuracionesService } from '../api/services';

/**
 * Página de Configuración del Sistema
 * Permite a los administradores gestionar configuraciones sin editar archivos .env
 */
export default function ConfiguracionPage() {
  const [configs, setConfigs] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [modifiedConfigs, setModifiedConfigs] = useState({});

  // Cargar configuraciones al montar el componente
  useEffect(() => {
    cargarConfiguraciones();
  }, []);

  const cargarConfiguraciones = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await configuracionesService.getAll();
      setConfigs(data);
    } catch (err) {
      console.error('Error cargando configuraciones:', err);
      setError(err.message || 'Error al cargar configuraciones');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (clave, valor) => {
    setModifiedConfigs(prev => ({
      ...prev,
      [clave]: valor
    }));
  };

  const handleGuardarCategoria = async (categoria) => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      // Filtrar solo los configs modificados de esta categoría
      const configsCategoria = configs[categoria] || [];
      const cambios = configsCategoria
        .filter(config => {
          // Incluir solo si está modificado
          if (modifiedConfigs[config.Clave] === undefined) return false;
          
          // Para secrets vacíos, no incluirlos (el usuario no quiere cambiarlos)
          if (config.Tipo === 'secret' && modifiedConfigs[config.Clave].trim() === '') {
            return false;
          }
          
          return true;
        })
        .map(config => ({
          clave: config.Clave,
          valor: modifiedConfigs[config.Clave]
        }));

      if (cambios.length === 0) {
        setSuccessMessage('No hay cambios para guardar');
        return;
      }

      const resultado = await configuracionesService.update(cambios);

      // Limpiar los cambios guardados
      const newModifiedConfigs = { ...modifiedConfigs };
      cambios.forEach(cambio => {
        delete newModifiedConfigs[cambio.clave];
      });
      setModifiedConfigs(newModifiedConfigs);

      // Recargar configuraciones
      await cargarConfiguraciones();

      setSuccessMessage(
        `✅ ${resultado.exitosas || cambios.length} configuración(es) actualizada(s) correctamente`
      );
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error guardando configuraciones:', err);
      setError(err.message || 'Error al guardar configuraciones');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelarCategoria = (categoria) => {
    const configsCategoria = configs[categoria] || [];
    const newModifiedConfigs = { ...modifiedConfigs };
    
    configsCategoria.forEach(config => {
      delete newModifiedConfigs[config.Clave];
    });
    
    setModifiedConfigs(newModifiedConfigs);
  };

  const renderInput = (config) => {
    const valor = modifiedConfigs[config.Clave] !== undefined 
      ? modifiedConfigs[config.Clave] 
      : config.Valor;

    const inputClasses = "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed";

    switch (config.Tipo) {
      case 'boolean':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={valor === 'true'}
              onChange={(e) => handleInputChange(config.Clave, e.target.checked ? 'true' : 'false')}
              disabled={!config.Editable}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded disabled:cursor-not-allowed"
            />
            <span className="ml-2 text-sm text-gray-600">
              {valor === 'true' ? 'Activado' : 'Desactivado'}
            </span>
          </div>
        );

      case 'number':
        return (
          <input
            type="number"
            value={valor}
            onChange={(e) => handleInputChange(config.Clave, e.target.value)}
            disabled={!config.Editable}
            className={inputClasses}
            min="0"
          />
        );

      case 'secret':
        // Para secrets: mostrar enmascarado si no se ha modificado, o el nuevo valor si se editó
        const valorSecret = modifiedConfigs[config.Clave] !== undefined 
          ? modifiedConfigs[config.Clave] 
          : ''; // Mostrar vacío para que el usuario sepa que debe ingresar un valor nuevo
        
        return (
          <div className="space-y-2">
            <input
              type="password"
              value={valorSecret}
              onChange={(e) => handleInputChange(config.Clave, e.target.value)}
              disabled={!config.Editable}
              placeholder="Dejar vacío para mantener el valor actual"
              className={inputClasses}
            />
            {config.Valor && config.Valor.startsWith('****') && (
              <p className="text-xs text-gray-500">
                Valor actual: {config.Valor} (enmascarado por seguridad)
              </p>
            )}
          </div>
        );

      default: // string
        return (
          <input
            type="text"
            value={valor}
            onChange={(e) => handleInputChange(config.Clave, e.target.value)}
            disabled={!config.Editable}
            className={inputClasses}
          />
        );
    }
  };

  const renderCategoria = (categoria, titulo, descripcion) => {
    const configsCategoria = configs[categoria] || [];
    const haycambios = configsCategoria.some(
      config => modifiedConfigs[config.Clave] !== undefined
    );

    return (
      <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6">
        <div className="px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white">
          <h2 className="text-xl font-semibold">{titulo}</h2>
          <p className="text-sm text-green-100 mt-1">{descripcion}</p>
        </div>
        
        <div className="px-6 py-4 space-y-4">
          {configsCategoria.length === 0 ? (
            <p className="text-gray-500 italic">No hay configuraciones en esta categoría</p>
          ) : (
            configsCategoria.map(config => (
              <div key={config.ConfigID} className="border-b border-gray-200 pb-4 last:border-b-0">
                <div className="flex justify-between items-start mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {config.Clave}
                    {!config.Editable && (
                      <span className="ml-2 text-xs text-red-600 font-normal">
                        (No editable)
                      </span>
                    )}
                  </label>
                  <span className={`text-xs px-2 py-1 rounded ${
                    config.Tipo === 'secret' ? 'bg-red-100 text-red-800' :
                    config.Tipo === 'boolean' ? 'bg-blue-100 text-blue-800' :
                    config.Tipo === 'number' ? 'bg-purple-100 text-purple-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {config.Tipo}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-2">{config.Descripcion}</p>
                {renderInput(config)}
              </div>
            ))
          )}
        </div>

        {configsCategoria.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
            <button
              onClick={() => handleCancelarCategoria(categoria)}
              disabled={!haycambios || saving}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => handleGuardarCategoria(categoria)}
              disabled={!haycambios || saving}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Configuración del Sistema</h1>
        <p className="mt-2 text-gray-600">
          Gestiona las configuraciones del sistema sin necesidad de editar archivos o reiniciar el servidor.
        </p>
      </div>

      {/* Mensajes de error o éxito */}
      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
                <span className="sr-only">Cerrar</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Secciones de configuración */}
      {renderCategoria('PRINTER', '🖨️ Configuración de Impresora', 'Configura la conexión y comportamiento de la impresora de tickets')}
      {renderCategoria('WHATSAPP', '💬 Configuración de WhatsApp', 'Credenciales y configuración de la API de WhatsApp Business')}
      {renderCategoria('SYSTEM', '⚙️ Configuración del Sistema', 'Parámetros generales de comportamiento del sistema')}
      {renderCategoria('NOTIFICATIONS', '🔔 Configuración de Notificaciones', 'Control de notificaciones automáticas a clientes')}
    </div>
  );
}
