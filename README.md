# Reporte CENS — Frontend

Frontend de la aplicación Reporte CENS construido con Vite + React.

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
| `rmartinez@cens.com.co` | `Admin12345` | Administrador |
| `jperez@cens.com.co` | `Analista123` | Analista de Cartera |
| `mgomez@cens.com.co` | `Temporal123` | Primer ingreso (debe cambiar la contraseña) |
| `avargas@cens.com.co` | `Cartera123` | Usuario desactivado |

### Contrato propuesto con el backend (por confirmar con Dilan y José Luis)

| Método y ruta | Cuerpo | Respuesta |
|---|---|---|
| `GET /auth/csrf/` | — | 204, entrega la cookie `csrftoken` |
| `POST /auth/login/` | `{ email, password }` | 200 `{ user }` · 401 credenciales · 403 usuario desactivado |
| `POST /auth/logout/` | — | 204 |
| `GET /auth/me/` | — | 200 `{ user }` · 401 sin sesión |
| `POST /auth/change-password/` | `{ current_password, new_password }` | 204 · 400 por campo |
| `POST /auth/password-reset/` | `{ email }` | 202, siempre igual (no revela si el correo existe) |
| `POST /auth/password-reset/confirm/` | `{ token, new_password }` | 204 · 400 |
| `GET /users/` | — | 200 `[user]` (solo Administrador, 403 al Analista) |
| `POST /users/` | `{ nombre, email, rol }` | 201 `{ user, temporary_password }` |
| `PATCH /users/:id/` | `{ nombre?, email?, rol?, is_active? }` | 200 `user` |

`user` = `{ id, nombre, email, rol, is_active, last_login, must_change_password }`. El traductor a la interfaz está en `features/users/userMapper.js`.

### Probar la recuperación de contraseña con los mocks

El correo no se envía de verdad. Con los mocks, el enlace de restablecimiento válido es:
`http://localhost:5173/restablecer?token=token-de-prueba` (cualquier otro token se rechaza).

## Documentación para el equipo

- [`docs/GUIA_EQUIPO.md`](docs/GUIA_EQUIPO.md): cómo agregar una pantalla, hablar con la API, hacer formularios, probar y abrir un PR.
- [`docs/PENDIENTES_BACKEND.md`](docs/PENDIENTES_BACKEND.md): lo que el frontend espera del backend y las decisiones por cerrar con Dilan y José Luis.
