# 📝 Sistema de Logs y Monitoreo

## Descripción General

El sistema implementa un logger robusto con rotación automática usando **Pino** y **pino-roll**, optimizado para desarrollo y producción.

---

## 🎯 Características

### ✅ Rotación Automática
- **Diaria**: Nuevo archivo cada día (app-YYYY-MM-DD.log)
- **Por tamaño**: Rota si el archivo excede 10MB
- **Retención**: Elimina logs antiguos según configuración (default: 30 días)

### ✅ Niveles de Log
- `trace`: Debugging muy detallado
- `debug`: Información de debugging
- `info`: Información general (default)
- `warn`: Advertencias
- `error`: Errores no críticos
- `fatal`: Errores críticos que detienen la aplicación

### ✅ Formato
- **Desarrollo**: Pretty print colorizado en consola
- **Producción**: JSON estructurado en archivos

### ✅ Logs Estructurados
Soporte completo para logging contextual:
```javascript
logger.info({
  msg: 'Usuario autenticado',
  user: { id: 1, username: 'admin' },
  ip: '192.168.1.1',
  duration: 150
});
```

---

## ⚙️ Configuración

### Variables de Entorno (.env)

```bash
# Nivel de log: trace | debug | info | warn | error | fatal
LOG_LEVEL=info

# Retención de logs en días
LOG_RETENTION_DAYS=30

# Guardar logs en archivo en modo desarrollo
LOG_TO_FILE=false
```

### Configuración por Entorno

#### Desarrollo
```bash
NODE_ENV=development
LOG_LEVEL=debug
LOG_TO_FILE=false  # Solo consola
```

#### Producción
```bash
NODE_ENV=production
LOG_LEVEL=info     # O 'warn' para menos verbosidad
LOG_RETENTION_DAYS=30
```

---

## 📂 Estructura de Archivos

```
logs/
├── app-2025-11-06.log          # Log del día actual
├── app-2025-11-05.log          # Log de ayer
├── app-2025-11-04.log          # Log de anteayer
└── dev-2025-11-06.log          # Log de desarrollo (si LOG_TO_FILE=true)
```

---

## 🛠️ Uso en Código

### Logging Básico

```javascript
import logger from './logger.js';

// Logs simples
logger.info('Servidor iniciado');
logger.warn('Configuración faltante, usando default');
logger.error('Error de conexión a BD');
```

### Logging Estructurado

```javascript
// Con contexto
logger.info({
  msg: 'Pedido creado',
  pedidoId: 123,
  cliente: 'Juan Pérez',
  monto: 450.50,
  productos: 5
});

// Con error
try {
  await operacionRiesgosa();
} catch (err) {
  logger.error({
    err,  // Pino serializa el error automáticamente
    msg: 'Error en operación',
    context: { userId: 1, action: 'create_order' }
  });
}

// Con duración
const start = Date.now();
await queryDatabase();
logger.info({
  msg: 'Query ejecutado',
  query: 'SELECT * FROM Pedidos',
  duration: Date.now() - start,
  rows: 100
});
```

### Child Loggers (Contexto Persistente)

```javascript
// Crear logger con contexto fijo
const userLogger = logger.child({ userId: 123, username: 'admin' });

// Todos los logs incluirán userId y username
userLogger.info('Login exitoso');
userLogger.warn('Intento de acceso no autorizado');
```

---

## 📊 Scripts de Gestión

### Test de Logs
```bash
npm run logs:test
```
Genera logs de prueba en todos los niveles y muestra estadísticas.

### Ver Estadísticas
```bash
npm run logs:stats
```
Muestra información sobre archivos de log:
- Total de archivos
- Tamaño total
- Archivos por fecha

### Limpieza Manual
```bash
npm run logs:clean
```
Elimina logs más antiguos que `LOG_RETENTION_DAYS`.

---

## 🤖 Limpieza Automática

En **producción**, se ejecuta automáticamente cada 24 horas:
- Elimina logs más antiguos que `LOG_RETENTION_DAYS`
- Se ejecuta a las 00:00 del servidor
- Logs de la limpieza se registran en el log del día

```javascript
// app.js
if (isProduction) {
  setInterval(async () => {
    await cleanOldLogs();
  }, 24 * 60 * 60 * 1000);
}
```

---

## 📈 Monitoreo en Producción

### Recomendaciones

#### 1. Monitorear Espacio en Disco
```bash
# Linux/Mac
df -h /

# Windows
wmic logicaldisk get size,freespace,caption
```

#### 2. Alertas
Configurar alertas cuando:
- Logs exceden 1GB total
- Espacio en disco <10%
- Errores exceden 100/hora

#### 3. Centralización de Logs

**Opción 1: Grafana + Loki** (Recomendado)
```bash
# Instalar Promtail para enviar logs a Loki
# Grafana visualiza los logs
```

**Opción 2: ELK Stack**
```bash
# Elasticsearch: Almacenamiento
# Logstash: Pipeline de procesamiento
# Kibana: Visualización
```

**Opción 3: Servicios Cloud**
- Datadog
- New Relic
- Loggly
- Papertrail

### Integración con Loki (Ejemplo)

```yaml
# promtail-config.yaml
server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: whatsapp-bot
    static_configs:
      - targets:
          - localhost
        labels:
          job: whatsapp-bot
          __path__: /app/logs/*.log
```

---

## 🔍 Queries Útiles

### Buscar Errores del Día
```bash
# Linux/Mac
grep "ERROR" logs/app-$(date +%Y-%m-%d).log

# Windows PowerShell
Select-String -Path "logs\app-$(Get-Date -Format 'yyyy-MM-dd').log" -Pattern "ERROR"
```

### Contar Errores por Hora
```bash
# Linux/Mac
grep "ERROR" logs/app-$(date +%Y-%m-%d).log | cut -d' ' -f2 | cut -d: -f1 | sort | uniq -c
```

### Top 10 Operaciones Más Lentas
```bash
grep "duration" logs/app-*.log | sort -t: -k7 -rn | head -10
```

---

## 🚨 Troubleshooting

### Problema: Logs no se están guardando

**Solución 1**: Verificar permisos del directorio
```bash
# Linux/Mac
chmod 755 logs/

# Windows
icacls logs /grant Everyone:F
```

**Solución 2**: Verificar configuración
```bash
npm run logs:test
```

### Problema: Logs llenan el disco

**Solución 1**: Reducir retención
```bash
# .env
LOG_RETENTION_DAYS=7  # En vez de 30
```

**Solución 2**: Aumentar nivel de log
```bash
# .env
LOG_LEVEL=warn  # En vez de info o debug
```

**Solución 3**: Limpieza manual
```bash
npm run logs:clean
```

### Problema: Performance degradado

**Causa**: Logging excesivo en producción

**Solución**:
```bash
# .env
LOG_LEVEL=warn  # Solo warnings y errores
```

---

## 📝 Best Practices

### ✅ DO

1. **Usar niveles apropiados**
   ```javascript
   logger.debug('Variable X tiene valor:', x);  // Debugging
   logger.info('Pedido creado exitosamente');    // Información
   logger.warn('API rate limit cerca del límite'); // Advertencia
   logger.error('Error conectando a BD');         // Error
   ```

2. **Incluir contexto**
   ```javascript
   logger.error({
     err,
     msg: 'Error procesando pedido',
     pedidoId: 123,
     userId: 456
   });
   ```

3. **Logs estructurados**
   ```javascript
   logger.info({
     msg: 'Usuario autenticado',
     user: { id: 1, username: 'admin' },
     duration: 150
   });
   ```

### ❌ DON'T

1. **No loguear información sensible**
   ```javascript
   // ❌ MAL
   logger.info({ password: req.body.password });
   
   // ✅ BIEN
   logger.info({ username: req.body.username });
   ```

2. **No loguear en loops intensos**
   ```javascript
   // ❌ MAL
   for (let i = 0; i < 10000; i++) {
     logger.debug('Procesando item', i);
   }
   
   // ✅ BIEN
   logger.debug('Procesando 10000 items...');
   // ... procesamiento ...
   logger.debug('Items procesados exitosamente');
   ```

3. **No loguear objetos enormes**
   ```javascript
   // ❌ MAL
   logger.info({ fullDatabase: await getAllData() });
   
   // ✅ BIEN
   logger.info({ recordCount: data.length });
   ```

---

## 🎯 Métricas Clave a Monitorear

1. **Errores por minuto** (normal: <5, crítico: >20)
2. **Tamaño de logs** (normal: <100MB/día, crítico: >1GB/día)
3. **Duraciones de operaciones** (queries DB, llamadas API)
4. **Rate de requests** (para detectar anomalías)
5. **Uso de memoria/CPU** (correlacionar con eventos)

---

## 🔐 Seguridad

### Datos Sensibles

Pino automáticamente redacta campos sensibles si los configuras:

```javascript
const logger = pino({
  redact: {
    paths: ['password', 'token', 'apiKey', '*.password'],
    censor: '[REDACTED]'
  }
});

logger.info({ username: 'admin', password: '12345' });
// Output: { username: 'admin', password: '[REDACTED]' }
```

### Auditoría

Los logs son fundamentales para auditoría:
- Mantener retención de 30-90 días
- Logs inmutables (no modificar archivos antiguos)
- Backup periódico de logs críticos
- Acceso restringido al directorio de logs

---

## 📚 Referencias

- [Pino Documentation](https://getpino.io/)
- [Pino-roll GitHub](https://github.com/feugy/pino-roll)
- [12 Factor App - Logs](https://12factor.net/logs)
- [Structured Logging Best Practices](https://www.loggly.com/ultimate-guide/structured-logging/)
