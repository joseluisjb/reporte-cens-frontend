# Guía del equipo — cómo agregar tu pantalla

Para Angel y Omar: en la Iteración 1, extracción, parametrización, usuarios y auditoría; en la Iteración 2, las pantallas 14 (Novedades Urgentes) y 13 (Reclamos Habeas Data).
La base (layout, rutas, sesión, cliente HTTP, mocks y componentes) ya está hecha: **tu trabajo es rellenar tu página, no reconstruir la estructura**.

## Iteración 2: estado y qué tiene en cuenta cada uno (08/11/2026)

**Para todos**
- **Fuentes, en este orden:** el Manual Sector Real v34 de TransUnion y lo que entregó CENS; luego las fichas (`docs/iteracion2/RF_ITERACION2.md`), el mockup v3 (`docs/iteracion2/NexoVolt_Mockups_Iteracion2_v3.html`) y la matriz (`docs/iteracion2/MATRIZ_ESTADOS_SERVICIOS.md`). Los ejemplos del contrato **no** son fuente: los códigos, textos y posiciones se verifican en el Manual.
- **Contrato 0.9.3** (`docs/contrato/openapi.yaml`). Toda la Iteración 2 es **propuesta**: el backend todavía no tiene esas rutas, así que las pantallas se construyen contra los mocks.
- **Lo que depende de CENS o de TransUnion** (corchetes o «por confirmar» en las fichas) no se inventa: llega con `confirmado: false` o `por_confirmar: true` y la pantalla lo marca con `<PorConfirmar />`.
- **Roles:** las pantallas 9 a 14 son solo del Analista de Cartera; la 15 y la 16, solo del Administrador. El otro rol ve «Acceso restringido» (sección 8).
- **Estados (Tabla 4b):** el 07 se llama «Castigada recuperada» y el 12 «Ley 1564 de 2012 Insolvencia PNNC». Los textos «Cartera Recuperada» del mockup y de las fichas quedan por corregir.
- **Pantallas ya fusionadas en `dev`:** 4 (panel), 9 (Obligaciones y Estados), 10 (Actualización Mensual), 11 (Refinanciaciones), 12 (Reporte a TransUnion, con el envío y los resultados del cargue), 15 (Datos de la Entidad) y 16 (Homologación de Estados).

**Omar · pantalla 13, Reclamos Habeas Data (RF23)**
- La ruta `/reclamos` ya existe (solo Analista) y muestra `EnConstruccion.Reclamos` (`app/pantallasEnConstruccion.jsx`). Tu página va en `features/claims/` y reemplaza ese placeholder en `navigation.js`.
- El contrato trae `/reclamos/`, `/reclamos/{id}/cerrar/` y `/reclamos/insumo/` (propuesta, dueño Omar). Las rutas en `endpoints.js` y los handlers MSW (`mocks/rutas/`) los agregas tú.
- Ya están las obligaciones simuladas (`db.obligaciones`) y el catálogo de tipologías: `getCatalog(CATALOGOS.tipologiasReclamo)` de `features/transunion/catalogosService.js`, con `confirmado: false` mientras CENS no lo apruebe.
- El cargue de resultados de TransUnion (RF54, pantalla 12) **no** lee los archivos de radicación ni de cierre de reclamos: son de tu pantalla.

**Angel · pantalla 14, Novedades Urgentes (RF24, RF50, RF55)**
- La ruta `/novedades` ya existe (solo Analista) y muestra `EnConstruccion.Novedades`. Tu página va en `features/updates/`.
- El contrato trae `/novedades/` (con `gestionar` y `rechazar`), `/eliminaciones/` (con `reactivar`) y `/rectificaciones/` (con `confirmar`). Son una propuesta tuya: las rutas y los handlers los agregas tú. El catálogo de motivos es `getCatalog(CATALOGOS.motivosEliminacion)` (Tabla 28).
- **Cambios de la Iteración 2 que tocan tu extracción (Iteración 1):**
  - un corte puede quedar en `ENVIADO_CON_INCONSISTENCIAS` (RF54). `extractionMapper.esEnviado` solo reconoce `ENVIADO`, así que ese corte se ve como no enviado en Extracción y en Inicio;
  - `registrar-envio` (contrato 0.9) responde 409 si el corte no tiene archivo plano (`code: sin_archivo`) o si el último no es apto (`code: archivo_no_apto`). Conviene que «Registrar envío a TransUnion» lo explique. Las pruebas que registran un envío preparan antes un archivo apto con `conArchivoApto(id)` (`src/test/escenarios/envio.js`).

**Backend (José Luis y Dilan):** lo que el frontend espera de la Iteración 2 está en `docs/PENDIENTES_BACKEND.md`, sección 5. Hay que copiar `openapi.yaml` 0.9.3 al backend.

## Iteración 1: estado al 10/10/2026 (referencia)

Esta sección se conserva tal como quedó al cerrar la Iteración 1. Desde la 0.6 el contrato marca la autenticación, los usuarios y la auditoría como implementados en el backend.

**Para todos**
- **El backend real todavía no se puede usar.** No existe el login (lo hace Dilan) y, sin usuario autenticado, los endpoints de negocio responden 403. Se trabaja con `VITE_USE_MOCKS=true` y las cuentas ficticias del README.
- **Roles.** En la interfaz `user.rol` es el texto (`ROLES.ADMIN`, `ROLES.ANALISTA`). El backend usa los códigos `ADMINISTRADOR` y `ANALISTA_CARTERA`, y la traducción la hacen los mappers (sección 8).
- **El contrato manda:** `docs/contrato/openapi.yaml` (hoy, versión 0.9.3). Si cambias un mock, agrega su caso en `src/test/contrato.test.js`: esa prueba falla si el mock no cumple el contrato.
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
| 4 · Panel (Iteración 2) | `features/home/PanelAnalista.jsx` | Johan | Analista |
| 9 · Obligaciones y Estados | `features/obligations/ObligationsPage.jsx` | Johan | Solo Analista |
| 10 · Actualización Mensual | `features/cycle/CyclePage.jsx` | Johan | Solo Analista |
| 11 · Refinanciaciones | `features/refinancing/RefinancingPage.jsx` | Johan | Solo Analista |
| 12 · Reporte a TransUnion | `features/report/ReportPage.jsx` | Johan | Solo Analista |
| 13 · Reclamos Habeas Data | `features/claims/` (por crear) | Omar | Solo Analista |
| 14 · Novedades Urgentes | `features/updates/` (por crear) | Angel | Solo Analista |
| 15 · Datos de la Entidad | `features/entity/EntityPage.jsx` | Johan | Solo Administrador |
| 16 · Homologación de Estados | `features/state-mapping/StateMappingPage.jsx` | Johan | Solo Administrador |

`features/transunion/` no es una pantalla: guarda los catálogos del Manual y los componentes compartidos de TransUnion (sección 7).

Las rutas, el menú y el bloqueo por rol de todas esas pantallas **ya existen** (`app/navigation.js`). Las que todavía no están construidas (13 y 14) muestran un placeholder de `app/pantallasEnConstruccion.jsx`: cuando hagas la tuya, cambia en `navigation.js` el `EnConstruccion.<Pantalla>` por tu página.

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

Si necesitas una pantalla **nueva**, agrega una fila en `NAV_ITEMS` de `src/app/navigation.js`:

```js
{ path: '/mi-ruta', label: 'Mi pantalla', icon: 'bolt', roles: SOLO_ANALISTA, section: 'Reporte a TransUnion',
  Page: lazy(() => import('../features/mi-modulo/MiPage')) },
```

Con eso aparece en el menú y la ruta queda protegida (sesión + rol). `roles` es `null` (los dos roles), `SOLO_ADMIN` o `SOLO_ANALISTA`, y vale **también si escriben la dirección a mano**. `section` es el grupo del menú (`SECCIONES`). Los iconos disponibles están en `components/ui/Icon.jsx`.

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

**Roles en el mock:** cada handler de `mocks/rutas/` empieza con `exigirSesion()` (de `mocks/utilidades.js`), que devuelve `{ usuario }` o `{ respuesta }` con el 401 o el 403:

```js
const { usuario, respuesta } = exigirSesion(SOLO_ANALISTA) // o SOLO_ADMIN; sin argumento, los dos roles
if (respuesta) return respuesta
```

Recibe un objeto: la forma vieja `exigirSesion(true)` lanza un error a propósito, para que una ruta no quede abierta por accidente.

**Endpoints propuestos (Iteración 2):** cada ruta nueva lleva en `endpoints.js` el comentario `// propuesto (contrato 0.9)` con sus roles. Si una regla no está en el Manual ni en el contrato, va en `docs/PENDIENTES_BACKEND.md` como suposición, para que el backend la confirme.

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
> **Identificación enmascarada:** el mapper entrega `identificacion` ya enmascarada (`******0001`); el número completo es un dato personal y nunca llega a la pantalla (no lo reconstruyas ni lo registres). Los códigos vienen con su texto: `estado.descripcion` (Tabla 4b) y `edadMora.descripcion` (Tabla 9). Los catálogos (`TABLA_9`, `ESTADOS_OBLIGACION`, `TIPOS_IDENTIFICACION`) y sus funciones están en `features/transunion/catalogosTU.js`. Para marcar campos del formulario usa `mapCorteFieldErrors(err.fieldErrors)` (`fechaCorte`, `grupoId`, `fechaEnvio`).
>
> Los datos de los mocks siguen el manual de TransUnion (sector Servicios): el corte incluye obligaciones **Saldadas** (`estado.codigo === '02'`, con saldo y mora en 0), que el backend de hoy todavía no entrega; ver `docs/PENDIENTES_BACKEND.md`, sección 2.4.

**Errores:** todo error llega como `ApiError` con `message` en español y `fieldErrors` ({ campo: 'mensaje' }), `code` (identificador estable si el backend lo manda, o `null`) y `datos` (el cuerpo de la respuesta, o `null`). Para «No se pudo cargar… {mensaje}» usa `mensajeDeError(err)` de `lib/api`, que también cubre los errores que no son `ApiError`. En una pantalla:

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

El **hook reutilizable de RF31** ya existe: `useFormulario` (`lib/useFormulario.js`). Recibe `valoresIniciales`, `validar`, `traducirErrores` (el mapper de errores del backend) y `onSubmit`, y devuelve `campo(nombre)` para cada control, `formProps` para el `<form>`, `enviando` y `errorGeneral`. Ejemplos: `features/extraction/SubmissionModal.jsx` y `features/refinancing/RefinancingModal.jsx`.

## 7. Componentes disponibles (`components/ui`)

Se importan juntos: `import { Button, Input, Modal } from '../../components/ui'`.

| Componente | Para qué |
|---|---|
| `Button` (`variant`: primary, outline, ghost, danger; `size`; `loading`; `block`) | Botones. `buttonClasses()` sirve para un `<Link>` con aspecto de botón |
| `IconButton` | Botón de solo icono (editar). Exige `label` |
| `Input`, `Select`, `PasswordField` | Campos con etiqueta y error accesible |
| `SearchBox`, `FilterSelect` | Búsqueda y filtro de las tablas |
| `Table` (`caption`), `EmptyState` | Tabla con el estilo de la maqueta. Pasa `caption` y usa `<th scope="col">` |
| `Badge` (ok, off, admin, info, aviso, error, turquesa), `Chip`, `Switch` | Estados y activar/desactivar |
| `Tag` (neutro, aviso), `PorConfirmar` | Etiqueta pequeña junto a un texto. `<PorConfirmar />` marca lo que depende de CENS o de TransUnion (`children` cambia el texto, ej. «pendiente de CENS») |
| `Dato` (`etiqueta`, `valor`, `nota`) | Un dato con su etiqueta dentro de un `<dl>` (tarjetas del panel y del reporte) |
| `Card`, `PageHeader` | Contenedores y encabezado de página |
| `Modal` (`side` = panel lateral), `ConfirmDialog` | Diálogos accesibles (foco, Escape). `ConfirmDialog` para desactivar o eliminar |
| `useToast()` → `toast.success(msg)` / `toast.error(msg)` | Avisos abajo al centro |
| `Alert` (`tone`: error, aviso, info), `Spinner`, `TextLink`, `Icon` | Avisos en línea (`info` es la nota fija de la maqueta, no se anuncia), carga, enlaces, iconos |

**Componentes de TransUnion** (`features/transunion/`), para todas las pantallas de la Iteración 2:

| Componente o función | Para qué |
|---|---|
| `EstadoBadge` (`codigo`, `descripcion`) | Estado de la Tabla 4b como «01 · Vigente», con el color de la maqueta |
| `EdadMoraBadge` (`codigo`, `dias`) | Edad de mora de la Tabla 9 («01 - Mora 30») y los días |
| `CuotasMoraBadge` (`cuotas`) | Cuotas en mora (RF19): «Al día», 1 en ámbar, 2 o más en rojo |
| `CandadoCerrada` | Candado de los estados de cierre (02 y 07), con su texto para lector de pantalla |
| `RfTag` | Etiqueta del RF que aplica una regla («RF15») |
| `catalogosTU.js` | Tablas del Manual: `TABLA_9`, `ESTADOS_OBLIGACION` (4b), `TIPOS_IDENTIFICACION` (2), `ESTADOS_DE_CIERRE`, `esEstadoDeCierre`, `descripcionEstado`, `edadMoraDesdeDias` |
| `getCatalog(CATALOGOS.x)` (`catalogosService.js`) | Catálogos que guarda la base (`modosExtincion`, `tiposPago`, `naturalezasReestructuracion`, `motivosEliminacion`, `tipologiasReclamo`), cada código con `confirmado` |

Tokens de marca en `src/index.css` (bloque `@theme`): `bg-bosque`, `text-citrico`, `text-muted`, `font-hd`, `rounded-card`... Úsalos en vez de colores sueltos. Contraste: `bg-bosque-d` para superficies con texto blanco (`bosque` solo para texto grande, iconos y decoración), `bosque-dd` para su hover y `border-gris-d` para el borde de los controles de formulario. Para resaltar una fila recién creada o editada: `className="fila-resaltada"` unos segundos (ver `UsersPage.jsx`).

Ayudas de formato en `lib/format.js`: `formatearFechaHora`, `formatearCOP` ($1.276.016), `formatearFechaISO` (30/09/2026), `formatearFechaISOLarga` (30 de septiembre de 2026), `plural`, `enmascararIdentificacion` (`******0001`).

**La referencia visual es la maqueta:** `NexoVolt_Mockups_Iteracion1_v2.html` para la Iteración 1 y `docs/iteracion2/NexoVolt_Mockups_Iteracion2_v3.html` para la 2. Mismos textos, estados, validaciones e iconos, salvo donde el Manual dice otra cosa.

## 8. Roles y sesión

```js
import { useAuth } from '../auth/authContext'
import { ROLES } from '../auth/roles'
const { user } = useAuth()          // { id, nombre, correo, rol, ... }
const esAdmin = user.rol === ROLES.ADMIN
```

Las pantallas las protege `navigation.js` con su `roles` (sección 4): si el rol no puede abrirla, el menú la muestra bloqueada (candado y etiqueta ADMIN o ANALISTA) y, al abrirla, aparece «Acceso restringido» (`features/auth/RequireRole.jsx`, que ni siquiera carga la página). Si necesitas la misma guarda dentro de otra pantalla: `<RequireRole roles={[ROLES.ANALISTA]} seccion="Mi sección">…</RequireRole>`. Dentro de una pantalla permitida a ambos roles, oculta lo que no corresponde con `esAdmin`, pero **el backend decide**: en el mock eso es `exigirSesion({ rol })` (sección 5).

## 9. Pruebas (Vitest + Testing Library)

Cada pieza lleva su prueba. Ayudas en `src/test/renderApp.jsx`:

```js
await renderConSesion('/parametrizacion')              // Administrador con sesión real en el mock
await renderConSesion('/extraccion', 'jperez@example.com', 'Analista123')  // otro usuario
renderApp('/panel', ANALISTA)                          // usuario fijo; SOLO si la pantalla no llama a la API
```

Tres trampas que ya nos pasaron:

1. **Si tu pantalla pide datos, la prueba debe esperar a que lleguen** (`await screen.findByText('...')`) **antes de terminar**. Si no, la petición queda en vuelo, el mock limpia la sesión y esa respuesta (401) desloguea a la prueba siguiente: fallos aleatorios.
2. Con `renderApp(ruta, usuarioFijo)` el servidor simulado **no tiene sesión**: cualquier llamada a la API recibe 401. Para pantallas con datos usa `renderConSesion`.

3. Si una prueba deja una petición pendiente a propósito (con `server.use` y una promesa que sueltas tú), **espera a que la petición llegue** (`await waitFor(() => expect(llego).toBe(true))`) antes de soltarla. Si no, se suelta antes de que exista y la prueba falla según la carga de la máquina.

**Escenarios de prueba** (`src/test/escenarios/`): datos preparados que se reutilizan, como `ciclo.js` (cortes y ciclos de la pantalla 10), `envio.js` (`conArchivoApto`) y `resultadosTU.js` (archivos de respuesta de TransUnion ficticios, con los nombres del Manual).

**Accesibilidad:** agrega tu pantalla a `src/test/accesibilidad.test.jsx` (3 líneas con `expectAccesible()`) y lee `docs/ACCESIBILIDAD.md`. Para texto verde sobre fondo claro usa `text-bosque-d`, no `text-bosque` (no alcanza el contraste mínimo). Para fondos verdes con texto blanco usa `bg-bosque-d` y para bordes de campos `border-gris-d`; `src/test/contraste.test.js` protege estos pares.

**Conformidad con el contrato:** `src/test/contrato.test.js` llama a los mocks y valida cada respuesta contra los esquemas de `docs/contrato/openapi.yaml`. Cuando agregues o cambies un mock, agrega su caso ahí (método, ruta tal como aparece en el contrato, estado esperado); la prueba falla si el mock no coincide con `openapi.yaml`.

Antes de abrir el PR:

```
npm test && npm run lint && npm run build
```

## 10. Git y Pull Request

- Una rama por tarea desde `dev` actualizado: `feature/RFxx-descripcion` (ej. `feature/RF35-pantalla-parametros`). **Nunca trabajes sobre `dev` ni sobre `main`.**
- Haz `git fetch` y actualiza `dev` antes de crear la rama. El PR va hacia `dev`; `dev` pasa a `main` cuando se cierra una entrega.
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
