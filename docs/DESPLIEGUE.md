# Despliegue en Render y conexión con el backend real

Cómo están desplegados los dos servicios, cómo se conectan y cómo comprobar que todo responde.

## 1. Cómo está desplegado

| Servicio | Tipo en Render | URL |
|---|---|---|
| Frontend | Sitio estático (Vite) | `https://reporte-cens.onrender.com` |
| Backend (Django + DRF, rutas bajo `/api/`) | Servicio web (gunicorn, `--timeout 120`) | `https://reporte-cens-backend.onrender.com` |

**Por qué una reescritura y no llamar al backend directamente.** `onrender.com` es un sufijo público: el navegador no comparte cookies entre `reporte-cens.onrender.com` y `reporte-cens-backend.onrender.com`, y la cookie de sesión de Django es `SameSite=Lax`, que no viaja en peticiones entre sitios distintos. Con una regla de reescritura de Render, `/api/*` del frontend se reenvía al backend y el navegador ve **un solo origen**. Por eso el cliente (`src/lib/api/client.js`, `baseURL: '/api'`, cookies + CSRF) no cambia.

**Arranque en frío.** Render duerme el backend si no se usa. La primera petición tarda ~20 s (medido). El cliente espera hasta 60 s en la consulta de sesión y el login (`TIEMPO_ESPERA_ARRANQUE_MS` en `src/lib/config.js`), y la app avisa "Conectando con el servidor…" pasados 5 s.

## 2. Reescritura en el panel de Render (una sola vez)

En el sitio estático del frontend: **Redirects/Rewrites** → agregar una regla:

- **Source:** `/api/*`
- **Destination:** `https://reporte-cens-backend.onrender.com/api/*`
- **Action:** `Rewrite`

Debe quedar **antes** de la regla del SPA (`/*` → `/index.html`, Rewrite). Render aplica las reglas en orden; si la del SPA va primero, `/api/*` devuelve el HTML de la app.

## 3. Variables del sitio

En **Environment** del sitio del frontend:

| Variable | Valor |
|---|---|
| `VITE_USE_MOCKS` | `true` mientras falte el backend (ver sección 6); `false` para usar el real |
| `VITE_API_URL` | `/api` |
| `VITE_DEMO_MODE` | `false` |
| `VITE_IDLE_MINUTES` | `10` (debe coincidir con el backend) |

Se leen **al compilar**: después de cambiar cualquiera hay que volver a desplegar el sitio (*Manual Deploy*).

## 4. Comprobar la conexión

```
curl https://reporte-cens.onrender.com/api/salud/
```

Debe devolver JSON: `{"estado":"ok"}`. Si devuelve el HTML de la app, la regla de la sección 2 falta o está después de la del SPA. La primera llamada del día puede tardar ~20 s.

## 5. Prueba de humo contra el backend real

`npm run humo` (`scripts/humo-api.mjs`, Node 20+) **no crea, cambia ni borra datos**: sin credenciales solo hace GET; con credenciales, además, inicia y cierra sesión. Valida cada respuesta con el contrato `docs/contrato/openapi.yaml`. Imprime una línea por comprobación (`OK`, `PENDIENTE` o `FALLA`) y sale con código 1 si hubo alguna `FALLA`. `PENDIENTE` es una diferencia conocida (por ejemplo, 403 en lugar de 401 sin sesión, diferencia K, o que aún no exista `/auth/*`) y no cuenta como fallo.

- **Sin credenciales:** `npm run humo` comprueba `/salud/`, que sin sesión se rechace y si existe la autenticación.
- **Con credenciales** (recorre además sesión, conceptos, grupos, cortes y obligaciones; cierra sesión al final):

  ```
  # Git Bash
  HUMO_CORREO=usuario@example.com HUMO_CLAVE=... npm run humo
  # PowerShell
  $env:HUMO_CORREO='usuario@example.com'; $env:HUMO_CLAVE='...'; npm run humo
  ```

  Las credenciales van **solo por variables de entorno**, nunca en el código, en archivos versionados ni en el historial compartido.
- Otras variables: `HUMO_API_URL` (por defecto la API de Render) y `HUMO_ORIGEN` (por defecto `https://reporte-cens.onrender.com`; Django exige un origen de confianza en las peticiones HTTPS con CSRF).

## 6. Desarrollo local contra el backend de Render

En tu `.env` (nunca se versiona):

```
VITE_USE_MOCKS=false
API_PROXY_TARGET=https://reporte-cens-backend.onrender.com
```

Reinicia `npm run dev`. El proxy de Vite reenvía `/api` a Render. `API_PROXY_TARGET` no lleva prefijo `VITE_`, así que no llega al navegador. Sin ella, el proxy apunta a `http://localhost:8000`.

## 7. Qué falta del backend para apagar los mocks

Hoy no existe `/api/auth/*` (404) y, sin sesión, los endpoints de negocio responden 403 en lugar de 401. Mientras tanto el sitio desplegado debe seguir con `VITE_USE_MOCKS=true`. La lista de lo pendiente y su dueño está en `docs/PENDIENTES_BACKEND.md`, sección 1 (autenticación, sesión y roles).

## 8. Revertir

Poner `VITE_USE_MOCKS=true` en las variables del sitio y volver a desplegar. La reescritura puede quedarse: con mocks activos el navegador no llama al backend.
