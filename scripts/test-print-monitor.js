/**
 * @file test-print-monitor.js
 * @description Script de prueba para el sistema de monitoreo de pedidos no impresos
 * 
 * Este script permite probar el sistema de notificaciones ORDER_NOT_PRINTED
 * simulando pedidos con problemas de impresión.
 * 
 * Uso:
 *   node scripts/test-print-monitor.js [--force]
 * 
 * Opciones:
 *   --force  Ignora el timeout de 15 minutos y notifica inmediatamente
 * 
 * @author Sistema de Notificaciones
 * @version 1.0.0
 */

import sql from 'mssql';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import printMonitorService from '../src/services/printMonitorService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '..', '.env') });

// Configuración de conexión
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433'),
  database: process.env.DB_NAME || 'CarniceriaDB',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

const forceMode = process.argv.includes('--force');

/**
 * Crea un pedido de prueba con error de impresión
 * @param {*} pool - Pool de conexión
 * @returns {Promise<number>} ID del pedido creado
 */
async function createTestOrder(pool) {
  console.log('\n📝 Creando pedido de prueba...\n');
  
  // Buscar un cliente existente o usar el primero disponible
  const clientResult = await pool.request().query(`
    SELECT TOP 1 ClienteID, Nombre, NumeroTelefono 
    FROM Clientes 
    ORDER BY ClienteID
  `);
  
  if (clientResult.recordset.length === 0) {
    throw new Error('No hay clientes en la base de datos');
  }
  
  const cliente = clientResult.recordset[0];
  console.log(`   Cliente: ${cliente.Nombre} (${cliente.NumeroTelefono})`);
  
  // Generar folio único
  const folio = `TEST-${Date.now()}`;
  console.log(`   Folio: ${folio}`);
  
  // Fecha de creación (si --force, crear hace 20 minutos)
  const fechaCreacion = forceMode 
    ? new Date(Date.now() - 20 * 60 * 1000) // 20 minutos atrás
    : new Date(); // Ahora
  
  console.log(`   Fecha: ${fechaCreacion.toISOString()}`);
  console.log(`   Estado: Pendiente de impresión`);
  
  // Insertar pedido
  const result = await pool.request()
    .input('clienteID', sql.Int, cliente.ClienteID)
    .input('folio', sql.NVarChar, folio)
    .input('contenido', sql.NVarChar, '1x Carne Asada (500g), 2x Chorizo (250g)')
    .input('estado', sql.NVarChar, 'En espera de surtir')
    .input('estadoImpresion', sql.NVarChar, 'Pendiente')
    .input('fecha', sql.DateTime2, fechaCreacion)
    .query(`
      INSERT INTO Pedidos (ClienteID, Folio, Contenido, Estado, EstadoImpresion, Fecha)
      OUTPUT INSERTED.PedidoID
      VALUES (@clienteID, @folio, @contenido, @estado, @estadoImpresion, @fecha)
    `);
  
  const pedidoID = result.recordset[0].PedidoID;
  console.log(`\n   ✅ Pedido creado con ID: ${pedidoID}`);
  
  return pedidoID;
}

/**
 * Verifica el estado actual de pedidos no impresos
 * @param {*} pool - Pool de conexión
 */
async function checkCurrentStatus(pool) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 ESTADO ACTUAL DE PEDIDOS NO IMPRESOS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const stats = await printMonitorService.getUnprintedStats();
  
  if (stats) {
    console.log(`   Total pendientes: ${stats.TotalPendientes}`);
    console.log(`   - Estado "Pendiente": ${stats.EstadoPendiente}`);
    console.log(`   - Estado "Error": ${stats.EstadoError}`);
    console.log(`   Sin notificar: ${stats.SinNotificar}`);
    console.log(`   Ya notificados: ${stats.YaNotificados}`);
    
    if (stats.TotalPendientes > 0) {
      console.log(`\n   Tiempo sin imprimir:`);
      console.log(`   - Mínimo: ${stats.TiempoMinimo} minutos`);
      console.log(`   - Máximo: ${stats.TiempoMaximo} minutos`);
      console.log(`   - Promedio: ${Math.round(stats.TiempoPromedio)} minutos`);
    }
  }
  
  // Listar pedidos pendientes
  const result = await pool.request().query(`
    SELECT TOP 10
      PedidoID,
      Folio,
      EstadoImpresion,
      Fecha,
      DATEDIFF(MINUTE, Fecha, SYSDATETIME()) AS MinutosSinImprimir,
      NotificacionImpresionEnviada,
      CASE 
        WHEN NotificacionImpresionEnviada IS NULL THEN 'Sin notificar'
        ELSE 'Notificado ' + FORMAT(NotificacionImpresionEnviada, 'yyyy-MM-dd HH:mm:ss')
      END AS EstadoNotificacion
    FROM Pedidos
    WHERE EstadoImpresion IN ('Pendiente', 'Error')
    ORDER BY Fecha DESC
  `);
  
  if (result.recordset.length > 0) {
    console.log('\n   Últimos 10 pedidos pendientes:');
    console.log('   ────────────────────────────────────────────');
    result.recordset.forEach(p => {
      console.log(`   ${p.Folio} | ${p.MinutosSinImprimir}min | ${p.EstadoNotificacion}`);
    });
  }
  
  console.log('');
}

/**
 * Ejecuta el test completo
 */
async function runTest() {
  let pool;
  
  try {
    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║   TEST: MONITOR DE PEDIDOS NO IMPRESOS              ║');
    console.log('╚══════════════════════════════════════════════════════╝');
    
    if (forceMode) {
      console.log('\n⚠️  MODO FORCE ACTIVADO: Se ignorará el timeout de 15 minutos');
    }
    
    // Conectar a la base de datos
    console.log('\n🔌 Conectando a la base de datos...');
    pool = await sql.connect(config);
    console.log('✅ Conexión establecida');
    
    // Mostrar estado actual
    await checkCurrentStatus(pool);
    
    // Crear pedido de prueba
    const testPedidoID = await createTestOrder(pool);
    
    // Ejecutar verificación manual
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 EJECUTANDO VERIFICACIÓN MANUAL DEL MONITOR');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (!forceMode) {
      console.log('💡 NOTA: El pedido recién creado NO será notificado todavía');
      console.log('   porque no ha pasado el timeout de 15 minutos.\n');
      console.log('   Para forzar la notificación inmediata, usa:');
      console.log('   node scripts/test-print-monitor.js --force\n');
    }
    
    await printMonitorService.runManualCheck();
    
    // Mostrar estado después del check
    await checkCurrentStatus(pool);
    
    // Verificar si el pedido fue notificado
    const verifyResult = await pool.request()
      .input('pedidoID', sql.BigInt, testPedidoID)
      .query(`
        SELECT 
          PedidoID,
          Folio,
          EstadoImpresion,
          NotificacionImpresionEnviada,
          CASE 
            WHEN NotificacionImpresionEnviada IS NULL THEN 'NO'
            ELSE 'SÍ (en ' + FORMAT(NotificacionImpresionEnviada, 'HH:mm:ss') + ')'
          END AS FueNotificado
        FROM Pedidos
        WHERE PedidoID = @pedidoID
      `);
    
    const pedido = verifyResult.recordset[0];
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 VERIFICACIÓN DEL PEDIDO DE PRUEBA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`   Pedido ID: ${pedido.PedidoID}`);
    console.log(`   Folio: ${pedido.Folio}`);
    console.log(`   Estado Impresión: ${pedido.EstadoImpresion}`);
    console.log(`   Fue Notificado: ${pedido.FueNotificado}\n`);
    
    if (pedido.NotificacionImpresionEnviada) {
      console.log('   ✅ El pedido fue notificado correctamente');
    } else {
      console.log('   ⏸️  El pedido aún no fue notificado (normal si no usaste --force)');
    }
    
    // Ver historial de notificaciones
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📜 HISTORIAL DE NOTIFICACIONES ORDER_NOT_PRINTED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const notificationsResult = await pool.request().query(`
      SELECT TOP 5
        TipoError,
        Severidad,
        Mensaje,
        Estado,
        FORMAT(CreadoEn, 'yyyy-MM-dd HH:mm:ss') AS Fecha
      FROM NotificacionesLog
      WHERE TipoError = 'ORDER_NOT_PRINTED'
      ORDER BY CreadoEn DESC
    `);
    
    if (notificationsResult.recordset.length === 0) {
      console.log('   No hay notificaciones ORDER_NOT_PRINTED en el historial.\n');
    } else {
      notificationsResult.recordset.forEach((n, i) => {
        console.log(`   ${i + 1}. [${n.Severidad}] ${n.Mensaje}`);
        console.log(`      Estado: ${n.Estado} | Fecha: ${n.Fecha}\n`);
      });
    }
    
    // Opciones para limpiar
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧹 LIMPIEZA (OPCIONAL)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('   Para limpiar el pedido de prueba:');
    console.log(`   DELETE FROM Pedidos WHERE PedidoID = ${testPedidoID};\n`);
    console.log('   Para resetear flag de notificación:');
    console.log(`   UPDATE Pedidos SET NotificacionImpresionEnviada = NULL WHERE PedidoID = ${testPedidoID};\n`);
    
    console.log('\n✅ TEST COMPLETADO\n');
    
  } catch (error) {
    console.error('\n❌ ERROR EN EL TEST:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔌 Conexión cerrada\n');
    }
  }
}

// Ejecutar test
runTest();
