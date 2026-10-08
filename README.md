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
| `VITE_API_URL` | URL base del backend (ej. `http://localhost:8000/api`) |

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
  api/        Clientes HTTP (envoltorio de fetch)
  auth/       Contexto y lógica de autenticación
  components/ Componentes reutilizables
  pages/      Vistas por ruta
  styles/     Tokens de diseño (variables CSS)
  test/       Configuración de pruebas
```
