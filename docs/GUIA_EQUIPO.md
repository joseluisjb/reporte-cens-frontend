# Guía del equipo — cómo agregar tu pantalla

Para Angel (extracción, parametrización) y Omar (formularios de usuarios, auditoría, validación de formularios).
La base (layout, rutas, sesión, cliente HTTP, mocks y componentes) ya está hecha: **tu trabajo es rellenar tu página, no reconstruir la estructura**.

## 1. Primeros pasos

```
git clone https://github.com/joseluisjb/reporte-cens-frontend.git
cd reporte-cens-frontend
npm install
copy .env.example .env      # en Mac/Linux: cp .env.example .env
npm run dev                 # http://localhost:5173
npm test                    # debe pasar todo antes de cada PR
```

El `.env` trae `VITE_USE_MOCKS=true`: **no necesitas el backend**, una API simulada responde con datos ficticios.

Cuentas de prueba (todas ficticias):

| Correo | Contraseña | Rol |
|---|---|---|
| `rmartinez@cens.com.co` | `Admin12345` | Administrador |
| `jperez@cens.com.co` | `Analista123` | Analista de Cartera |
| `mgomez@cens.com.co` | `Temporal123` | Primer ingreso (debe cambiar la contraseña) |
| `avargas@cens.com.co` | `Cartera123` | Desactivado (no entra) |

Para alternar rápido entre Analista y Administrador, pon `VITE_DEMO_MODE=true` en tu `.env` (aparece "Cambiar de perfil" en el menú de perfil).

## 2. Mapa de carpetas

```
src/
  app/                 App, rutas (AppRoutes.jsx), menú y roles (navigation.js), layout
  components/ui/       Componentes reutilizables (los usas, no los copias)
  features/<módulo>/   TU CARPETA: páginas, servicio, validaciones, mapper
  lib/                 api (cliente HTTP), config (.env), format (fechas, pesos), usePageTitle
  mocks/               API simulada (db.js = datos, handlers.js = endpoints)
  test/                pruebas y ayudas (renderApp.jsx)
docs/                  esta guía
```

Cada quien trabaja **dentro de su carpeta** en `features/`, así no hay conflictos de Git.

| Pantalla | Archivo que debes editar | Quién | Rol |
|---|---|---|---|
| Extracción y consolidación | `features/extraction/ExtractionPage.jsx` | Angel | Ambos |
| Parametrización de conceptos | `features/parameters/ParametersPage.jsx` | Angel | Solo Administrador |
| Tarjeta "Última extracción" del inicio | `features/home/HomePage.jsx` | Angel | Ambos |
| Log de auditoría | `features/audit/AuditPage.jsx` | Omar | Solo Administrador |
| Formulario de usuarios | `features/users/UserFormPanel.jsx` y `userValidation.js` | Omar | Administrador |
| Cambio y recuperación de contraseña | `features/auth/passwordValidation.js` y las páginas | Omar | — |

Las rutas, el menú y el bloqueo por rol de esas pantallas **ya existen** (`app/navigation.js`). Solo reemplaza el contenido del archivo de tu página: hoy son placeholders (`PlaceholderPage`).

## 3. Reglas que no se negocian

- **Todo en español**: textos, errores, avisos, `aria-label`.
- **Nunca llames a `axios` ni a `fetch` directamente.** Usa un servicio (sección 5).
- **Nunca guardes nada en `localStorage`** (ni tokens ni datos). La sesión es una cookie del navegador.
- **Datos ficticios únicamente.** Nada real de CENS: ni en el código, ni en las pruebas, ni en capturas, ni en un chat de IA.
- **No hardcodees** correos, URLs, claves ni tiempos: van en `.env` o en `lib/config.js`.
- **No pegues credenciales** en el código. El `.env` está en `.gitignore`: no se sube.
- **No toques** `lib/api/`, `features/auth/` ni `app/` sin avisar a Johan (otros dependen de eso). Si necesitas un cambio ahí, pídelo o abre un PR aparte.

## 4. Agregar o completar una pantalla

Si tu página ya existe (los 5 placeholders), solo edita su archivo. Ejemplo mínimo:

```jsx
import { PageHeader, Card } from '../../components/ui'
import { usePageTitle } from '../../lib/usePageTitle'

export default function ParametersPage() {
  usePageTitle('Códigos de Concepto de Energía')   // título de la pestaña
  return (
    <>
      <PageHeader title="Códigos de Concepto de Energía">{/* botones a la derecha */}</PageHeader>
      <Card>...</Card>
    </>
  )
}
```

Si necesitas una pantalla **nueva**, agrega una fila en `src/app/navigation.js`:

```js
{ path: '/mi-ruta', label: 'Mi pantalla', icon: 'bolt', adminOnly: false,
  Page: lazy(() => import('../features/mi-modulo/MiPage')) },
```

Con eso aparece en el menú y la ruta queda protegida (sesión + rol). `adminOnly: true` la limita al Administrador, **también si escriben la dirección a mano**. Los iconos disponibles están en `components/ui/Icon.jsx`.

> El bloqueo por rol del frontend es solo experiencia de usuario. La seguridad real la aplica el backend (responde 403). Por eso nunca confíes en "el botón no se ve".

## 5. Hablar con el backend (servicio → endpoint → mock)

Hazlo siempre en este orden, como en `features/users/`:

1. **Ruta** en `src/lib/api/endpoints.js` (las de parámetros ya están: `conceptos`, `concepto(codigo)`, `gruposConceptos`, `grupoConceptos(id)`):
   ```js
   conceptos: '/conceptos/',
   concepto: (codigo) => `/conceptos/${codigo}/`,
   ```
2. **Servicio** `features/parameters/parametersService.js`: funciones simples que usan `api` y devuelven datos ya listos para la pantalla.
   ```js
   import { api, ENDPOINTS } from '../../lib/api'
   export async function listConcepts({ activo } = {}) {
     const params = typeof activo === 'boolean' ? { activo: String(activo) } : undefined
     const { data } = await api.get(ENDPOINTS.conceptos, { params })
     return data.map(mapConcepto)         // traduce los nombres del backend a los de la pantalla
   }
   ```
3. **Mapper** (`features/parameters/conceptMapper.js`): si el backend cambia un nombre de campo, se corrige solo ahí (ver `features/users/userMapper.js`).
4. **Mock**: agrega datos en `src/mocks/db.js` y el endpoint en un archivo de `src/mocks/rutas/` (copia el estilo de `usuarios.js`; `handlers.js` solo los junta). Responde como DRF: errores en `{ detail }` o `{ campo: ['mensaje'] }`.
5. **Prueba** del servicio (ver `src/test/services.test.js` y `src/test/parametros.test.js`).

> **Parámetros (Angel):** el servicio, el mapper, los mocks y las pruebas de conceptos y grupos **ya existen**; solo falta la pantalla (`features/parameters/ParametersPage.jsx`). Usa únicamente estas funciones de `parametersService.js` (lectura: ambos roles; escritura: solo Administrador, el Analista recibe 403):
> - Conceptos: `listConcepts({ activo })`, `createConcept({ codigo, descripcion, activo, observacion })`, `updateConcept(codigo, cambios)`, `setConceptActive(codigo, activo)`.
> - Grupos: `listConceptGroups()`, `getConceptGroup(id)`, `createConceptGroup({ nombre, conceptos })`, `updateConceptGroup(id, cambios)`, `setConceptGroupActive(id, activo)`, `deleteConceptGroup(id)`.
>
> Detalles: el concepto aún no trae fecha de creación (`fechaCreacion` llega `null`; diferencia B del contrato); el grupo trae `creado` como texto `YYYY-MM-DD`, se muestra con `formatearFechaISO`; `conceptos` de un grupo es la lista de códigos y **reemplaza** la anterior al editar.

**Errores:** todo error llega como `ApiError` con `message` en español y `fieldErrors` ({ campo: 'mensaje' }). En una pantalla:

```js
try { await createConcept(datos) }
catch (err) { setErrores(err.fieldErrors); if (!Object.keys(err.fieldErrors).length) setErrorGeneral(err.message) }
```

Los **401** (sesión vencida) y **403** (sin permiso) ya se manejan solos: no los captures a menos que haga falta.

Cuando exista el backend real, se pone `VITE_USE_MOCKS=false` y **tus pantallas no cambian**. Solo se corrigen `endpoints.js` y los mappers.

## 6. Formularios (Omar: RF31)

El patrón de referencia está en `features/users/UserFormPanel.jsx` y `features/auth/ChangePasswordPage.jsx`:

- **Validación pura** en un archivo aparte (`userValidation.js`): recibe los valores y devuelve `{ campo: 'mensaje' }` o `{}`. Es fácil de probar.
- Al enviar: validar → mostrar errores → **enfocar el primer campo inválido** → si todo bien, enviar.
- El error de un campo se **quita al escribir** en él.
- Errores del servidor (`err.fieldErrors`) se muestran **en el campo** correspondiente; si el backend nombra distinto el campo, traduce con el mapper (`mapUserFieldErrors`).
- Los componentes `Input`, `Select` y `PasswordField` ya traen `label`, `error`, `aria-invalid` y `aria-describedby`: pásales `error="mensaje"`.
- Los formularios dentro de un `Modal` se **montan solo mientras está abierto** (`{panel && <UserFormPanel ... />}`), así cada apertura empieza limpia.

Para el **componente reutilizable de RF31**: diseña un hook o componente que reciba `valores`, una función de validación y un `onSubmit`, y encárgate de errores, foco y envío. Cuando esté, se migra `UserFormPanel`, el login y las contraseñas sin cambiar su comportamiento: las pruebas existentes (`src/test/login.test.jsx`, `users.test.jsx`, `passwordFlows.test.jsx`) te avisan si algo se rompe.

## 7. Componentes disponibles (`components/ui`)

Se importan juntos: `import { Button, Input, Modal } from '../../components/ui'`.

| Componente | Para qué |
|---|---|
| `Button` (`variant`: primary, outline, ghost, danger; `size`; `loading`; `block`) | Botones. `buttonClasses()` sirve para un `<Link>` con aspecto de botón |
| `IconButton` | Botón de solo icono (editar). Exige `label` |
| `Input`, `Select`, `PasswordField` | Campos con etiqueta y error accesible |
| `SearchBox`, `FilterSelect` | Búsqueda y filtro de las tablas |
| `Table` (`caption`), `EmptyState` | Tabla con el estilo de la maqueta. Pasa `caption` y usa `<th scope="col">` |
| `Badge` (ok, off, admin), `Chip`, `Switch` | Estados y activar/desactivar |
| `Card`, `PageHeader` | Contenedores y encabezado de página |
| `Modal` (`side` = panel lateral), `ConfirmDialog` | Diálogos accesibles (foco, Escape). `ConfirmDialog` para desactivar o eliminar |
| `useToast()` → `toast.success(msg)` / `toast.error(msg)` | Avisos abajo al centro |
| `Alert` (`tone`: error, aviso), `Spinner`, `TextLink`, `Icon` | Avisos en línea, carga, enlaces, iconos |

Tokens de marca en `src/index.css` (bloque `@theme`): `bg-bosque`, `text-citrico`, `text-muted`, `font-hd`, `rounded-card`... Úsalos en vez de colores sueltos. Contraste: `bg-bosque-d` para superficies con texto blanco (`bosque` solo para texto grande, iconos y decoración), `bosque-dd` para su hover y `border-gris-d` para el borde de los controles de formulario. Para resaltar una fila recién creada o editada: `className="fila-resaltada"` unos segundos (ver `UsersPage.jsx`).

Ayudas de formato en `lib/format.js`: `formatearFechaHora`, `formatearCOP` ($1.276.016), `formatearFechaISO` (30/09/2026), `formatearFechaISOLarga` (30 de septiembre de 2026), `plural`.

**La referencia visual es la maqueta** (`NexoVolt_Mockups_Iteracion1_v2.html`): mismos textos, estados, validaciones e iconos.

## 8. Roles y sesión

```js
import { useAuth } from '../auth/authContext'
import { ROLES } from '../auth/roles'
const { user } = useAuth()          // { id, nombre, correo, rol, ... }
const esAdmin = user.rol === ROLES.ADMIN
```

La pantalla del Administrador la protege `navigation.js`; dentro de una pantalla permitida a ambos roles, oculta lo que no corresponde con `esAdmin`, pero **el backend decide**.

## 9. Pruebas (Vitest + Testing Library)

Cada pieza lleva su prueba. Ayudas en `src/test/renderApp.jsx`:

```js
await renderConSesion('/parametrizacion')              // Administrador con sesión real en el mock
await renderConSesion('/extraccion', 'jperez@cens.com.co', 'Analista123')  // otro usuario
renderApp('/panel', ANALISTA)                          // usuario fijo; SOLO si la pantalla no llama a la API
```

Dos trampas que ya nos pasaron:

1. **Si tu pantalla pide datos, la prueba debe esperar a que lleguen** (`await screen.findByText('...')`) **antes de terminar**. Si no, la petición queda en vuelo, el mock limpia la sesión y esa respuesta (401) desloguea a la prueba siguiente: fallos aleatorios.
2. Con `renderApp(ruta, usuarioFijo)` el servidor simulado **no tiene sesión**: cualquier llamada a la API recibe 401. Para pantallas con datos usa `renderConSesion`.

**Accesibilidad:** agrega tu pantalla a `src/test/accesibilidad.test.jsx` (3 líneas con `expectAccesible()`) y lee `docs/ACCESIBILIDAD.md`. Para texto verde sobre fondo claro usa `text-bosque-d`, no `text-bosque` (no alcanza el contraste mínimo). Para fondos verdes con texto blanco usa `bg-bosque-d` y para bordes de campos `border-gris-d`; `src/test/contraste.test.js` protege estos pares.

**Conformidad con el contrato:** `src/test/contrato.test.js` llama a los mocks y valida cada respuesta contra los esquemas de `docs/contrato/openapi.yaml`. Cuando agregues o cambies un mock, agrega su caso ahí (método, ruta tal como aparece en el contrato, estado esperado); la prueba falla si el mock no coincide con `openapi.yaml`.

Antes de abrir el PR:

```
npm test && npm run lint && npm run build
```

## 10. Git y Pull Request

- Una rama por tarea desde `main` actualizado: `feature/RFxx-descripcion` (ej. `feature/RF35-pantalla-parametros`). **Nunca trabajes sobre `main`.**
- Haz `git fetch` y actualiza `main` antes de crear la rama.
- Configura tu correo de GitHub: `git config user.email "tu-correo-de-github"`. Si no, tus commits no cuentan como tuyos.
- El PR **menciona el RF**, incluye pruebas, indica **si usaste IA y en qué parte**, y no trae datos reales, credenciales ni `.env`.
- Frontend lo revisa Johan; backend lo revisa José Luis.
- Registra el link del PR en el FP-15.

Plantilla de PR:

> **Título:** RFxx – descripción corta
> **RF:** RFxx (fila NN)
> **Qué incluye:** …
> **Pruebas:** Vitest, N en total. `npm test`, `npm run build` y `npm run lint` pasan.
> **IA:** (se usó apoyo de IA para… / no se usó IA)
> **Datos sensibles:** no hay datos reales, credenciales ni `.env`.

## 11. ¿Dudas?

Pregúntale a Johan antes de cambiar algo fuera de tu carpeta. Si el backend todavía no tiene un endpoint, **no lo inventes como definitivo**: déjalo en el mock, márcalo como "propuesto" en `endpoints.js` y anótalo en `docs/PENDIENTES_BACKEND.md`.
