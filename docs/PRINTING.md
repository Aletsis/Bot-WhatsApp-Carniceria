# 🖨️ Sistema de Impresión - Tickets ESC/POS

Documentación del sistema de impresión automática de tickets para impresoras térmicas ESC/POS.

---

## 📋 Tabla de Contenidos

- [Descripción General](#descripción-general)
- [Impresoras Compatibles](#impresoras-compatibles)
- [Configuración](#configuración)
- [Uso](#uso)
- [Formato del Ticket](#formato-del-ticket)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Descripción General

El sistema imprime automáticamente un ticket cuando un pedido es confirmado por el cliente a través de WhatsApp. El ticket se envía a una impresora térmica ESC/POS conectada por red (TCP/IP).

**Características:**
- ✅ Impresión automática al confirmar pedido
- ✅ Formato profesional con logo ASCII
- ✅ Información completa del pedido
- ✅ Conexión por red TCP/IP
- ✅ Manejo robusto de errores (no bloquea el pedido si falla)
- ✅ Configurable (habilitar/deshabilitar)
- ✅ Compatible con anchos de 58mm y 80mm

---

## 🖨️ Impresoras Compatibles

### Impresoras Térmicas ESC/POS

El sistema es compatible con cualquier impresora térmica que soporte el protocolo **ESC/POS** (Epson Standard Code for Point of Sale).

**Marcas compatibles:**
- Epson (TM-T20, TM-T88, TM-m30)
- Star Micronics (TSP100, TSP650)
- Citizen (CT-S310, CT-S601)
- Bixolon (SRP-330, SRP-350)
- Genéricas chinas con protocolo ESC/POS

### Requisitos de la Impresora

- ✅ Protocolo ESC/POS
- ✅ Conexión de red (Ethernet o WiFi)
- ✅ Dirección IP estática o reservada en el router
- ✅ Puerto TCP abierto (default: 9100)
- ✅ Ancho de papel: 58mm o 80mm

---

## ⚙️ Configuración

### 1. Configuración de Red de la Impresora

#### Opción A: Panel de Control de la Impresora
1. Acceder al menú de la impresora
2. Navegar a "Configuración de Red"
3. Configurar:
   - IP Address: `192.168.0.100` (ejemplo)
   - Subnet Mask: `255.255.255.0`
   - Gateway: `192.168.0.1` (tu router)
4. Guardar y reiniciar

#### Opción B: Utilidad del Fabricante
1. Instalar la utilidad de configuración del fabricante
2. Conectar temporalmente por USB
3. Configurar red y asignar IP estática
4. Desconectar USB y conectar por Ethernet

### 2. Verificar Conexión

```bash
# Windows (PowerShell)
Test-NetConnection -ComputerName 192.168.0.100 -Port 9100

# Linux/Mac
nc -zv 192.168.0.100 9100
```

**Resultado esperado:** Conexión exitosa

### 3. Reservar IP en el Router

Para evitar que la IP cambie:
1. Acceder al panel de administración del router
2. Buscar "DHCP Reservations" o "Static IP"
3. Agregar la MAC address de la impresora
4. Asignar la IP deseada (ej: 192.168.0.100)

### 4. Configurar Variables de Entorno

Editar archivo `.env`:

```bash
# Habilitar/deshabilitar impresión
PRINTER_ENABLED=true

# IP de la impresora
PRINTER_HOST=192.168.0.100

# Puerto TCP (default: 9100)
PRINTER_PORT=9100
```

### 5. Reiniciar el Servidor

```bash
npm run dev
# o
npm run prod
```

---

## 📝 Uso

### Impresión Automática

La impresión se realiza **automáticamente** cuando:
1. Un cliente confirma un pedido por WhatsApp
2. El sistema guarda el pedido en la base de datos
3. Se llama a `printTicket()` con los datos del pedido
4. El ticket se envía a la impresora

**No requiere intervención manual.**

### Impresión Manual (Programática)

Para imprimir desde código:

```javascript
import { printTicket } from './src/services/printingService.js';

// Datos del pedido
const pedidoData = {
  Folio: '20241106-0001',
  NombreCliente: 'Juan Pérez',
  TelefonoCliente: '5218123456789',
  DireccionCliente: 'Av. Principal 123',
  Contenido: '1kg de bistec\n500g de chorizo\n2kg de carne molida',
  Fecha: new Date()
};

// Imprimir
await printTicket(pedidoData);
```

### Funciones Disponibles

#### `printTicket(pedido)`

Imprime un ticket con los datos del pedido.

**Parámetros:**
```javascript
{
  Folio: string,           // Folio único del pedido
  NombreCliente: string,   // Nombre del cliente
  TelefonoCliente: string, // Teléfono del cliente
  DireccionCliente: string,// Dirección de entrega
  Contenido: string,       // Detalle del pedido (multilinea)
  Fecha: Date              // Fecha y hora del pedido
}
```

**Retorna:** `Promise<void>`

**Errores:** Registra en logs pero no lanza excepciones (fail-safe)

#### `isPrinterEnabled()`

Verifica si la impresión está habilitada.

```javascript
if (isPrinterEnabled()) {
  console.log('Impresora configurada');
}
```

#### `getPrinterConfig()`

Obtiene la configuración actual de la impresora.

```javascript
const config = getPrinterConfig();
console.log(config);
// { enabled: true, host: '192.168.0.100', port: 9100 }
```

---

## 🎨 Formato del Ticket

### Ejemplo de Ticket Impreso

```
=====================================
      🥩 CARNICERIA 🥩
         ORDEN DE PEDIDO
=====================================

FOLIO: 20241106-0001
FECHA: 06/11/2024 10:30

-------------------------------------
CLIENTE
-------------------------------------
Nombre: Juan Pérez
Tel: 5218123456789

-------------------------------------
DIRECCION DE ENTREGA
-------------------------------------
Av. Principal 123

-------------------------------------
DETALLE DEL PEDIDO
-------------------------------------
1kg de bistec
500g de chorizo
2kg de carne molida

-------------------------------------
       Gracias por su compra!
=====================================


```

### Personalizar el Formato

Editar `src/services/printingService.js`:

```javascript
async function printTicket(pedido) {
  // ... código de configuración ...
  
  printer
    .font('a')
    .align('ct')
    .style('b')
    .size(1, 1)
    .text('MI CARNICERIA')  // Personalizar nombre
    .style('normal')
    .size(0, 0)
    .text('RFC: XXXXXXXXXXXX')  // Agregar RFC
    // ... resto del código ...
}
```

**Comandos disponibles:**
- `.text(str)` - Imprimir texto
- `.font('a'|'b')` - Cambiar fuente
- `.align('ct'|'lt'|'rt')` - Alineación (center, left, right)
- `.style('b'|'i'|'normal')` - Estilo (bold, italic, normal)
- `.size(width, height)` - Tamaño (0-7)
- `.drawLine()` - Línea horizontal
- `.newLine()` - Nueva línea
- `.cut()` - Cortar papel
- `.cashdraw(pin)` - Abrir cajón de dinero

---

## 🔧 Troubleshooting

### Problema: No imprime nada

**Diagnóstico:**
1. Verificar que `PRINTER_ENABLED=true` en `.env`
2. Verificar logs: `[Printing Service] Impresora deshabilitada`
3. Verificar conexión de red

**Solución:**
```bash
# Habilitar impresora
echo "PRINTER_ENABLED=true" >> .env

# Verificar conexión
ping 192.168.0.100
Test-NetConnection -ComputerName 192.168.0.100 -Port 9100

# Reiniciar servidor
npm run dev
```

---

### Problema: "Connection refused" o "ETIMEDOUT"

**Causa:** No puede conectar a la impresora.

**Solución:**
1. Verificar que la impresora esté encendida
2. Verificar la IP es correcta: `ping IP_IMPRESORA`
3. Verificar el puerto (default: 9100)
4. Verificar firewall no bloquea el puerto
5. Intentar con otra aplicación (ej: Epson TM Utility)

---

### Problema: Imprime caracteres raros

**Causa:** Codificación incorrecta.

**Solución:**
```javascript
// En printingService.js
const device = new escpos.Network(host, port, {
  encoding: 'GB18030'  // Cambiar codificación
});
```

**Codificaciones comunes:**
- `GB18030` - Chino, compatible con ASCII
- `UTF-8` - Universal
- `CP437` - Estados Unidos
- `CP850` - Europa Occidental

---

### Problema: No corta el papel

**Causa:** Impresora no tiene cutter o está deshabilitado.

**Solución:**
```javascript
// Cambiar de .cut() a .cut('partial')
printer.cut('partial');

// O agregar más newlines antes de cortar
printer.newLine().newLine().newLine().cut();
```

---

### Problema: Ticket muy ancho o muy angosto

**Causa:** Configuración de ancho incorrecta.

**Solución:**
```javascript
// Para impresora de 58mm (32 caracteres)
const WIDTH = 32;

// Para impresora de 80mm (48 caracteres)
const WIDTH = 48;

// Ajustar separadores
printer.text('='.repeat(WIDTH));
```

---

### Problema: El pedido se guarda pero no imprime

**Comportamiento esperado:** El sistema está diseñado para no fallar el pedido aunque la impresión falle.

**Logs:**
```
⚠️ Error al imprimir ticket: Connection timeout
✅ Pedido guardado correctamente (ID: 123)
```

**Solución:**
1. Verificar logs para ver el error específico
2. Corregir configuración de impresora
3. Reimprimir manualmente si es necesario

---

## 🧪 Testing

### Test de Conexión

```javascript
// scripts/test-printer.js
import escpos from 'escpos';

const device = new escpos.Network('192.168.0.100', 9100);
const printer = new escpos.Printer(device);

device.open(async (error) => {
  if (error) {
    console.error('❌ Error de conexión:', error);
    return;
  }
  
  console.log('✅ Conectado!');
  
  printer
    .font('a')
    .align('ct')
    .text('TEST DE IMPRESORA')
    .text('Si puedes leer esto,')
    .text('la conexion funciona!')
    .newLine()
    .cut()
    .close();
});
```

```bash
node scripts/test-printer.js
```

---

## 📚 Referencias

- [escpos package](https://www.npmjs.com/package/escpos)
- [ESC/POS Command Reference](https://reference.epson-biz.com/modules/ref_escpos/)
- [Epson TM Series](https://www.epson.com.mx/Para-el-trabajo/Puntos-de-venta/Impresoras-de-POS/c/pt1002)

---

## 💡 Tips

1. **Usar IP estática:** Evita problemas cuando la impresora se reinicia
2. **Probar regularmente:** Imprimir test diario para verificar funcionamiento
3. **Tener papel:** Mantener stock de papel térmico
4. **Limpieza:** Limpiar cabezal de impresión mensualmente
5. **Backup manual:** Tener método manual de anotar pedidos por si falla
