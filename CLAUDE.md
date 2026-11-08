# NexoVolt · frontend

Interfaz del sistema de reporte de cartera de CENS a TransUnion (Seminario Integrador III).

## Stack y comandos

- React 19 + Vite 8, React Router 7, axios, MSW 3 (datos simulados) y Vitest.
- `npm run dev` (http://localhost:5173), `npm test`, `npm run lint`, `npm run build`. Las tres últimas deben pasar antes de abrir un PR.

## Dónde está cada cosa

- `src/features/<módulo>/`: un módulo por carpeta, con nombre en inglés (`extraction`, `parameters`, `audit`…). Cada uno tiene su página (`XxxPage.jsx`), su servicio (`xxxService.js`), su mapper y sus validaciones.
- `src/components/ui/`: componentes compartidos.
- `src/lib/api/`: cliente HTTP (`client.js`), `ApiError.js` y rutas en `endpoints.js`.
- `src/lib/useFormulario.js`: hook de formularios con error por campo.
- `src/features/auth/RequireRole.jsx` y `roles.js`: guardas por rol (`<RequireRole roles={[ROLES.ANALISTA]} seccion={…}>`).
- `src/mocks/`: handlers de MSW.
- `docs/contrato/openapi.yaml`: contrato de la API. Es la fuente: el backend tiene una copia.
- `docs/iteracion2/`: fichas de los RF de la Iteración 2 (`RF_ITERACION2.md`), mockup v3 y Matriz de cambios de estado.
- `docs/GUIA_EQUIPO.md`: reglas del equipo, flujo de git y plantilla de PR.

## Reglas

- Las pantallas no llaman a axios: usan el servicio de su módulo.
- Textos, errores y `aria-label` en español. Cada pantalla tiene estado vacío, de carga y de error.
- Si un endpoint no existe todavía, no lo inventes como definitivo: déjalo en el mock, márcalo como "propuesto" en `endpoints.js` y anótalo en `docs/PENDIENTES_BACKEND.md`.
- Lo marcado entre corchetes o "por confirmar" en las fichas depende de CENS o TransUnion: se parametriza y no se inventa.
- Nada real en el repo: sin credenciales, `.env`, wallet ni datos de CENS. Los correos de ejemplo usan `example.com`.

## Git

- Rama por tarea desde `dev` actualizado: `feature/RFxx-descripcion`. Nunca se trabaja sobre `dev` ni sobre `main`.
- Commit: `feat(módulo): descripción (RFxx)`.
- PR hacia `dev` con la plantilla de `docs/GUIA_EQUIPO.md` §10. El frontend lo revisa Johan.
