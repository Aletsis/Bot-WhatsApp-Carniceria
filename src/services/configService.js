/**
 * Servicio de Configuración
 * 
 * Gestiona la configuración del sistema almacenada en la base de datos.
 * Permite obtener y actualizar configuraciones sin reiniciar el servidor.
 */

import sql from 'mssql';
import { getPool } from './dbService.js';
import logger from '../logger.js';

/**
 * Obtiene todas las configuraciones agrupadas por categoría
 * 
 * @returns {Promise<Object>} Objeto con configuraciones por categoría
 * @example
 * {
 *   PRINTER: [{ clave: 'PRINTER_ENABLED', valor: 'true', ... }],
 *   WHATSAPP: [...],
 *   SYSTEM: [...],
 *   NOTIFICATIONS: [...]
 * }
 */
export async function getAllConfigs() {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query(`
        SELECT 
          ConfigID,
          Clave,
          Valor,
          Descripcion,
          Tipo,
          Categoria,
          Editable,
          FechaActualizacion
        FROM Configuraciones
        ORDER BY Categoria, Clave
      `);

    // Agrupar por categoría
    const configs = {};
    result.recordset.forEach(config => {
      if (!configs[config.Categoria]) {
        configs[config.Categoria] = [];
      }
      
      // Enmascarar valores de tipo 'secret' (mostrar solo últimos 4 caracteres)
      let valorMostrar = config.Valor;
      if (config.Tipo === 'secret' && config.Valor && config.Valor.length > 4) {
        valorMostrar = '****' + config.Valor.slice(-4);
      }
      
      configs[config.Categoria].push({
        ConfigID: config.ConfigID,
        Clave: config.Clave,
        Valor: valorMostrar,
        ValorReal: config.Tipo === 'secret' ? null : config.Valor, // No enviar secrets completos
        Descripcion: config.Descripcion,
        Tipo: config.Tipo,
        Categoria: config.Categoria,
        Editable: config.Editable,
        FechaActualizacion: config.FechaActualizacion
      });
    });

    logger.debug('✅ Configuraciones obtenidas: %d categorías', Object.keys(configs).length);
    return configs;
  } catch (error) {
    logger.error('❌ Error obteniendo configuraciones:', error.message);
    throw error;
  }
}

/**
 * Obtiene una configuración específica por clave
 * 
 * @param {string} clave - Clave de la configuración
 * @returns {Promise<Object|null>} Configuración o null si no existe
 */
export async function getConfig(clave) {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('clave', sql.NVarChar, clave)
      .query(`
        SELECT 
          ConfigID,
          Clave,
          Valor,
          Descripcion,
          Tipo,
          Categoria,
          Editable,
          FechaActualizacion
        FROM Configuraciones
        WHERE Clave = @clave
      `);

    if (result.recordset.length === 0) {
      logger.warn('⚠️ Configuración no encontrada: %s', clave);
      return null;
    }

    const config = result.recordset[0];
    
    // Enmascarar secrets
    let valorMostrar = config.Valor;
    if (config.Tipo === 'secret' && config.Valor && config.Valor.length > 4) {
      valorMostrar = '****' + config.Valor.slice(-4);
    }
    
    logger.debug('✅ Configuración obtenida: %s = %s', clave, config.Tipo === 'secret' ? '****' : config.Valor);
    
    return {
      configID: config.ConfigID,
      clave: config.Clave,
      valor: valorMostrar,
      valorOriginal: config.Valor, // Guardar el valor original sin enmascarar
      descripcion: config.Descripcion,
      tipo: config.Tipo,
      categoria: config.Categoria,
      editable: config.Editable,
      fechaActualizacion: config.FechaActualizacion
    };
  } catch (error) {
    logger.error('❌ Error obteniendo configuración %s:', clave, error.message);
    throw error;
  }
}

/**
 * Actualiza una configuración específica
 * 
 * @param {string} clave - Clave de la configuración
 * @param {string} nuevoValor - Nuevo valor
 * @returns {Promise<boolean>} true si se actualizó correctamente
 */
export async function updateConfig(clave, nuevoValor) {
  try {
    const pool = await getPool();
    
    // Verificar que la configuración existe y es editable
    const configActual = await getConfig(clave);
    
    if (!configActual) {
      throw new Error(`Configuración no encontrada: ${clave}`);
    }
    
    if (!configActual.editable) {
      throw new Error(`Configuración no editable: ${clave}`);
    }
    
    // Si el valor está enmascarado (empieza con ****), ignorar actualización
    // Esto ocurre cuando el usuario no modifica un campo secret
    if (nuevoValor && nuevoValor.startsWith('****')) {
      logger.debug('⏭️ Omitiendo actualización de %s (valor enmascarado sin cambios)', clave);
      return true; // Retornar éxito sin actualizar
    }
    
    // Si el valor está vacío y es un secret, mantener el valor actual
    if (configActual.tipo === 'secret' && (!nuevoValor || nuevoValor.trim() === '')) {
      logger.debug('⏭️ Omitiendo actualización de %s (secret vacío, manteniendo valor actual)', clave);
      return true;
    }
    
    // Validar el valor según el tipo
    const valorValidado = validarValor(nuevoValor, configActual.tipo, clave);
    
    // Actualizar en BD
    const result = await pool.request()
      .input('clave', sql.NVarChar, clave)
      .input('valor', sql.NVarChar, valorValidado)
      .input('fecha', sql.DateTime, new Date())
      .query(`
        UPDATE Configuraciones
        SET Valor = @valor, FechaActualizacion = @fecha
        WHERE Clave = @clave AND Editable = 1
      `);

    if (result.rowsAffected[0] === 0) {
      throw new Error(`No se pudo actualizar la configuración: ${clave}`);
    }

    logger.info('✅ Configuración actualizada: %s = %s', 
                clave, 
                configActual.tipo === 'secret' ? '****' : valorValidado);
    
    return true;
  } catch (error) {
    logger.error('❌ Error actualizando configuración %s:', clave, error.message);
    throw error;
  }
}

/**
 * Actualiza múltiples configuraciones en una sola transacción
 * 
 * @param {Array<{clave: string, valor: string}>} configuraciones - Array de configuraciones
 * @returns {Promise<{exitosas: number, fallidas: number, errores: Array}>}
 */
export async function updateMultipleConfigs(configuraciones) {
  const resultados = {
    exitosas: 0,
    fallidas: 0,
    errores: []
  };

  for (const config of configuraciones) {
    try {
      await updateConfig(config.clave, config.valor);
      resultados.exitosas++;
    } catch (error) {
      resultados.fallidas++;
      resultados.errores.push({
        clave: config.clave,
        error: error.message
      });
      logger.error('❌ Error actualizando %s: %s', config.clave, error.message);
    }
  }

  logger.info('📊 Actualización masiva: %d exitosas, %d fallidas', 
              resultados.exitosas, resultados.fallidas);
  
  return resultados;
}

/**
 * Obtiene configuraciones por categoría
 * 
 * @param {string} categoria - Categoría (PRINTER, WHATSAPP, SYSTEM, NOTIFICATIONS)
 * @returns {Promise<Array>} Array de configuraciones
 */
export async function getConfigsByCategory(categoria) {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('categoria', sql.NVarChar, categoria)
      .query(`
        SELECT 
          ConfigID,
          Clave,
          Valor,
          Descripcion,
          Tipo,
          Categoria,
          Editable,
          FechaActualizacion
        FROM Configuraciones
        WHERE Categoria = @categoria
        ORDER BY Clave
      `);

    const configs = result.recordset.map(config => {
      // Enmascarar secrets
      let valorMostrar = config.Valor;
      if (config.Tipo === 'secret' && config.Valor && config.Valor.length > 4) {
        valorMostrar = '****' + config.Valor.slice(-4);
      }
      
      return {
        ConfigID: config.ConfigID,
        Clave: config.Clave,
        Valor: valorMostrar,
        ValorReal: config.Tipo === 'secret' ? null : config.Valor,
        Descripcion: config.Descripcion,
        Tipo: config.Tipo,
        Categoria: config.Categoria,
        Editable: config.Editable,
        FechaActualizacion: config.FechaActualizacion
      };
    });

    logger.debug('✅ Configuraciones de %s obtenidas: %d', categoria, configs.length);
    return configs;
  } catch (error) {
    logger.error('❌ Error obteniendo configuraciones de %s:', categoria, error.message);
    throw error;
  }
}

/**
 * Valida un valor según su tipo
 * 
 * @param {string} valor - Valor a validar
 * @param {string} tipo - Tipo de dato ('string', 'number', 'boolean', 'secret')
 * @param {string} clave - Clave de la configuración (para validaciones específicas)
 * @returns {string} Valor validado
 * @throws {Error} Si el valor no es válido
 */
function validarValor(valor, tipo, clave) {
  // Validar según tipo
  switch (tipo) {
    case 'boolean':
      if (valor !== 'true' && valor !== 'false') {
        throw new Error(`Valor inválido para boolean: ${valor}. Use 'true' o 'false'.`);
      }
      return valor;
      
    case 'number':
      const num = parseInt(valor, 10);
      if (isNaN(num)) {
        throw new Error(`Valor inválido para number: ${valor}`);
      }
      if (num < 0) {
        throw new Error(`Número no puede ser negativo: ${valor}`);
      }
      return valor;
      
    case 'secret':
      if (!valor || valor.trim().length === 0) {
        throw new Error('Los secrets no pueden estar vacíos');
      }
      // Si viene enmascarado (****xxxx), no actualizar
      if (valor.startsWith('****')) {
        throw new Error('No se puede actualizar con valor enmascarado. Proporcione el valor completo.');
      }
      return valor.trim();
      
    case 'string':
      // Validaciones específicas por clave
      if (clave === 'PRINTER_HOST') {
        // Validar formato IP
        const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (!ipRegex.test(valor)) {
          throw new Error(`IP inválida: ${valor}. Formato esperado: xxx.xxx.xxx.xxx`);
        }
        // Validar rangos
        const parts = valor.split('.');
        if (parts.some(part => parseInt(part) > 255)) {
          throw new Error(`IP inválida: ${valor}. Cada octeto debe ser <= 255`);
        }
      }
      
      if (clave === 'PRINTER_PORT') {
        const port = parseInt(valor);
        if (isNaN(port) || port < 1 || port > 65535) {
          throw new Error(`Puerto inválido: ${valor}. Debe estar entre 1 y 65535`);
        }
      }
      
      return valor.trim();
      
    default:
      return valor;
  }
}

/**
 * Resetea una configuración a su valor por defecto
 * (requiere conocer los valores por defecto - no implementado en esta versión)
 * 
 * @param {string} clave - Clave de la configuración
 * @returns {Promise<boolean>}
 */
export async function resetConfig(clave) {
  throw new Error('resetConfig no implementado. Use updateConfig con el valor deseado.');
}

export default {
  getAllConfigs,
  getConfig,
  updateConfig,
  updateMultipleConfigs,
  getConfigsByCategory,
  resetConfig
};
