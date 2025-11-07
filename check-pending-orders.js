import dotenv from 'dotenv';
import { getPool } from './src/services/dbService.js';

// Cargar variables de entorno
dotenv.config();

async function checkPendingOrders() {
  try {
    console.log('🔍 Verificando pedidos sin imprimir...');
    
    const pool = await getPool();
    console.log('✅ Pool de BD obtenido correctamente');
    
    // 1. Verificar TODOS los pedidos recientes
    console.log('\n1️⃣ Todos los pedidos recientes (últimas 24 horas):');
    const allRecentOrders = await pool.request().query(`
      SELECT 
        PedidoID,
        Folio,
        c.Nombre as Cliente,
        Fecha,
        Estado,
        EstadoImpresion,
        FechaImpresion,
        NotificacionImpresionEnviada,
        DATEDIFF(MINUTE, Fecha, GETDATE()) as MinutosTranscurridos
      FROM Pedidos p
      LEFT JOIN Clientes c ON p.ClienteID = c.ClienteID
      WHERE Fecha >= DATEADD(HOUR, -24, GETDATE())
      ORDER BY Fecha DESC
    `);
    
    console.log(`   📋 Total pedidos recientes: ${allRecentOrders.recordset.length}`);
    allRecentOrders.recordset.forEach(pedido => {
      console.log(`   - Pedido ${pedido.PedidoID} (${pedido.Folio}): ${pedido.Cliente || 'Sin cliente'}`);
      console.log(`     Estado: ${pedido.Estado}, Impresión: ${pedido.EstadoImpresion}`);
      console.log(`     Creado: ${pedido.Fecha} (${pedido.MinutosTranscurridos} min)`);
      console.log(`     Notificación enviada: ${pedido.NotificacionImpresionEnviada || 'NULL'}`);
      console.log('');
    });
    
    // 2. Pedidos con problemas de impresión (según la lógica actual)
    console.log('\n2️⃣ Pedidos con problemas de impresión (lógica actual):');
    const problematicOrders = await pool.request().query(`
      SELECT 
        PedidoID,
        Folio,
        c.Nombre as Cliente,
        Fecha,
        Estado,
        EstadoImpresion,
        FechaImpresion,
        NotificacionImpresionEnviada,
        DATEDIFF(MINUTE, Fecha, GETDATE()) as MinutosTranscurridos
      FROM Pedidos p
      LEFT JOIN Clientes c ON p.ClienteID = c.ClienteID
      WHERE EstadoImpresion IN ('Pendiente', 'Error', 'Reintento')
        AND DATEDIFF(MINUTE, Fecha, GETDATE()) >= 15
      ORDER BY Fecha ASC
    `);
    
    console.log(`   📋 Pedidos problemáticos encontrados: ${problematicOrders.recordset.length}`);
    problematicOrders.recordset.forEach(pedido => {
      console.log(`   - Pedido ${pedido.PedidoID} (${pedido.Folio}): ${pedido.Cliente || 'Sin cliente'}`);
      console.log(`     Estado: ${pedido.Estado}, Impresión: ${pedido.EstadoImpresion}`);
      console.log(`     Creado hace: ${pedido.MinutosTranscurridos} minutos`);
      console.log(`     Notificación enviada: ${pedido.NotificacionImpresionEnviada || 'NULL'}`);
      console.log('');
    });
    
    // 3. Pedidos que necesitan notificación (lógica del monitor)
    console.log('\n3️⃣ Pedidos que necesitan notificación (lógica del monitor):');
    const needNotificationOrders = await pool.request().query(`
      SELECT 
        PedidoID,
        Folio,
        c.Nombre as Cliente,
        Fecha,
        Estado,
        EstadoImpresion,
        FechaImpresion,
        NotificacionImpresionEnviada,
        DATEDIFF(MINUTE, Fecha, GETDATE()) as MinutosTranscurridos
      FROM Pedidos p
      LEFT JOIN Clientes c ON p.ClienteID = c.ClienteID
      WHERE EstadoImpresion IN ('Pendiente', 'Error', 'Reintento')
        AND DATEDIFF(MINUTE, Fecha, GETDATE()) >= 15
        AND NotificacionImpresionEnviada IS NULL
      ORDER BY Fecha ASC
    `);
    
    console.log(`   📋 Pedidos que necesitan notificación: ${needNotificationOrders.recordset.length}`);
    needNotificationOrders.recordset.forEach(pedido => {
      console.log(`   - Pedido ${pedido.PedidoID} (${pedido.Folio}): ${pedido.Cliente || 'Sin cliente'}`);
      console.log(`     Estado: ${pedido.Estado}, Impresión: ${pedido.EstadoImpresion}`);
      console.log(`     Creado hace: ${pedido.MinutosTranscurridos} minutos`);
      console.log(`     Notificación enviada: ${pedido.NotificacionImpresionEnviada || 'NULL'}`);
      console.log('');
    });
    
    // 4. Verificar configuración del monitor
    console.log('\n4️⃣ Configuración del monitor:');
    const configQuery = await pool.request().query(`
      SELECT Clave, Valor, Descripcion
      FROM Configuraciones
      WHERE Clave LIKE 'monitor_%' OR Clave LIKE 'print_%'
      ORDER BY Clave
    `);
    
    console.log(`   ⚙️  Configuraciones encontradas: ${configQuery.recordset.length}`);
    configQuery.recordset.forEach(config => {
      console.log(`   - ${config.Clave}: ${config.Valor} (${config.Descripcion})`);
    });
    
    // 5. Verificar si la tabla tiene la columna NotificacionImpresionEnviada
    console.log('\n5️⃣ Verificando estructura de tabla Pedidos:');
    const columnsQuery = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Pedidos' AND COLUMN_NAME LIKE '%Notif%'
    `);
    
    console.log(`   📊 Columnas relacionadas con notificaciones: ${columnsQuery.recordset.length}`);
    columnsQuery.recordset.forEach(col => {
      console.log(`   - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (Nullable: ${col.IS_NULLABLE})`);
    });
    
    process.exit(0);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  }
}

checkPendingOrders();