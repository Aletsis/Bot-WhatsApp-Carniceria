# Sistema de Respaldos Automáticos

Sistema completo de respaldos automáticos para la base de datos SQL Server con soporte para respaldos completos (FULL) y diferenciales (DIFFERENTIAL), verificación de integridad, retención automática y programación con cron.

## 📋 Tabla de Contenidos

- [Características](#características)
- [Configuración](#configuración)
- [Uso Manual](#uso-manual)
- [Uso Automático](#uso-automático)
- [Estructura de Archivos](#estructura-de-archivos)
- [Restauración](#restauración)
- [Monitoreo](#monitoreo)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)
- [Ejemplos SQL](#ejemplos-sql)

## ✨ Características

### Tipos de Respaldo

- **FULL (Completo)**: Respaldo completo de toda la base de datos
- **DIFF (Diferencial)**: Respaldo de cambios desde el último FULL

### Funcionalidades

✅ **Compresión automática** - Reduce el tamaño de los archivos hasta 70%
✅ **Verificación de integridad** - RESTORE VERIFYONLY + CHECKSUM
✅ **Retención configurable** - Limpieza automática de respaldos antiguos
✅ **Programación flexible** - Cron jobs para ejecución automática
✅ **Logging estructurado** - Registro detallado de todas las operaciones
✅ **Estadísticas en tiempo real** - Monitoreo del estado de los respaldos
✅ **Scripts CLI** - Herramientas de línea de comandos
✅ **Servicio programático** - API para integración en la aplicación

## ⚙️ Configuración

### Variables de Entorno

Agregar a `.env`:

```properties
# ============================================
# RESPALDOS AUTOMÁTICOS DE BASE DE DATOS
# ============================================

# Habilitar respaldos automáticos (solo producción)
BACKUP_ENABLED=true

# Directorio de respaldos (ruta del servidor SQL)
# IMPORTANTE: El usuario de SQL Server debe tener permisos de escritura
BACKUP_PATH=C:\\Backups\\CarniceriaDB

# Horarios de respaldo (formato cron)
BACKUP_SCHEDULE_FULL=0 2 * * *      # Diario a las 2:00 AM
BACKUP_SCHEDULE_DIFF=0 */6 * * *    # Cada 6 horas

# Retención de respaldos (días)
BACKUP_RETENTION_FULL_DAYS=7        # Mantener FULL por 7 días
BACKUP_RETENTION_DIFF_DAYS=30       # Mantener DIFF por 30 días

# Opciones de respaldo
BACKUP_COMPRESSION=true              # Compresión (recomendado)
BACKUP_CHECKSUM=true                 # Verificación de integridad (recomendado)
```

### Formato Cron

```
┌───────────── minuto (0 - 59)
│ ┌───────────── hora (0 - 23)
│ │ ┌───────────── día del mes (1 - 31)
│ │ │ ┌───────────── mes (1 - 12)
│ │ │ │ ┌───────────── día de la semana (0 - 6) (Domingo = 0)
│ │ │ │ │
│ │ │ │ │
* * * * *
```

**Ejemplos comunes:**

```bash
# Diario a las 2:00 AM
0 2 * * *

# Cada 6 horas (00:00, 06:00, 12:00, 18:00)
0 */6 * * *

# Cada 4 horas
0 */4 * * *

# Lunes a viernes a las 3:00 AM
0 3 * * 1-5

# Primer día de cada mes a la medianoche
0 0 1 * *

# Domingos a las 1:00 AM
0 1 * * 0
```

### Permisos SQL Server

El usuario de SQL Server debe tener:

```sql
-- Permiso para crear respaldos
GRANT BACKUP DATABASE TO [usuario];

-- Verificar permisos
SELECT 
    dp.name AS [Usuario],
    dp.type_desc,
    pe.permission_name,
    pe.state_desc
FROM sys.database_permissions pe
INNER JOIN sys.database_principals dp ON pe.grantee_principal_id = dp.principal_id
WHERE dp.name = 'tu_usuario';
```

## 🖥️ Uso Manual

### Scripts NPM

```bash
# Crear respaldo completo (FULL)
npm run backup:full

# Crear respaldo diferencial (DIFF)
npm run backup:diff

# Ver estadísticas de respaldos
npm run backup:stats

# Limpiar respaldos antiguos manualmente
npm run backup:clean

# Ejecutar suite de pruebas completa
npm run backup:test
```

### Script de Línea de Comandos

```bash
# Respaldo completo
node scripts/backup-database.js full

# Respaldo diferencial
node scripts/backup-database.js diff

# Estadísticas
node scripts/backup-database.js stats

# Limpieza
node scripts/backup-database.js clean
```

### Uso Programático

```javascript
import backupService from './src/services/backupService.js';

// Crear respaldo completo
const fullBackup = await backupService.createFullBackup();
console.log(`Creado: ${fullBackup.fileName} (${fullBackup.size} MB)`);

// Crear respaldo diferencial
const diffBackup = await backupService.createDifferentialBackup();

// Verificar integridad
const isValid = await backupService.verifyBackup(fullBackup.filePath);

// Obtener estadísticas
const stats = await backupService.getBackupStats();

// Limpiar respaldos antiguos
const cleaned = await backupService.cleanOldBackups();

// Ciclo completo (crear + verificar + limpiar)
const result = await backupService.runBackupCycle('full');
```

## 🤖 Uso Automático (Producción)

### Activación

Los respaldos automáticos se activan cuando:

1. `NODE_ENV=production`
2. `BACKUP_ENABLED=true`

### Programación Predeterminada

```javascript
// Respaldo FULL: Diario a las 2:00 AM
BACKUP_SCHEDULE_FULL=0 2 * * *

// Respaldo DIFF: Cada 6 horas (00:00, 06:00, 12:00, 18:00)
BACKUP_SCHEDULE_DIFF=0 */6 * * *
```

### Logs de Respaldos Automáticos

Los respaldos automáticos se registran en el sistema de logs:

```bash
# Ver logs de respaldos
grep "respaldo" logs/app-2024-11-07.log

# Ver solo respaldos FULL
grep "respaldo completo" logs/app-2024-11-07.log

# Ver errores en respaldos
grep "Error en respaldo" logs/app-2024-11-07.log | grep error
```

## 📁 Estructura de Archivos

### Convención de Nombres

```
{DatabaseName}_{Type}_{Timestamp}.bak

Ejemplos:
CarniceriaDB_FULL_2024-11-07_02-00-00.bak
CarniceriaDB_DIFF_2024-11-07_08-00-00.bak
```

### Organización

```
C:\Backups\CarniceriaDB\
├── CarniceriaDB_FULL_2024-11-07_02-00-00.bak   (último FULL)
├── CarniceriaDB_DIFF_2024-11-07_08-00-00.bak   (DIFF 1)
├── CarniceriaDB_DIFF_2024-11-07_14-00-00.bak   (DIFF 2)
├── CarniceriaDB_DIFF_2024-11-07_20-00-00.bak   (DIFF 3)
└── CarniceriaDB_FULL_2024-11-06_02-00-00.bak   (FULL anterior)
```

### Política de Retención

**FULL (7 días):**
- Mantiene los últimos 7 respaldos completos
- Elimina automáticamente los más antiguos

**DIFF (30 días):**
- Mantiene respaldos diferenciales por 30 días
- Útil para recuperación point-in-time

## 🔄 Restauración

### Restauración Completa (Solo FULL)

```sql
USE master;
GO

-- 1. Poner BD en modo single-user (desconectar usuarios)
ALTER DATABASE CarniceriaDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
GO

-- 2. Restaurar desde el backup FULL
RESTORE DATABASE CarniceriaDB
FROM DISK = 'C:\Backups\CarniceriaDB\CarniceriaDB_FULL_2024-11-07_02-00-00.bak'
WITH REPLACE, RECOVERY;
GO

-- 3. Volver a modo multi-user
ALTER DATABASE CarniceriaDB SET MULTI_USER;
GO
```

### Restauración con FULL + DIFF

```sql
USE master;
GO

-- 1. Poner BD en modo single-user
ALTER DATABASE CarniceriaDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
GO

-- 2. Restaurar FULL (sin recuperar aún)
RESTORE DATABASE CarniceriaDB
FROM DISK = 'C:\Backups\CarniceriaDB\CarniceriaDB_FULL_2024-11-07_02-00-00.bak'
WITH REPLACE, NORECOVERY;
GO

-- 3. Restaurar DIFF (recuperar ahora)
RESTORE DATABASE CarniceriaDB
FROM DISK = 'C:\Backups\CarniceriaDB\CarniceriaDB_DIFF_2024-11-07_14-00-00.bak'
WITH RECOVERY;
GO

-- 4. Volver a modo multi-user
ALTER DATABASE CarniceriaDB SET MULTI_USER;
GO
```

### Verificar Contenido del Backup

```sql
-- Ver información del backup
RESTORE HEADERONLY
FROM DISK = 'C:\Backups\CarniceriaDB\CarniceriaDB_FULL_2024-11-07_02-00-00.bak';

-- Ver archivos incluidos en el backup
RESTORE FILELISTONLY
FROM DISK = 'C:\Backups\CarniceriaDB\CarniceriaDB_FULL_2024-11-07_02-00-00.bak';

-- Verificar integridad sin restaurar
RESTORE VERIFYONLY
FROM DISK = 'C:\Backups\CarniceriaDB\CarniceriaDB_FULL_2024-11-07_02-00-00.bak'
WITH CHECKSUM;
```

### Restaurar a Diferente Nombre

```sql
-- Útil para crear copia de prueba
RESTORE DATABASE CarniceriaDB_Test
FROM DISK = 'C:\Backups\CarniceriaDB\CarniceriaDB_FULL_2024-11-07_02-00-00.bak'
WITH MOVE 'CarniceriaDB' TO 'C:\SQLData\CarniceriaDB_Test.mdf',
     MOVE 'CarniceriaDB_log' TO 'C:\SQLData\CarniceriaDB_Test_log.ldf',
     RECOVERY;
```

## 📊 Monitoreo

### Estadísticas en la Aplicación

```bash
# Ver estadísticas actuales
npm run backup:stats
```

Salida ejemplo:
```
📊 Estadísticas de respaldos:
  📁 Directorio: C:\Backups\CarniceriaDB
  📦 Total archivos: 12
  🔵 Respaldos FULL: 3
  🟡 Respaldos DIFF: 9
  💾 Tamaño total: 1,245.67 MB
  📅 Más antiguo: CarniceriaDB_FULL_2024-11-01_02-00-00.bak (6 días)
  🆕 Más reciente: CarniceriaDB_DIFF_2024-11-07_14-00-00.bak (0 días)
  🔧 Retención FULL: 7 días
  🔧 Retención DIFF: 30 días
```

### Consultas SQL Server

```sql
-- Historial de respaldos en SQL Server
SELECT 
    database_name,
    type AS backup_type,
    CASE type
        WHEN 'D' THEN 'Full'
        WHEN 'I' THEN 'Differential'
        WHEN 'L' THEN 'Log'
    END AS type_desc,
    backup_start_date,
    backup_finish_date,
    DATEDIFF(SECOND, backup_start_date, backup_finish_date) AS duration_seconds,
    CAST(backup_size / 1024.0 / 1024.0 AS DECIMAL(10,2)) AS size_mb,
    CAST(compressed_backup_size / 1024.0 / 1024.0 AS DECIMAL(10,2)) AS compressed_size_mb,
    physical_device_name
FROM msdb.dbo.backupset
WHERE database_name = 'CarniceriaDB'
ORDER BY backup_start_date DESC;

-- Último respaldo FULL
SELECT TOP 1
    backup_start_date,
    DATEDIFF(DAY, backup_start_date, GETDATE()) AS days_old,
    CAST(compressed_backup_size / 1024.0 / 1024.0 AS DECIMAL(10,2)) AS size_mb
FROM msdb.dbo.backupset
WHERE database_name = 'CarniceriaDB' AND type = 'D'
ORDER BY backup_start_date DESC;

-- Espacio usado en disco
EXEC xp_fixeddrives;
```

### Alertas Recomendadas

**Configurar alertas para:**

1. **No hay FULL reciente** (> 2 días)
2. **Error en backup** (revisar logs)
3. **Espacio en disco bajo** (< 20%)
4. **Backup muy grande** (crecimiento anormal)
5. **Verificación fallida** (integridad comprometida)

## 🔧 Troubleshooting

### Errores Comunes

#### Error: "Directory not found"

**Causa:** El directorio `BACKUP_PATH` no existe o SQL Server no tiene permisos.

**Solución:**
```powershell
# Crear directorio
New-Item -Path "C:\Backups\CarniceriaDB" -ItemType Directory -Force

# Dar permisos a SQL Server
icacls "C:\Backups\CarniceriaDB" /grant "NT Service\MSSQLSERVER:(OI)(CI)F" /T
```

#### Error: "No existe respaldo FULL previo"

**Causa:** Intentando crear DIFF sin un FULL previo.

**Solución:**
```bash
# Crear primero un backup FULL
npm run backup:full

# Luego crear DIFF
npm run backup:diff
```

#### Error: "Backup verification failed"

**Causa:** Archivo de respaldo corrupto.

**Solución:**
1. Eliminar el backup corrupto
2. Crear un nuevo backup FULL
3. Verificar integridad de la BD:
   ```sql
   DBCC CHECKDB('CarniceriaDB') WITH NO_INFOMSGS;
   ```

#### Error: "Out of disk space"

**Causa:** No hay espacio suficiente en disco.

**Solución:**
```bash
# 1. Limpiar backups antiguos
npm run backup:clean

# 2. Reducir retención
# En .env: BACKUP_RETENTION_FULL_DAYS=3
# En .env: BACKUP_RETENTION_DIFF_DAYS=7

# 3. Verificar espacio
Get-PSDrive C
```

### Logs de Depuración

```bash
# Ver todos los logs relacionados con backups
Select-String -Path "logs\app-*.log" -Pattern "respaldo|backup" | Select-Object -Last 50

# Ver solo errores
Select-String -Path "logs\app-*.log" -Pattern "Error.*respaldo" | Select-Object -Last 20

# Filtrar por fecha específica
Get-Content "logs\app-2024-11-07.log" | Select-String "respaldo"
```

### Verificar Salud del Sistema

```bash
# Ejecutar suite de pruebas completa
npm run backup:test
```

## 📝 Best Practices

### DO ✅

- ✅ **Mantener al menos 2 FULL** para redundancia
- ✅ **Verificar espacio en disco** regularmente
- ✅ **Probar restauraciones** periódicamente
- ✅ **Monitorear logs** de respaldos
- ✅ **Guardar backups en otro servidor** (opcional)
- ✅ **Documentar procedimientos** de restauración
- ✅ **Ejecutar `backup:test`** después de cambios

### DON'T ❌

- ❌ **No confiar solo en DIFF** - Siempre necesitas un FULL base
- ❌ **No ignorar errores** en los logs
- ❌ **No eliminar manualmente** archivos .bak sin verificar
- ❌ **No cambiar BACKUP_PATH** sin mover archivos existentes
- ❌ **No desactivar CHECKSUM** en producción
- ❌ **No usar retenciones muy cortas** (< 3 días para FULL)

### Estrategia Recomendada 3-2-1

**3** copias de los datos:
- Original (BD productiva)
- Backup local (BACKUP_PATH)
- Backup remoto (otro servidor/nube)

**2** tipos de medios diferentes:
- Disco local
- Almacenamiento en red/nube

**1** copia offsite:
- En otra ubicación física

### Programación Óptima

**Para sistemas con alta transaccionalidad:**
```properties
# FULL: Una vez al día (2 AM)
BACKUP_SCHEDULE_FULL=0 2 * * *

# DIFF: Cada 4 horas
BACKUP_SCHEDULE_DIFF=0 */4 * * *

# Retención: 7 días FULL, 14 días DIFF
BACKUP_RETENTION_FULL_DAYS=7
BACKUP_RETENTION_DIFF_DAYS=14
```

**Para sistemas con baja transaccionalidad:**
```properties
# FULL: Una vez al día (2 AM)
BACKUP_SCHEDULE_FULL=0 2 * * *

# DIFF: Cada 12 horas (2 PM)
BACKUP_SCHEDULE_DIFF=0 14 * * *

# Retención: 7 días FULL, 30 días DIFF
BACKUP_RETENTION_FULL_DAYS=7
BACKUP_RETENTION_DIFF_DAYS=30
```

## 📚 Ejemplos SQL

### Backup Manual con T-SQL

```sql
-- Full backup con compresión
BACKUP DATABASE CarniceriaDB
TO DISK = 'C:\Backups\CarniceriaDB\manual_full.bak'
WITH COMPRESSION, CHECKSUM, STATS = 10;

-- Differential backup
BACKUP DATABASE CarniceriaDB
TO DISK = 'C:\Backups\CarniceriaDB\manual_diff.bak'
WITH DIFFERENTIAL, COMPRESSION, CHECKSUM, STATS = 10;

-- Verificar backup
RESTORE VERIFYONLY
FROM DISK = 'C:\Backups\CarniceriaDB\manual_full.bak'
WITH CHECKSUM;
```

### Información de Backups

```sql
-- Ver progreso de backup en ejecución
SELECT 
    session_id,
    command,
    percent_complete,
    CAST((estimated_completion_time / 1000.0 / 60.0) AS DECIMAL(10,2)) AS minutes_remaining,
    start_time
FROM sys.dm_exec_requests
WHERE command LIKE '%BACKUP%';

-- Estadísticas de compresión
SELECT 
    database_name,
    backup_size / 1024.0 / 1024.0 AS uncompressed_mb,
    compressed_backup_size / 1024.0 / 1024.0 AS compressed_mb,
    CAST((1.0 - compressed_backup_size * 1.0 / backup_size) * 100 AS DECIMAL(5,2)) AS compression_ratio
FROM msdb.dbo.backupset
WHERE database_name = 'CarniceriaDB'
  AND type = 'D'
ORDER BY backup_start_date DESC;
```

### Limpieza Manual de Historial

```sql
-- Eliminar historial de backups > 90 días
EXEC msdb.dbo.sp_delete_backuphistory @oldest_date = '2024-08-01';

-- Ver tamaño de msdb (donde se guarda el historial)
EXEC sp_spaceused;
```

## 🔐 Seguridad

### Cifrado de Backups

```sql
-- Crear certificado para cifrado
CREATE CERTIFICATE BackupCert
WITH SUBJECT = 'Certificado para cifrar backups';

-- Backup cifrado
BACKUP DATABASE CarniceriaDB
TO DISK = 'C:\Backups\CarniceriaDB\encrypted.bak'
WITH ENCRYPTION (
    ALGORITHM = AES_256,
    SERVER CERTIFICATE = BackupCert
),
COMPRESSION, CHECKSUM;
```

### Permisos Mínimos

```sql
-- Crear usuario solo para backups
CREATE LOGIN BackupUser WITH PASSWORD = 'Strong@Password123';
CREATE USER BackupUser FOR LOGIN BackupUser;

-- Dar solo permisos de backup
GRANT BACKUP DATABASE TO BackupUser;
GRANT BACKUP LOG TO BackupUser;
```

## 📞 Soporte

Para problemas o preguntas:

1. Revisar esta documentación
2. Ejecutar `npm run backup:test` para diagnosticar
3. Revisar logs en `logs/app-*.log`
4. Consultar documentación de SQL Server

---

**Última actualización:** 7 de noviembre de 2024  
**Versión del sistema:** 1.0.0
