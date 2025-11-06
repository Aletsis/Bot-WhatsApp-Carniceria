# 🤝 Guía de Contribución

¡Gracias por tu interés en contribuir al Bot WhatsApp Carnicería! Este documento proporciona pautas para hacer contribuciones al proyecto.

---

## 📋 Tabla de Contenidos

- [Código de Conducta](#código-de-conducta)
- [Cómo Contribuir](#cómo-contribuir)
- [Proceso de Desarrollo](#proceso-de-desarrollo)
- [Estándares de Código](#estándares-de-código)
- [Mensajes de Commit](#mensajes-de-commit)
- [Pull Requests](#pull-requests)
- [Reportar Bugs](#reportar-bugs)
- [Sugerir Mejoras](#sugerir-mejoras)

---

## 📜 Código de Conducta

Este proyecto se adhiere a un código de conducta. Al participar, se espera que mantengas este código. Por favor reporta comportamiento inaceptable.

**Principios:**
- Ser respetuoso y profesional
- Aceptar críticas constructivas
- Enfocarse en lo mejor para la comunidad
- Mostrar empatía hacia otros miembros

---

## 🚀 Cómo Contribuir

### Formas de Contribuir

1. **Reportar bugs** 🐛
2. **Sugerir nuevas funcionalidades** 💡
3. **Mejorar documentación** 📚
4. **Escribir código** 💻
5. **Revisar Pull Requests** 👀
6. **Responder preguntas** 💬

### Primeros Pasos

1. **Fork el repositorio**
2. **Clone tu fork:**
   ```bash
   git clone https://github.com/TU_USUARIO/Bot-WhatsApp-Carniceria.git
   cd Bot-WhatsApp-Carniceria
   ```
3. **Configura el upstream:**
   ```bash
   git remote add upstream https://github.com/Aletsis/Bot-WhatsApp-Carniceria.git
   ```
4. **Crea una rama para tu feature:**
   ```bash
   git checkout -b feature/mi-nueva-feature
   ```

---

## 🔄 Proceso de Desarrollo

### 1. Sincronizar con Main

Antes de empezar, asegúrate de tener la última versión:

```bash
git checkout main
git pull upstream main
git push origin main
```

### 2. Crear una Rama

Usa nombres descriptivos para las ramas:

```bash
# Features
git checkout -b feature/agregar-estadisticas

# Fixes
git checkout -b fix/corregir-timezone

# Documentation
git checkout -b docs/actualizar-readme

# Refactor
git checkout -b refactor/optimizar-queries
```

### 3. Hacer Cambios

- Escribe código limpio y legible
- Sigue los estándares del proyecto
- Comenta código complejo
- Actualiza documentación si es necesario

### 4. Probar

```bash
# Backend
npm run dev

# Frontend
npm run dev:client

# Ambos
npm run dev:all

# Verificar que no haya errores
```

### 5. Commit

Usa commits atómicos y descriptivos:

```bash
git add .
git commit -m "feat: agregar filtro por fecha en pedidos"
```

### 6. Push

```bash
git push origin feature/mi-nueva-feature
```

### 7. Pull Request

Abre un Pull Request en GitHub con descripción detallada.

---

## 📐 Estándares de Código

### JavaScript/Node.js

```javascript
// ✅ CORRECTO

/**
 * Obtiene pedidos por estado
 * @param {string} estado - Estado del pedido
 * @returns {Promise<Array>} Lista de pedidos
 */
export async function getPedidosPorEstado(estado) {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('estado', sql.NVarChar, estado)
      .query('SELECT * FROM Pedidos WHERE Estado = @estado');
    
    logger.info('Pedidos encontrados: %d', result.recordset.length);
    return result.recordset;
  } catch (err) {
    logger.error('Error obteniendo pedidos:', err);
    throw err;
  }
}

// ❌ INCORRECTO

// sin documentación, sin manejo de errores, console.log
function getPedidos(e) {
  const pool = await getPool()
  const r = pool.request().input('estado',e).query('SELECT * FROM Pedidos WHERE Estado = @estado')
  console.log(r)
  return r.recordset
}
```

### React

```jsx
// ✅ CORRECTO

/**
 * Componente para mostrar una lista de pedidos
 * @param {Object} props
 * @param {Array} props.pedidos - Lista de pedidos
 * @param {Function} props.onSelect - Callback al seleccionar pedido
 */
export function PedidosList({ pedidos, onSelect }) {
  const [loading, setLoading] = useState(false);
  
  if (loading) {
    return <Loading />;
  }
  
  return (
    <div className="space-y-4">
      {pedidos.map((pedido) => (
        <Card key={pedido.PedidoID} onClick={() => onSelect(pedido)}>
          <h3>{pedido.Folio}</h3>
          <Badge>{pedido.Estado}</Badge>
        </Card>
      ))}
    </div>
  );
}

// ❌ INCORRECTO

// sin props destructuring, sin keys, nombres cortos
function List(p) {
  return (
    <div>
      {p.data.map(d => <div onClick={() => p.fn(d)}>{d.f}</div>)}
    </div>
  )
}
```

### CSS/Tailwind

```jsx
// ✅ CORRECTO
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
  <h2 className="text-xl font-bold text-gray-900">Título</h2>
  <Button variant="primary">Acción</Button>
</div>

// ❌ INCORRECTO (inline styles, mezcla de estilos)
<div style={{ display: 'flex' }} className="p-4">
  <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Título</h2>
</div>
```

### Naming Conventions

**Variables y Funciones:**
```javascript
// camelCase
const userName = 'admin';
function getUserData() { }
```

**Componentes React:**
```javascript
// PascalCase
function LoginPage() { }
function UserCard() { }
```

**Constantes:**
```javascript
// UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const API_BASE_URL = 'https://api.example.com';
```

**Archivos:**
```
// camelCase para JS
userService.js
authController.js

// PascalCase para componentes React
LoginPage.jsx
UserCard.jsx
```

---

## 💬 Mensajes de Commit

Seguimos [Conventional Commits](https://www.conventionalcommits.org/es/):

### Formato

```
<tipo>(<ámbito>): <descripción>

[cuerpo opcional]

[footer opcional]
```

### Tipos

- `feat:` Nueva funcionalidad
- `fix:` Corrección de bug
- `docs:` Cambios en documentación
- `style:` Formato (espacios, comas, etc.)
- `refactor:` Refactorización sin cambios funcionales
- `perf:` Mejoras de performance
- `test:` Agregar o corregir tests
- `build:` Cambios en build system
- `ci:` Cambios en CI/CD
- `chore:` Mantenimiento (actualizar dependencias, etc.)

### Ejemplos

```bash
feat(pedidos): agregar filtro por fecha

Permite filtrar pedidos por rango de fechas en el dashboard.
Incluye validación de fechas y mensaje de error.

Closes #123

---

fix(auth): corregir redirección infinita en login

El interceptor de Axios estaba redirigiendo en check-auth.
Ahora excluye ese endpoint del interceptor.

---

docs(api): actualizar documentación de endpoints

Agregar ejemplos de request/response para todos los endpoints.

---

refactor(userService): cambiar a named exports

Cambiado de export default a named exports para evitar
problemas de contexto this en métodos.
```

### Reglas

- ✅ Usar infinitivo ("agregar" no "agregado")
- ✅ Primera letra minúscula
- ✅ Sin punto final
- ✅ Máximo 72 caracteres en primera línea
- ✅ Describir QUÉ y POR QUÉ, no cómo
- ✅ Referenciar issues cuando aplique

---

## 🔀 Pull Requests

### Antes de Crear un PR

- [ ] Código sigue los estándares del proyecto
- [ ] Todas las pruebas pasan
- [ ] Documentación actualizada
- [ ] Commits siguen Conventional Commits
- [ ] Sin conflictos con main
- [ ] Código revisado por ti mismo

### Template de PR

```markdown
## Descripción
Breve descripción de los cambios.

## Tipo de Cambio
- [ ] Bug fix (cambio que corrige un issue)
- [ ] Nueva feature (cambio que agrega funcionalidad)
- [ ] Breaking change (fix o feature que causa que funcionalidad existente cambie)
- [ ] Documentación

## ¿Cómo se ha probado?
Describe las pruebas realizadas.

## Checklist
- [ ] Mi código sigue los estándares del proyecto
- [ ] He realizado auto-review de mi código
- [ ] He comentado código complejo
- [ ] He actualizado la documentación
- [ ] Mis cambios no generan warnings
- [ ] He agregado tests que prueban mi fix/feature
- [ ] Tests nuevos y existentes pasan localmente

## Screenshots (si aplica)
Agregar screenshots si hay cambios visuales.

## Issues Relacionados
Closes #123
Refs #456
```

### Proceso de Review

1. **Crear PR** con descripción detallada
2. **Revisores automáticos** se asignan
3. **CI/CD** ejecuta tests automáticos
4. **Code review** por al menos 1 mantenedor
5. **Cambios solicitados** si es necesario
6. **Aprobación** cuando todo está correcto
7. **Merge** a main

### Durante el Review

- Responde a comentarios constructivamente
- Realiza cambios solicitados prontamente
- No tomes críticas personal
- Haz push de cambios a la misma rama

---

## 🐛 Reportar Bugs

### Antes de Reportar

1. **Busca** si el bug ya fue reportado
2. **Actualiza** a la última versión
3. **Reproduce** el bug consistentemente
4. **Recopila** información relevante

### Template de Issue - Bug

```markdown
**Describe el bug**
Descripción clara y concisa del bug.

**Pasos para Reproducir**
1. Ir a '...'
2. Click en '...'
3. Scroll hasta '...'
4. Ver error

**Comportamiento Esperado**
Qué esperabas que sucediera.

**Comportamiento Actual**
Qué sucedió en realidad.

**Screenshots**
Si aplica, agregar screenshots.

**Entorno:**
- OS: [e.g. Windows 11]
- Node: [e.g. 18.17.0]
- npm: [e.g. 9.8.1]
- Navegador: [e.g. Chrome 120]

**Logs**
```
Pegar logs relevantes aquí
```

**Contexto Adicional**
Cualquier información adicional relevante.
```

---

## 💡 Sugerir Mejoras

### Template de Issue - Feature Request

```markdown
**¿Tu feature request está relacionada a un problema?**
Descripción clara del problema. Ej: "Siempre me frustra cuando..."

**Describe la solución que te gustaría**
Descripción clara de lo que quieres que suceda.

**Describe alternativas consideradas**
Descripción de soluciones o features alternativas.

**¿En qué ayudaría esto?**
Explicar el caso de uso y beneficios.

**Contexto Adicional**
Screenshots, mockups, o ejemplos de otras aplicaciones.

**¿Estarías dispuesto a trabajar en esto?**
- [ ] Sí, puedo implementarlo
- [ ] Necesitaría orientación
- [ ] Solo sugiero la idea
```

---

## 🏆 Reconocimiento

Los contribuidores serán reconocidos en:
- README.md (sección de Contributors)
- Changelog (en releases relevantes)
- GitHub contributors page

---

## 📞 ¿Preguntas?

Si tienes preguntas sobre contribuir:
- Abre un issue con label "question"
- Revisa issues existentes
- Lee la documentación en `/docs`

---

## 📄 Licencia

Al contribuir, aceptas que tus contribuciones se licencien bajo la MIT License del proyecto.

---

¡Gracias por contribuir! 🎉
