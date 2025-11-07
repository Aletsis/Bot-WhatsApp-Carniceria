import dotenv from 'dotenv';
import sql from 'mssql';

dotenv.config();

const config = {
  server: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

async function analyzeIndexes() {
  let pool;
  
  try {
    console.log('🔌 Conectando a SQL Server...\n');
    pool = await sql.connect(config);
    
    // 1. Resumen de índices por tabla
    console.log('═'.repeat(80));
    console.log('📊 RESUMEN DE ÍNDICES POR TABLA');
    console.log('═'.repeat(80));
    
    const summaryQuery = `
      SELECT 
        t.name AS Tabla,
        COUNT(i.index_id) AS TotalIndices,
        SUM(CASE WHEN i.type_desc = 'CLUSTERED' THEN 1 ELSE 0 END) AS ClusteredIdx,
        SUM(CASE WHEN i.type_desc = 'NONCLUSTERED' THEN 1 ELSE 0 END) AS NonClusteredIdx,
        SUM(CASE WHEN i.is_unique = 1 THEN 1 ELSE 0 END) AS Unicos
      FROM sys.tables AS t
      LEFT JOIN sys.indexes AS i ON t.object_id = i.object_id
      WHERE t.name IN ('Clientes', 'Pedidos', 'Conversaciones', 'Usuarios', 'LogAccesos', 'Configuraciones', 'Mensajes')
      GROUP BY t.name
      ORDER BY t.name;
    `;
    
    const summary = await pool.request().query(summaryQuery);
    
    summary.recordset.forEach(row => {
      console.log(`\n📁 ${row.Tabla}`);
      console.log(`   Total: ${row.TotalIndices} | Clustered: ${row.ClusteredIdx} | NonClustered: ${row.NonClusteredIdx} | Únicos: ${row.Unicos}`);
    });
    
    // 2. Uso de índices (estadísticas)
    console.log('\n' + '═'.repeat(80));
    console.log('📈 USO DE ÍNDICES (Estadísticas desde último reinicio)');
    console.log('═'.repeat(80));
    
    const usageQuery = `
      SELECT TOP 20
        OBJECT_NAME(s.object_id) AS Tabla,
        i.name AS Indice,
        s.user_seeks AS Busquedas,
        s.user_scans AS Escaneos,
        s.user_lookups AS Consultas,
        s.user_updates AS Actualizaciones,
        s.last_user_seek AS UltimaBusqueda,
        s.last_user_scan AS UltimoEscaneo
      FROM sys.dm_db_index_usage_stats AS s
      INNER JOIN sys.indexes AS i ON s.object_id = i.object_id AND s.index_id = i.index_id
      WHERE s.database_id = DB_ID()
        AND OBJECT_NAME(s.object_id) IN ('Clientes', 'Pedidos', 'Conversaciones', 'Usuarios', 'LogAccesos', 'Configuraciones', 'Mensajes')
      ORDER BY (s.user_seeks + s.user_scans + s.user_lookups) DESC;
    `;
    
    const usage = await pool.request().query(usageQuery);
    
    if (usage.recordset.length > 0) {
      console.log('\n🔍 Top 20 índices más utilizados:');
      console.log('─'.repeat(80));
      
      usage.recordset.forEach((row, idx) => {
        const totalUse = row.Busquedas + row.Escaneos + row.Consultas;
        const icon = totalUse > 1000 ? '🔥' : totalUse > 100 ? '✅' : '⚡';
        
        console.log(`\n${idx + 1}. ${icon} ${row.Tabla}.${row.Indice}`);
        console.log(`   Búsquedas: ${row.Busquedas} | Escaneos: ${row.Escaneos} | Consultas: ${row.Consultas} | Actualizaciones: ${row.Actualizaciones}`);
        if (row.UltimaBusqueda) {
          console.log(`   Última actividad: ${new Date(row.UltimaBusqueda).toLocaleString('es-MX')}`);
        }
      });
    } else {
      console.log('\nℹ️ No hay estadísticas de uso disponibles (servidor recién iniciado)');
    }
    
    // 3. Tamaño de índices
    console.log('\n' + '═'.repeat(80));
    console.log('💾 TAMAÑO DE ÍNDICES');
    console.log('═'.repeat(80));
    
    const sizeQuery = `
      SELECT 
        OBJECT_NAME(i.object_id) AS Tabla,
        i.name AS Indice,
        i.type_desc AS Tipo,
        SUM(s.used_page_count) * 8 / 1024.0 AS TamañoMB,
        SUM(s.row_count) AS Filas
      FROM sys.dm_db_partition_stats AS s
      INNER JOIN sys.indexes AS i ON s.object_id = i.object_id AND s.index_id = i.index_id
      WHERE OBJECT_NAME(i.object_id) IN ('Clientes', 'Pedidos', 'Conversaciones', 'Usuarios', 'LogAccesos', 'Configuraciones', 'Mensajes')
        AND i.name IS NOT NULL
      GROUP BY i.object_id, i.name, i.type_desc
      ORDER BY SUM(s.used_page_count) DESC;
    `;
    
    const size = await pool.request().query(sizeQuery);
    
    console.log('\n📦 Tamaño de índices (orden descendente):');
    console.log('─'.repeat(80));
    
    let totalSize = 0;
    size.recordset.forEach(row => {
      totalSize += row.TamañoMB;
      const icon = row.TamañoMB > 10 ? '📦' : row.TamañoMB > 1 ? '📁' : '📄';
      console.log(`${icon} ${row.Tabla}.${row.Indice}`);
      console.log(`   Tamaño: ${row.TamañoMB.toFixed(2)} MB | Filas: ${row.Filas.toLocaleString('es-MX')} | Tipo: ${row.Tipo}`);
    });
    
    console.log('\n─'.repeat(80));
    console.log(`💾 Espacio total usado por índices: ${totalSize.toFixed(2)} MB`);
    
    // 4. Índices duplicados o redundantes
    console.log('\n' + '═'.repeat(80));
    console.log('⚠️ ANÁLISIS DE ÍNDICES REDUNDANTES');
    console.log('═'.repeat(80));
    
    const redundantQuery = `
      WITH IndexColumns AS (
        SELECT DISTINCT
          OBJECT_NAME(i.object_id) AS Tabla,
          i.name AS Indice,
          i.index_id,
          STUFF((
            SELECT ', ' + c.name
            FROM sys.index_columns AS ic2
            INNER JOIN sys.columns AS c ON ic2.object_id = c.object_id AND ic2.column_id = c.column_id
            WHERE ic2.object_id = i.object_id 
              AND ic2.index_id = i.index_id
              AND ic2.is_included_column = 0
            ORDER BY ic2.key_ordinal
            FOR XML PATH('')
          ), 1, 2, '') AS Columnas
        FROM sys.indexes AS i
        WHERE OBJECT_NAME(i.object_id) IN ('Clientes', 'Pedidos', 'Conversaciones', 'Usuarios', 'LogAccesos', 'Configuraciones', 'Mensajes')
          AND i.type > 0
          AND i.name IS NOT NULL
      )
      SELECT 
        i1.Tabla,
        i1.Indice AS Indice1,
        i1.Columnas AS Columnas1,
        i2.Indice AS Indice2,
        i2.Columnas AS Columnas2
      FROM IndexColumns AS i1
      INNER JOIN IndexColumns AS i2 
        ON i1.Tabla = i2.Tabla 
        AND i1.index_id < i2.index_id
        AND (
          i1.Columnas = i2.Columnas
          OR i1.Columnas LIKE i2.Columnas + ',%'
          OR i2.Columnas LIKE i1.Columnas + ',%'
        )
      ORDER BY i1.Tabla, i1.Indice;
    `;
    
    const redundant = await pool.request().query(redundantQuery);
    
    if (redundant.recordset.length > 0) {
      console.log('\n⚠️ Posibles índices redundantes detectados:');
      console.log('─'.repeat(80));
      
      redundant.recordset.forEach(row => {
        console.log(`\n📁 ${row.Tabla}`);
        console.log(`   1. ${row.Indice1}: ${row.Columnas1}`);
        console.log(`   2. ${row.Indice2}: ${row.Columnas2}`);
        console.log(`   ℹ️ Considerar si ambos son necesarios`);
      });
    } else {
      console.log('\n✅ No se detectaron índices redundantes obvios');
    }
    
    // 5. Recomendaciones
    console.log('\n' + '═'.repeat(80));
    console.log('💡 RECOMENDACIONES');
    console.log('═'.repeat(80));
    
    console.log(`
✅ ÍNDICES CREADOS EN ESTA MIGRACIÓN:
   1. IX_Pedidos_Folio - Búsqueda rápida de pedidos por folio
   2. IX_Clientes_Nombre - Búsqueda de clientes por nombre
   3. IX_Conversaciones_Estado_UltimaInteraccion - Filtrado eficiente de conversaciones
   4. IX_Clientes_Activo - Filtrado de clientes activos/inactivos
   5. IX_Pedidos_Estado_Fecha - Optimización del dashboard (pedidos por estado y fecha)

📊 TOTAL DE ÍNDICES EN EL SISTEMA: ${size.recordset.length}

⚡ MEJORAS ESPERADAS:
   - Búsquedas de pedidos por folio: 5-10x más rápidas
   - Búsquedas de clientes: 3-5x más rápidas
   - Queries del dashboard: 2-3x más rápidas
   - Menor uso de CPU en queries frecuentes

🔧 MANTENIMIENTO RECOMENDADO:
   1. Reorganizar índices si fragmentación >30%
   2. Actualizar estadísticas semanalmente
   3. Monitorear Query Store para detectar queries lentas
   4. Revisar índices no usados trimestralmente

📈 PRÓXIMOS PASOS:
   1. Monitorear performance durante 1 semana
   2. Ajustar índices según patrones de uso reales
   3. Considerar índices filtered para subconjuntos específicos
   4. Evaluar columnstore indexes para tablas de logs grandes
    `);
    
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                    ANÁLISIS DE ÍNDICES - POST MIGRACIÓN 17                    ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════╝\n');

analyzeIndexes()
  .then(() => {
    console.log('\n✅ Análisis completado exitosamente\n');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Error fatal:', err.message);
    process.exit(1);
  });
