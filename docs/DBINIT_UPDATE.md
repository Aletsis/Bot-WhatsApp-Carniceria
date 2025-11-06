# Actualización de dbInitService.js - Sprint 2

## ✅ Cambios Realizados

Se actualizó `src/services/dbInitService.js` para incluir los nuevos campos agregados en el Sprint 2 al momento de crear las tablas desde cero.

---

## 📋 Cambios en Tabla `Pedidos`

### Campos Agregados
```sql
EstadoImpresion NVARCHAR(50) NOT NULL DEFAULT 'Pendiente'
FechaImpresion DATETIME2 NULL
ErrorImpresion NVARCHAR(500) NULL
```

### Constraint Agregado
```sql
CONSTRAINT CK_Pedidos_EstadoImpresion 
CHECK (EstadoImpresion IN ('Pendiente', 'Impreso', 'Error', 'NoRequerida', 'Reimprimiendo'))
```

### Índice Agregado
```sql
CREATE INDEX IX_Pedidos_EstadoImpresion ON Pedidos(EstadoImpresion);
```

**Propósito:** Rastrear el estado de impresión de cada pedido y permitir reimpresión.

---

## 💬 Cambios en Tabla `Conversaciones`

### Campo Agregado
```sql
TimeoutExpiraEn DATETIME2 NULL
```

### Índice Agregado (Filtrado)
```sql
CREATE INDEX IX_Conversaciones_TimeoutExpiraEn 
ON Conversaciones(TimeoutExpiraEn)
WHERE TimeoutExpiraEn IS NOT NULL;
```

**Propósito:** Persistir timeouts en BD para sobrevivir reinicios del servidor.

---

## 🎯 Beneficios

1. **Consistencia Total**
   - Las instalaciones nuevas tendrán el esquema completo desde el inicio
   - No se requieren migraciones adicionales en bases de datos nuevas

2. **Mantenibilidad**
   - Un solo lugar para definir el esquema completo
   - Migraciones solo para bases de datos existentes

3. **Documentación Viva**
   - `dbInitService.js` refleja el estado actual del esquema
   - Fácil de revisar qué campos y constraints existen

---

## 🔄 Flujo de Actualización

### Para BD Existentes (Ya Creadas)
```bash
node scripts/run-migration.js 03_timeout_expira_en.sql
node scripts/run-migration.js 04_estado_impresion.sql
```

### Para BD Nuevas (Desde Cero)
```bash
node scripts/init-db.js
```
✅ Ya incluye todos los campos del Sprint 2

---

## ✅ Validación

Ejecutar script de validación:
```bash
node scripts/run-migration.js validate-schema.sql
```

Este script verifica:
- ✅ Existencia de columnas nuevas
- ✅ Existencia de constraints
- ✅ Existencia de índices
- ✅ Tipos de datos correctos

---

## 📊 Esquema Final

### Tabla Pedidos (Actualizada)
```
PedidoID            BIGINT (PK, Identity)
ClienteID           INT (FK → Clientes)
Folio               NVARCHAR(30)
Contenido           NVARCHAR(MAX)
Estado              NVARCHAR(50) DEFAULT 'En espera de surtir'
Fecha               DATETIME2 DEFAULT SYSDATETIME()
Notas               NVARCHAR(1000) NULL
EstadoImpresion     NVARCHAR(50) DEFAULT 'Pendiente' ⭐ NUEVO
FechaImpresion      DATETIME2 NULL ⭐ NUEVO
ErrorImpresion      NVARCHAR(500) NULL ⭐ NUEVO
```

### Tabla Conversaciones (Actualizada)
```
NumeroTelefono      NVARCHAR(30) (PK)
Estado              NVARCHAR(50)
Buffer              NVARCHAR(MAX) NULL
NombreTemporal      NVARCHAR(200) NULL
UltimaInteraccion   DATETIME2 DEFAULT SYSDATETIME()
TimeoutExpiraEn     DATETIME2 NULL ⭐ NUEVO
```

---

## 🔍 Verificación Manual

### Ver Columnas de Pedidos
```sql
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Pedidos'
ORDER BY ORDINAL_POSITION;
```

### Ver Columnas de Conversaciones
```sql
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Conversaciones'
ORDER BY ORDINAL_POSITION;
```

### Ver Constraints
```sql
SELECT name, definition
FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID('Pedidos');
```

### Ver Índices
```sql
SELECT name, type_desc
FROM sys.indexes
WHERE object_id = OBJECT_ID('Pedidos')
   OR object_id = OBJECT_ID('Conversaciones');
```

---

**Fecha:** 2025-01-06  
**Sprint:** 2  
**Archivo:** `src/services/dbInitService.js`  
**Estado:** ✅ Actualizado y Validado
