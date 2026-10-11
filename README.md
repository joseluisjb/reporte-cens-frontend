# Reporte CENS — Frontend

Frontend de la aplicación Reporte CENS construido con Vite + React.

https://reporte-cens.onrender.com/login
## Requisitos

- Node.js 18 o superior
- npm 9 o superior

## Instalación

```bash
npm install
```

## Variables de entorno

Copia el archivo de ejemplo y ajusta los valores según tu entorno:

```bash
cp .env.example .env
```

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL base del backend (`/api` usa el proxy de Vite hacia `localhost:8000`) |
| `VITE_USE_MOCKS` | `true` usa datos simulados (MSW) |
| `VITE_IDLE_MINUTES` | Minutos de inactividad antes de cerrar la sesión (RF26) |
| `VITE_DEMO_MODE` | Solo desarrollo: habilita "Cambiar de perfil" |

## Ejecución

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia el servidor de desarrollo (puerto 5173) |
| `npm run build` | Genera la versión de producción en `dist/` |
| `npm run preview` | Sirve el build de producción localmente |
| `npm test` | Ejecuta las pruebas una vez |
| `npm run test:watch` | Ejecuta las pruebas en modo vigilancia |
| `npm run lint` | Analiza el código con Oxlint |
| `npm run test:cov` | Pruebas con informe de cobertura |

## Estructura principal

```
src/
  app/              App, router y proveedores
  components/ui/    Componentes reutilizables (botón, input, modal, tabla...)
  features/         Una carpeta por módulo: auth, users, extraction, parameters, audit
  lib/api/          Cliente HTTP (axios) y manejo global de 401/403
  mocks/            Datos simulados (MSW) mientras no existan los endpoints reales
  test/             Configuración de pruebas (Vitest + Testing Library)
```

Los tokens de marca (colores, fuentes, radios, sombras) viven en `src/index.css`, bloque `@theme`.

## Cliente HTTP, servicios y mocks

- **Cliente único** (`src/lib/api/client.js`, axios): sesión por cookie HttpOnly de Django + token CSRF (`X-CSRFToken`). No se guarda nada sensible en `localStorage`. Maneja 401/403 de forma global (`setAuthHandlers`) y convierte todo error en un `ApiError` con mensaje en español y errores por campo (`fieldErrors`).
- **Servicios por módulo** (`features/<modulo>/*Service.js`): las pantallas llaman solo a estas funciones, nunca a axios. Para agregar un servicio nuevo, sigue el ejemplo de `features/users/usersService.js`.
- **Rutas del backend** en un solo archivo: `src/lib/api/endpoints.js`.
- **Mocks (MSW)** en `src/mocks/`: con `VITE_USE_MOCKS=true` responden las llamadas con datos ficticios. Con `false` se pasa al backend real **sin tocar las pantallas** y los mocks no entran al build. Las pruebas usan los mismos handlers.
- Para agregar un mock: crea el handler en `src/mocks/handlers.js` (o en un archivo propio que se sume a `handlers`).

### Cuentas de prueba (solo con mocks, todas ficticias)

| Correo | Contraseña | Caso |
|---|---|---|
| `rmartinez@example.com` | `Admin12345` | Administrador |
| `jperez@example.com` | `Analista123` | Analista de Cartera |
| `mgomez@example.com` | `Temporal123` | Primer ingreso (debe cambiar la contraseña) |
| `avargas@example.com` | `Cartera123` | Usuario desactivado |

### Contrato con el backend

El contrato acordado está en [`docs/contrato/openapi.yaml`](docs/contrato/openapi.yaml) (OpenAPI 3.0, versión 0.2). Su explicación y las diferencias con el backend están en [`docs/contrato/README.md`](docs/contrato/README.md).

- Para verlo en el navegador: `npx @redocly/cli@1 preview-docs docs/contrato/openapi.yaml`.
- El frontend adapta los nombres del backend solo en los mappers (por ejemplo `features/users/userMapper.js`).
- Las preguntas pendientes para el backend están en [`docs/PENDIENTES_BACKEND.md`](docs/PENDIENTES_BACKEND.md).

### Probar la recuperación de contraseña con los mocks

El correo no se envía de verdad. Con los mocks, el enlace de restablecimiento válido es:
`http://localhost:5173/restablecer?token=token-de-prueba` (cualquier otro token se rechaza).

## Documentación para el equipo

- [`docs/GUIA_EQUIPO.md`](docs/GUIA_EQUIPO.md): cómo agregar una pantalla, hablar con la API, hacer formularios, probar y abrir un PR.
- [`docs/PENDIENTES_BACKEND.md`](docs/PENDIENTES_BACKEND.md): lo que el frontend espera del backend y las decisiones por cerrar con Dilan y José Luis.
- [`docs/contrato/`](docs/contrato/): contrato OpenAPI 0.2 con el backend (`openapi.yaml`) y su explicación (`README.md`).
- [`docs/ACCESIBILIDAD.md`](docs/ACCESIBILIDAD.md): resultados de la revisión de accesibilidad, contraste y lista de revisión manual.
- [`docs/GUION_DEMO.md`](docs/GUION_DEMO.md): guion de 10 minutos para la reunión de aceptación con CENS (HU-D).
