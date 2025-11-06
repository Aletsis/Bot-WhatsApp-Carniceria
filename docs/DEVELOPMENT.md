# 🛠️ Guía de Desarrollo

Guía completa para desarrolladores que trabajen en el proyecto Bot WhatsApp Carnicería.

---

## 📋 Tabla de Contenidos

- [Configuración del Entorno](#configuración-del-entorno)
- [Arquitectura del Proyecto](#arquitectura-del-proyecto)
- [Flujo de Trabajo](#flujo-de-trabajo)
- [Estándares de Código](#estándares-de-código)
- [Testing](#testing)
- [Debugging](#debugging)
- [Troubleshooting](#troubleshooting)

---

## 🚀 Configuración del Entorno

### Requisitos Previos

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **SQL Server** 2017+ o SQL Server Express
- **Git**
- **Editor**: VS Code (recomendado)

### Extensiones de VS Code Recomendadas

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "msjsdiag.vscode-react-native"
  ]
}
```

### Instalación

1. **Clonar el repositorio:**
```bash
git clone https://github.com/Aletsis/Bot-WhatsApp-Carniceria.git
cd Bot-WhatsApp-Carniceria
```

2. **Instalar dependencias del backend:**
```bash
npm install
```

3. **Instalar dependencias del frontend:**
```bash
cd client
npm install
cd ..
```

4. **Configurar variables de entorno:**
```bash
cp .env.example .env
# Editar .env con tus credenciales
```

5. **Inicializar base de datos:**
```bash
npm run init-db
```

6. **Iniciar en modo desarrollo:**
```bash
npm run dev:all
```

---

## 🏗️ Arquitectura del Proyecto

### Backend (Node.js + Express)

```
src/
├── controllers/      # Lógica de negocio
│   ├── authController.js
│   ├── dashboardController.js
│   └── webhookController.js
├── handlers/        # Manejadores de eventos
│   ├── buttonHandlers.js
│   └── stateHandlers.js
├── middleware/      # Middleware de Express
│   └── auth.js
├── routes/          # Definición de rutas
│   ├── auth.js
│   ├── dashboard.js
│   └── webhook.js
├── services/        # Capa de servicios
│   ├── dbService.js
│   ├── printingService.js
│   ├── sessionService.js
│   ├── userService.js
│   └── whatsappService.js
└── utils/           # Utilidades
    └── validators.js
```

**Patrón de diseño:** MVC (Model-View-Controller)

- **Controllers**: Reciben requests, invocan servicios, retornan responses
- **Services**: Lógica de negocio reutilizable
- **Routes**: Definición de endpoints y middleware
- **Middleware**: Autenticación, autorización, rate limiting

### Frontend (React + Vite)

```
client/src/
├── api/                # Capa de servicios API
│   ├── axios.js       # Configuración Axios
│   └── services.js    # Funciones de API
├── components/        # Componentes React
│   ├── common/        # Componentes reutilizables
│   ├── layout/        # Layout components
│   └── ProtectedRoute.jsx
├── contexts/          # Context API
│   └── AuthContext.jsx
├── pages/             # Páginas principales
│   ├── LoginPage.jsx
│   ├── PedidosPage.jsx
│   ├── ClientesPage.jsx
│   ├── ConversacionesPage.jsx
│   └── UsuariosPage.jsx
└── App.jsx           # Componente raíz
```

**Patrón de diseño:** Component-based architecture

- **Pages**: Páginas completas de la aplicación
- **Components**: Componentes reutilizables
- **Contexts**: Estado global (autenticación)
- **API Services**: Abstracción de llamadas HTTP

---

## 🔄 Flujo de Trabajo

### 1. Crear una Nueva Feature

```bash
# Crear nueva rama
git checkout -b feature/nombre-feature

# Hacer cambios...
git add .
git commit -m "feat: descripción de la feature"

# Push
git push origin feature/nombre-feature
```

### 2. Estructura de Commits

Seguimos **Conventional Commits**:

- `feat:` Nueva funcionalidad
- `fix:` Corrección de bug
- `docs:` Cambios en documentación
- `style:` Cambios de formato (no afectan código)
- `refactor:` Refactorización de código
- `test:` Agregar o modificar tests
- `chore:` Tareas de mantenimiento

**Ejemplos:**
```bash
git commit -m "feat: agregar filtro de pedidos por fecha"
git commit -m "fix: corregir error en autenticación"
git commit -m "docs: actualizar README con nuevas instrucciones"
```

### 3. Desarrollo Backend

**Agregar un nuevo endpoint:**

1. **Definir la ruta** en `src/routes/`:
```javascript
// src/routes/dashboard.js
router.get('/mi-endpoint', requireAuth, dashboardController.miMetodo);
```

2. **Crear el controller** en `src/controllers/`:
```javascript
// src/controllers/dashboardController.js
export async function miMetodo(req, res) {
  try {
    const data = await miServicio.obtenerDatos();
    res.json({ success: true, data });
  } catch (err) {
    logger.error('Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}
```

3. **Crear el servicio** (si es necesario):
```javascript
// src/services/miServicio.js
export async function obtenerDatos() {
  const pool = await getPool();
  const result = await pool.request().query('SELECT * FROM MiTabla');
  return result.recordset;
}
```

### 4. Desarrollo Frontend

**Crear una nueva página:**

1. **Crear el componente** en `src/pages/`:
```jsx
// src/pages/MiPagina.jsx
import { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout';
import { miService } from '../api/services';

export default function MiPagina() {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    const result = await miService.getAll();
    setData(result);
  };
  
  return (
    <DashboardLayout>
      <h1>Mi Página</h1>
      {/* contenido */}
    </DashboardLayout>
  );
}
```

2. **Agregar la ruta** en `App.jsx`:
```jsx
<Route
  path="/dashboard/mi-pagina"
  element={
    <ProtectedRoute>
      <MiPagina />
    </ProtectedRoute>
  }
/>
```

3. **Agregar servicio API** en `src/api/services.js`:
```javascript
export const miService = {
  getAll: async () => {
    const response = await axios.get('/dashboard/mi-endpoint');
    return response.data.data || response.data;
  },
};
```

---

## 📐 Estándares de Código

### JavaScript/Node.js

- **ES Modules**: Usar `import/export` en lugar de `require`
- **Async/Await**: Preferir sobre Promises y callbacks
- **Error Handling**: Siempre usar try-catch en funciones async
- **Logging**: Usar el logger de Pino en lugar de `console.log`

**Ejemplo correcto:**
```javascript
export async function obtenerPedidos(req, res) {
  try {
    const pedidos = await dbService.getPedidos();
    logger.info('Pedidos obtenidos: %d', pedidos.length);
    res.json({ success: true, data: pedidos });
  } catch (err) {
    logger.error('Error obteniendo pedidos:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}
```

### React

- **Functional Components**: Usar hooks en lugar de class components
- **Named Exports**: Para componentes reutilizables
- **Default Export**: Para páginas principales
- **Props Destructuring**: Destructurar props en la firma de la función

**Ejemplo correcto:**
```jsx
export function Button({ variant = 'primary', children, onClick }) {
  return (
    <button 
      className={`btn btn-${variant}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
```

### CSS/Tailwind

- **Utility-First**: Preferir clases de Tailwind
- **Responsive**: Usar breakpoints (`sm:`, `md:`, `lg:`)
- **Custom Colors**: Definir en `tailwind.config.js`

**Ejemplo:**
```jsx
<div className="p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow sm:p-6 md:p-8">
  <h2 className="text-xl font-bold text-gray-900 mb-4">Título</h2>
</div>
```

---

## 🧪 Testing

### Testing Manual

```bash
# Backend
npm run dev

# Frontend
npm run dev:client

# Ambos simultáneamente
npm run dev:all
```

**Checklist de testing:**
- [ ] Login funciona con credenciales correctas
- [ ] Login falla con credenciales incorrectas
- [ ] Rate limiting no afecta desarrollo local
- [ ] Todas las páginas cargan sin errores
- [ ] CRUD operations funcionan correctamente
- [ ] Permisos por rol funcionan correctamente

---

## 🐛 Debugging

### Backend

**Habilitar debug logs:**
```javascript
// logger.js
const logger = pino({
  level: 'debug', // Cambiar de 'info' a 'debug'
  // ...
});
```

**VS Code Debug Configuration:**
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Backend",
  "skipFiles": ["<node_internals>/**"],
  "program": "${workspaceFolder}/app.js",
  "envFile": "${workspaceFolder}/.env"
}
```

### Frontend

**React Developer Tools:**
- Instalar extensión de Chrome/Firefox
- Ver componentes y estado
- Profiling de performance

**Network Tab:**
- Verificar requests/responses
- Ver códigos de estado
- Inspeccionar payloads

---

## 🔧 Troubleshooting

### Problema: "Cannot find module"

**Solución:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Problema: Rate limit excedido en desarrollo

**Solución:** Verificar que `NODE_ENV` no esté en "production":
```bash
# .env
NODE_ENV=development
```

### Problema: Frontend no conecta con backend

**Solución:** Verificar que Vite proxy esté configurado:
```javascript
// client/vite.config.js
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    }
  }
})
```

### Problema: Sesión no persiste

**Solución:** Verificar configuración de cookies:
```javascript
// app.js
app.use(session({
  cookie: {
    secure: false, // false en desarrollo
    httpOnly: true,
    sameSite: 'lax'
  }
}));
```

### Problema: SQL Server no conecta

**Solución:**
1. Verificar que SQL Server esté corriendo
2. Verificar credenciales en `.env`
3. Habilitar TCP/IP en SQL Server Configuration Manager
4. Verificar firewall permite puerto 1433

---

## 📚 Recursos Adicionales

- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)
- [SQL Server Documentation](https://docs.microsoft.com/en-us/sql/)

---

## 📞 Soporte

Si encuentras problemas no documentados:
1. Revisar issues en GitHub
2. Crear un nuevo issue con detalles
3. Incluir logs relevantes
4. Describir pasos para reproducir
