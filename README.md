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
