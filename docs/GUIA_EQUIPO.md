# Guía del equipo — cómo agregar tu pantalla

Para Angel (extracción, parametrización) y Omar (formularios de usuarios, auditoría, validación de formularios).
La base (layout, rutas, sesión, cliente HTTP, mocks y componentes) ya está hecha: **tu trabajo es rellenar tu página, no reconstruir la estructura**.

## Estado actual y qué tiene en cuenta cada uno (10/10/2026)

**Para todos**
- **El backend real todavía no se puede usar.** No existe el login (lo hace Dilan) y, sin usuario autenticado, los endpoints de negocio responden 403. Se trabaja con `VITE_USE_MOCKS=true` y las cuentas ficticias del README.
- **Roles.** En la interfaz `user.rol` es el texto (`ROLES.ADMIN`, `ROLES.ANALISTA`). El backend usa los códigos `ADMINISTRADOR` y `ANALISTA_CARTERA`, y la traducción la hacen los mappers (sección 8).
- **El contrato manda:** `docs/contrato/openapi.yaml`, versión 0.4. Si cambias un mock, agrega su caso en `src/test/contrato.test.js`: esa prueba falla si el mock no cumple el contrato.
- **El manual de TransUnion va primero.** Donde el backend se aparta del manual, el contrato y los mocks siguen al manual. Las diferencias están en `docs/contrato/DISCREPANCIAS.md`. Sector: **Servicios** (estados de la Tabla 4b).
- **Contraste AA:**
  - fondos con texto blanco: `bg-bosque-d`;
  - texto verde sobre fondo claro: `text-bosque-d`;
  - bordes de controles: `border-gris-d`.
  
  `src/test/contraste.test.js` lo vigila. Cada pantalla nueva se agrega a `accesibilidad.test.jsx` (sección 9).

**Angel (RF35, RF1–RF5)**
- La capa de datos de parametrización y extracción **ya existe y está probada**: servicio, mapper, catálogos, mocks y pruebas (detalle en la sección 5). Puedes usarla o cambiarla. Las pantallas son tuyas: `ParametersPage.jsx`, `ExtractionPage.jsx` y la tarjeta "Última extracción" del inicio, que se completa con `getLatestCut()`.
- **Diferencias con la maqueta:**
  - La extracción es **síncrona**: no hay barra de 5 pasos consultando el estado.
  - El ciclo es **BORRADOR → VALIDADO → ENVIADO**.
  - El resultado no trae columna "Concepto".
  - Un corte puede traer obligaciones **02 Saldada** con todo en cero.
- La **identificación ya llega enmascarada**. No la muestres completa.
- Pendientes con José Luis:
  - Falta la **fecha de creación del concepto** (diferencia B): tu tabla de la fila 36 la pide y el mapper devuelve `null`.
  - Falta versionar el SQL de las vistas `V_CALCULO_CORTE` y `V_VALIDACION_CORTE` (A1 de `DISCREPANCIAS.md`), donde puedes apoyar como DBA.

**Omar (RF28–RF31, pruebas y datos de prueba)**
- **Auditoría (RF30).**
  - El mock de `/api/auditoria/` lo deja Johan. **El servicio y el mapper los haces tú** en `features/audit/`, con la receta de la sección 5.
  - Paginación con `limite` y `desplazamiento`, y respuesta `{ total, resultados }`.
  - Filtros: `desde`, `hasta`, `usuario` (id), `tipo_accion` y `modulo`.
  - `rol` llega como código: tradúcelo con `rolATexto`.
  - Es solo para el Administrador: el Analista recibe 403.
  - Es una propuesta: Dilan aún no la construye.
- **Formularios.**
  - Los de usuarios, cambio y recuperación de contraseña **ya existen y tienen pruebas**: mejóralos, no los reescribas.
  - La contraseña temporal **se envía por correo**; el diálogo que la mostraba queda como respaldo.
  - Falta el **componente reutilizable de RF31** (sección 6).
  - En `ChangePasswordPage` el enlace "Cerrar sesión" pasó a `text-bosque-d` por contraste.
- **Datos y pruebas (filas 46 a 48).** `src/mocks/datos/` y `src/mocks/db.js` traen datos ficticios que te sirven de modelo para el script de datos de prueba:
  - obligaciones en todos los tramos de mora;
  - saldadas y una castigada;
  - usuarios de cada rol.
  
  Para las pruebas funcionales de HU-D está `docs/GUION_DEMO.md`.

## 1. Primeros pasos

Despliegue en Render, conexión con el backend real y prueba de humo: `docs/DESPLIEGUE.md`.

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
| `rmartinez@example.com` | `Admin12345` | Administrador |
| `jperez@example.com` | `Analista123` | Analista de Cartera |
| `mgomez@example.com` | `Temporal123` | Primer ingreso (debe cambiar la contraseña) |
| `avargas@example.com` | `Cartera123` | Desactivado (no entra) |

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

> **Extracción (Angel, RF1–RF5, RF7, RF44):** el servicio, el mapper, el catálogo de TransUnion, los mocks y las pruebas **ya existen**; solo falta la pantalla (`features/extraction/ExtractionPage.jsx`) y la tarjeta "Última extracción" del inicio. Todo en `features/extraction/extractionService.js` (ambos roles pueden usar todas las funciones):
> - `listCuts()` (registro de extracciones, del más reciente al más antiguo), `getLatestCut()` (el último corte, o `null` si aún no hay ninguno), `getCut(id)`.
> - `generateCut({ fechaCorte, grupoId = null })`: crea el corte en BORRADOR. `fechaCorte` es `'YYYY-MM-DD'`; `grupoId` es opcional (`null` = todos los conceptos reportables).
> - `validateCut(id)` → `{ corte, advertencias: [{ regla, mensaje }] }`; `registerSubmission(id, { fechaEnvio })` (la fecha es opcional, sin ella se usa hoy).
> - `listCutObligations(id, { limite = 20, desplazamiento = 0 })` → `{ items, total }` (`limite` de 1 a 100).
>
> Detalles: **es síncrono**, `generateCut` responde cuando el corte ya está generado; no hay que consultar el estado cada cierto tiempo (nada de polling). El ciclo es BORRADOR → (validar) → VALIDADO → (registrar envío) → ENVIADO, y solo puede haber un BORRADOR a la vez. El corte trae `esBorrador`, `esValidado` y `esEnviado` para habilitar o no los botones. `fechaCorte` es texto `YYYY-MM-DD` (se muestra con `formatearFechaISO`); `fechaEjecucion` es `Date` (`formatearFechaHora`); el dinero se muestra con `formatearCOP`.
>
> **Validar con errores:** si el corte tiene reglas correctivas sin resolver, `validateCut` lanza un `ApiError` con `status` 409 y el corte sigue en BORRADOR. La lista de reglas **no** está en `fieldErrors`, está en `err.datos?.errores` (`[{ regla, mensaje }]`):
>
> ```js
> try { await validateCut(id) }
> catch (err) {
>   if (err.status === 409 && err.datos?.errores) mostrarLista(err.datos.errores) // reglas que bloquean
>   else toast.error(err.message)                                                  // p. ej. "El corte no está en estado BORRADOR."
> }
> ```
>
> **Identificación enmascarada:** el mapper entrega `identificacion` ya enmascarada (`******0001`); el número completo es un dato personal y nunca llega a la pantalla (no lo reconstruyas ni lo registres). Los códigos vienen con su texto: `estado.descripcion` (Tabla 4b) y `edadMora.descripcion` (Tabla 9). Los catálogos (`TABLA_9`, `ESTADOS_OBLIGACION`, `TIPOS_IDENTIFICACION`) y sus funciones están en `features/extraction/catalogosTU.js`. Para marcar campos del formulario usa `mapCorteFieldErrors(err.fieldErrors)` (`fechaCorte`, `grupoId`, `fechaEnvio`).
>
> Los datos de los mocks siguen el manual de TransUnion (sector Servicios): el corte incluye obligaciones **Saldadas** (`estado.codigo === '02'`, con saldo y mora en 0), que el backend de hoy todavía no entrega; ver `docs/PENDIENTES_BACKEND.md`, sección 2.4.

**Errores:** todo error llega como `ApiError` con `message` en español y `fieldErrors` ({ campo: 'mensaje' }), `code` (identificador estable si el backend lo manda, o `null`) y `datos` (el cuerpo de la respuesta, o `null`). En una pantalla:

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

Ayudas de formato en `lib/format.js`: `formatearFechaHora`, `formatearCOP` ($1.276.016), `formatearFechaISO` (30/09/2026), `formatearFechaISOLarga` (30 de septiembre de 2026), `plural`, `enmascararIdentificacion` (`******0001`).

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
await renderConSesion('/extraccion', 'jperez@example.com', 'Analista123')  // otro usuario
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
