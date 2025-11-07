import dotenv from 'dotenv';
import sql from 'mssql';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

async function runMigration() {
  let pool;
  
  try {
    console.log('🔌 Conectando a SQL Server...');
    pool = await sql.connect(config);
    console.log('✅ Conectado exitosamente\n');
    
    // Leer el archivo de migración
    const migrationPath = join(__dirname, '..', 'migrations', '17_indices_adicionales.sql');
    console.log('📄 Leyendo migración:', migrationPath);
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    // Dividir por GO statements
    const batches = migrationSQL
      .split(/\r?\n\s*GO\s*\r?\n/gi)
      .map(batch => batch.trim())
      .filter(batch => batch.length > 0);
    
    console.log(`📦 Ejecutando ${batches.length} lotes SQL...\n`);
    console.log('═'.repeat(70));
    
    // Ejecutar cada lote
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      // Omitir comentarios puros
      if (batch.startsWith('--') && !batch.includes('CREATE') && !batch.includes('UPDATE')) {
        continue;
      }
      
      try {
        const result = await pool.request().query(batch);
        
        // Mostrar mensajes PRINT
        if (result.recordsets && result.recordsets.length > 0) {
          result.recordsets.forEach(recordset => {
            recordset.forEach(row => {
              if (row['']) {
                console.log(row['']);
              }
            });
          });
        }
      } catch (err) {
        console.error(`❌ Error en lote ${i + 1}:`, err.message);
        // Continuar con los siguientes lotes
      }
    }
    
    console.log('═'.repeat(70));
    console.log('\n🎉 Migración completada\n');
    
    // Verificar índices creados
    console.log('🔍 Verificando índices creados...\n');
    
    const indexQuery = `
      SELECT 
        t.name AS Tabla,
        i.name AS Indice,
        i.type_desc AS Tipo,
        STUFF((
          SELECT ', ' + c.name
          FROM sys.index_columns AS ic
          INNER JOIN sys.columns AS c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
          WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id
          ORDER BY ic.key_ordinal
          FOR XML PATH('')
        ), 1, 2, '') AS Columnas
      FROM 
        sys.indexes AS i
      INNER JOIN sys.tables AS t ON i.object_id = t.object_id
      WHERE 
        t.name IN ('Clientes', 'Pedidos', 'Conversaciones', 'Usuarios', 'LogAccesos', 'Configuraciones', 'Mensajes')
        AND i.type > 0
        AND i.name LIKE 'IX_%'
      ORDER BY 
        t.name, i.name;
    `;
    
    const result = await pool.request().query(indexQuery);
    
    console.log('📊 Índices actuales en el sistema:');
    console.log('─'.repeat(70));
    
    let currentTable = '';
    let totalIndexes = 0;
    
    result.recordset.forEach(row => {
      if (currentTable !== row.Tabla) {
        if (currentTable !== '') console.log('');
        currentTable = row.Tabla;
        console.log(`\n📁 ${row.Tabla}:`);
      }
      console.log(`  ✅ ${row.Indice}`);
      console.log(`     Tipo: ${row.Tipo}`);
      console.log(`     Columnas: ${row.Columnas}`);
      totalIndexes++;
    });
    
    console.log('\n─'.repeat(70));
    console.log(`📊 Total de índices: ${totalIndexes}`);
    
    // Verificar fragmentación
    console.log('\n🔍 Verificando fragmentación de índices...\n');
    
    const fragQuery = `
      SELECT TOP 10
        OBJECT_NAME(ips.object_id) AS Tabla,
        i.name AS Indice,
        CAST(ips.avg_fragmentation_in_percent AS DECIMAL(5,2)) AS Fragmentacion,
        ips.page_count AS Paginas,
        CASE 
          WHEN ips.avg_fragmentation_in_percent > 30 THEN 'CRITICO'
          WHEN ips.avg_fragmentation_in_percent > 10 THEN 'MODERADO'
          ELSE 'OK'
        END AS Estado
      FROM 
        sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'LIMITED') AS ips
      INNER JOIN sys.indexes AS i ON ips.object_id = i.object_id AND ips.index_id = i.index_id
      WHERE 
        ips.avg_fragmentation_in_percent > 0
        AND ips.page_count > 50
      ORDER BY 
        ips.avg_fragmentation_in_percent DESC;
    `;
    
    const fragResult = await pool.request().query(fragQuery);
    
    if (fragResult.recordset.length > 0) {
      console.log('📈 Top 10 índices con mayor fragmentación:');
      console.log('─'.repeat(70));
      
      fragResult.recordset.forEach(row => {
        const icon = row.Estado === 'CRITICO' ? '🔴' : 
                     row.Estado === 'MODERADO' ? '🟡' : '🟢';
        console.log(`${icon} ${row.Tabla}.${row.Indice}`);
        console.log(`   Fragmentación: ${row.Fragmentacion}% | Páginas: ${row.Paginas} | Estado: ${row.Estado}`);
      });
    } else {
      console.log('✅ No hay índices con fragmentación significativa');
    }
    
  } catch (err) {
    console.error('\n❌ Error ejecutando migración:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n🔌 Conexión cerrada');
    }
  }
}

// Ejecutar migración
console.log('╔════════════════════════════════════════════════════════════════════╗');
console.log('║         Migración 17: Índices Adicionales para Optimización       ║');
console.log('╚════════════════════════════════════════════════════════════════════╝\n');

runMigration()
  .then(() => {
    console.log('\n✅ Proceso completado exitosamente');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Error fatal:', err.message);
    process.exit(1);
  });
