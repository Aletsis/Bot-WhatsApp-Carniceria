# 🎨 Dashboard React - Frontend

Dashboard moderno construido con React 19, Vite y Tailwind CSS para gestionar el Bot WhatsApp Carnicería.

---

## 🚀 Quick Start

```bash
# Instalar dependencias
npm install

# Desarrollo (con HMR)
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview
```

---

## 📦 Stack Tecnológico

- **React 19.0.0** - Framework UI
- **Vite 7.2.1** - Build tool y dev server
- **React Router 7.1.1** - Navegación
- **Tailwind CSS 4.0.0** - Utility-first CSS
- **Axios 1.13.2** - Cliente HTTP
- **ESLint** - Linting

---

## 🏗️ Arquitectura

### Estructura de Carpetas

```
src/
├── api/                      # Capa de servicios API
│   ├── axios.js             # Configuración Axios con interceptores
│   └── services.js          # Servicios: auth, pedidos, clientes, etc.
│
├── components/
│   ├── common/              # Componentes reutilizables
│   │   └── index.jsx        # Button, Input, Select, Card, Badge, Modal, Loading
│   ├── layout/              # Componentes de layout
│   │   └── index.jsx        # Navbar, Sidebar, DashboardLayout
│   └── ProtectedRoute.jsx   # HOC para protección de rutas
│
├── contexts/
│   └── AuthContext.jsx      # Estado global de autenticación
│
├── pages/                   # Páginas principales
│   ├── LoginPage.jsx        # Página de login
│   ├── PedidosPage.jsx      # Gestión de pedidos
│   ├── ClientesPage.jsx     # CRUD de clientes
│   ├── ConversacionesPage.jsx # Vista de conversaciones
│   └── UsuariosPage.jsx     # Administración de usuarios
│
├── App.jsx                  # Configuración de rutas
├── main.jsx                 # Entry point
└── index.css                # Estilos globales con Tailwind
```

---

## 🎯 Componentes Principales

### Páginas

#### `LoginPage.jsx`
- Formulario de autenticación
- Redirección automática si ya está autenticado
- Manejo de errores
- Diseño con gradientes

#### `PedidosPage.jsx`
- Grid de cards con pedidos
- Filtros por estado
- Modal de detalles
- Actualización de estado (solo editores/admins)
- Badges de color según estado

#### `ClientesPage.jsx`
- Estadísticas (Total, Activos, Inactivos)
- Tabla responsive
- Modal de crear/editar
- Soft delete
- Búsqueda y filtrado

#### `ConversacionesPage.jsx`
- Lista de conversaciones activas
- Estado actual de cada conversación
- Última interacción
- Info del cliente asociado

#### `UsuariosPage.jsx` (Solo Admin)
- Protección por rol
- Estadísticas por rol
- Crear usuarios
- Cambiar contraseñas
- Activar/desactivar usuarios

### Componentes Comunes

#### `Button`
```jsx
<Button variant="primary" size="md" onClick={handleClick}>
  Click me
</Button>
```

**Props:**
- `variant`: 'primary' | 'secondary' | 'danger' | 'success' | 'outline'
- `size`: 'sm' | 'md' | 'lg'
- `disabled`: boolean
- `className`: string adicional

#### `Input`
```jsx
<Input
  label="Nombre"
  type="text"
  value={nombre}
  onChange={(e) => setNombre(e.target.value)}
  error={errors.nombre}
/>
```

**Props:**
- `label`: string
- `type`: input type
- `value`: string
- `onChange`: function
- `error`: string (mensaje de error)

#### `Select`
```jsx
<Select
  label="Estado"
  value={estado}
  onChange={(e) => setEstado(e.target.value)}
  options={[
    { value: 'opcion1', label: 'Opción 1' },
    { value: 'opcion2', label: 'Opción 2' }
  ]}
/>
```

#### `Card`
```jsx
<Card title="Título del Card">
  <p>Contenido...</p>
</Card>
```

#### `Badge`
```jsx
<Badge variant="success">Activo</Badge>
<Badge variant="warning">Pendiente</Badge>
<Badge variant="danger">Error</Badge>
```

#### `Modal`
```jsx
<Modal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="Título del Modal"
>
  <p>Contenido del modal...</p>
</Modal>
```

#### `Loading`
```jsx
<Loading size="lg" />
```

### Layout Components

#### `DashboardLayout`
Wrapper principal que incluye Navbar + Sidebar + contenido.

```jsx
<DashboardLayout>
  <h1>Mi Página</h1>
  <p>Contenido...</p>
</DashboardLayout>
```

#### `Navbar`
- Logo y título
- Info del usuario
- Botón de logout

#### `Sidebar`
- Links de navegación
- Iconos
- Link activo destacado
- Responsive (colapsa en móvil)

---

## 🔐 Autenticación

### AuthContext

Provee estado global de autenticación.

**Provider:**
```jsx
<AuthProvider>
  <App />
</AuthProvider>
```

**Hook:**
```jsx
const { user, login, logout, isAuthenticated, isAdmin, isEditor, loading } = useAuth();
```

**Funciones:**
- `login(username, password)` - Autentica usuario
- `logout()` - Cierra sesión
- `checkAuth()` - Verifica sesión actual

**Estado:**
- `user` - Objeto de usuario actual
- `loading` - Boolean de carga inicial
- `isAuthenticated` - Boolean si está autenticado
- `isAdmin` - Boolean si es admin
- `isEditor` - Boolean si es editor o admin

### ProtectedRoute

HOC para proteger rutas que requieren autenticación.

```jsx
<Route
  path="/dashboard/pedidos"
  element={
    <ProtectedRoute>
      <PedidosPage />
    </ProtectedRoute>
  }
/>
```

---

## 📡 Servicios API

### authService

```javascript
// Login
const result = await authService.login('admin', 'password');

// Logout
await authService.logout();

// Verificar autenticación
const user = await authService.checkAuth();
```

### pedidosService

```javascript
// Obtener todos (con filtro opcional)
const pedidos = await pedidosService.getAll('En espera de surtir');

// Actualizar estado
await pedidosService.updateEstado(pedidoId, 'En ruta');
```

### clientesService

```javascript
// Obtener todos
const clientes = await clientesService.getAll();

// Crear
await clientesService.create({
  NumeroTelefono: '5218123456789',
  Nombre: 'Juan Pérez',
  Direccion: 'Av. Principal 123'
});

// Actualizar
await clientesService.update(clienteId, { Nombre: 'Nuevo Nombre' });

// Desactivar
await clientesService.delete(clienteId);
```

### conversacionesService

```javascript
const conversaciones = await conversacionesService.getAll();
```

### usuariosService

```javascript
// Obtener todos
const usuarios = await usuariosService.getAll();

// Crear
await usuariosService.create({
  username: 'nuevo_usuario',
  password: 'password123',
  rol: 'editor'
});

// Cambiar contraseña
await usuariosService.cambiarPassword(usuarioId, 'nueva_password');

// Activar/Desactivar
await usuariosService.toggle(usuarioId);
```

---

## 🎨 Tailwind CSS

### Configuración

El proyecto usa **Tailwind CSS v4** con el nuevo plugin `@tailwindcss/postcss`.

**Colores personalizados:**
```css
/* index.css */
@theme {
  --color-primary-50: #f0f9ff;
  --color-primary-100: #e0f2fe;
  /* ... */
  --color-primary-900: #0c4a6e;
}
```

**Uso:**
```jsx
<div className="bg-primary-100 text-primary-900 hover:bg-primary-200">
  Contenido
</div>
```

### Clases Comunes

**Espaciado:**
- `p-4` - padding
- `m-4` - margin
- `space-y-4` - espacio vertical entre hijos
- `gap-4` - gap en grid/flex

**Layout:**
- `flex` - flexbox
- `grid` - grid
- `items-center` - align items center
- `justify-between` - justify content space-between

**Responsive:**
- `sm:` - ≥640px
- `md:` - ≥768px
- `lg:` - ≥1024px
- `xl:` - ≥1280px

---

## 🔄 Estado y Datos

### Hooks Comunes

```jsx
// Estado local
const [data, setData] = useState([]);
const [loading, setLoading] = useState(false);

// Efectos
useEffect(() => {
  loadData();
}, []); // Ejecutar al montar

useEffect(() => {
  if (filtro) {
    loadData();
  }
}, [filtro]); // Ejecutar cuando cambia filtro
```

### Manejo de Errores

```jsx
const loadData = async () => {
  try {
    setLoading(true);
    const result = await miService.getAll();
    setData(result);
  } catch (error) {
    console.error('Error:', error);
    alert('Error al cargar datos');
  } finally {
    setLoading(false);
  }
};
```

---

## 🚀 Build y Deploy

### Desarrollo

```bash
npm run dev
```

Vite inicia en: http://localhost:5173

**Hot Module Replacement (HMR):**
- Cambios en archivos se reflejan instantáneamente
- No pierde estado de la aplicación

### Build

```bash
npm run build
```

Genera archivos optimizados en `/dist`:
- HTML minificado
- CSS con Tailwind purged
- JS con code splitting
- Assets optimizados

### Preview

```bash
npm run preview
```

Sirve el build localmente para testing.

### Producción

El backend sirve automáticamente el build de React:

```javascript
// app.js
if (isProduction) {
  app.use(express.static(path.join(__dirname, 'client', 'dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
  });
}
```

---

## 🐛 Debugging

### React DevTools

Instalar extensión de navegador:
- [Chrome](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
- [Firefox](https://addons.mozilla.org/en-US/firefox/addon/react-devtools/)

### Network Tab

Inspeccionar requests:
1. Abrir DevTools (F12)
2. Ir a Network
3. Filtrar por XHR
4. Ver requests/responses

### Console Logs

```jsx
console.log('Estado actual:', data);
console.error('Error:', error);
console.table(arrayData); // Para arrays
```

---

## 📝 Buenas Prácticas

1. **Componentes pequeños**: Un componente = una responsabilidad
2. **Nombres descriptivos**: `handleSubmit`, `loadPedidos`, no `func1`
3. **Props destructuring**: `function Button({ variant, children })`
4. **Keys en listas**: Siempre usar `key` único en `.map()`
5. **Error boundaries**: Considerar agregar para capturar errores
6. **Loading states**: Siempre mostrar feedback al usuario
7. **Validación**: Validar datos antes de enviar al backend

---

## 🔧 Troubleshooting

### Vite no inicia

```bash
rm -rf node_modules package-lock.json
npm install
```

### Estilos no se aplican

Verificar que Tailwind esté importado en `index.css`:
```css
@import "tailwindcss";
```

### 404 en rutas

Verificar configuración del router en `App.jsx`.

### CORS errors

Verificar proxy en `vite.config.js`:
```javascript
server: {
  proxy: {
    '/api': 'http://localhost:3000'
  }
}
```

---

## 📚 Recursos

- [React Docs](https://react.dev/)
- [Vite Docs](https://vitejs.dev/)
- [Tailwind CSS Docs](https://tailwindcss.com/)
- [React Router Docs](https://reactrouter.com/)
- [Axios Docs](https://axios-http.com/)


## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
