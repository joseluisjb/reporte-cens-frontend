# Contrato de la API — Iteración 1

Acuerdo entre frontend y backend sobre **cómo se hablan**: rutas, qué se envía, qué se responde y qué errores existen. Está escrito como **OpenAPI 3.0** en [`openapi.yaml`](openapi.yaml), el formato estándar que entiende DRF (`drf-spectacular`), Swagger y Postman.

**Estado: BORRADOR para revisión** de José Luis y Dilan. Parte de lo que el frontend ya construyó y probó contra mocks (autenticación y usuarios) y propone lo que falta (conceptos, extracción, historial, auditoría). Cada operación dice en su descripción si está *implementado en el frontend* o es *propuesta*. Está contrastado con las actas de CENS, el catálogo de conceptos y el Manual Sector Real v34.

## Cómo verlo

```bash
# Documentación navegable en el navegador
npx @redocly/cli preview-docs docs/contrato/openapi.yaml

# Validar que el archivo esté bien escrito
npx @redocly/cli lint docs/contrato/openapi.yaml --config docs/contrato/redocly.yaml
```

También se puede pegar `openapi.yaml` en <https://editor.swagger.io>. No contiene datos reales.

## Qué cubre

| Módulo | Endpoints | RF | Responsable backend | Rol | Estado |
|---|---|---|---|---|---|
| Autenticación | `GET /auth/csrf/` · `POST /auth/login/` · `POST /auth/logout/` · `GET /auth/me/` · `POST /auth/change-password/` | RF25, RF26 | Dilan | Todos | Implementado en el frontend |
| Recuperación | `POST /auth/password-reset/` · `POST /auth/password-reset/confirm/` | RF29 | José Luis | Público | Implementado en el frontend |
| Usuarios | `GET`, `POST /users/` · `PATCH /users/{id}/` | RF28 | José Luis | Administrador | Implementado en el frontend |
| Conceptos de energía | `GET`, `POST /conceptos/` · `PATCH /conceptos/{id}/` | RF35 | José Luis (API) · Angel (tabla) | Administrador | Propuesta |
| Extracción | `GET`, `POST /extracciones/` · `GET /extracciones/{id}/` · `GET /extracciones/{id}/obligaciones/` | RF1–RF5, RF7 | José Luis · Clara | Analista y Administrador | Propuesta |
| Historial | `GET /historial/reportes/` · `GET /historial/deudores/` | RF6, RF8 | José Luis · Clara | Analista y Administrador | Borrador |
| Auditoría | `GET /auditoria/` | RF30 | Dilan | Administrador | Propuesta |

Transversales que el contrato fija para todos los endpoints: sesión por cookie y CSRF, vencimiento deslizante de 10 minutos (RF26), roles con `403` (RF27), errores en español por campo (RF31), paginación `{count, next, previous, results}`, fechas ISO 8601 en hora de Colombia y montos en pesos (COP) como número. El archivo de TransUnion los exige en **miles de pesos**: esa conversión es del generador (Iteración 2), no de la API.

**Sin endpoint a propósito:** RF9 (actualización mensual) es un comando de gestión de Django, no una ruta.

**Reglas del manual de TransUnion que ya están en el contrato:** `numero_obligacion` de máximo 20 caracteres, solo letras, números y `( ) * , - . / \ _`, único y permanente; `edad_mora` con los 15 códigos de la Tabla 9; categoría de servicio `04` en lugar de línea de crédito; `tipo_accion` del log con las acciones de RF30 y del Acta 3 (consulta, cálculo, generación, exportación, modificación, corrección y eliminación).

## Fuera del contrato (aparece en la maqueta, no en el alcance)

Grupos de conceptos, "Cambiar datos", "Cambiar de perfil", "Exportar resumen" y "Exportar log". La extracción usa **todos los códigos activos**. `POST /demo/switch-profile/` existe solo en los mocks del frontend. Si CENS o el docente piden alguno de estos, primero se agregan al alcance y después al contrato.

## Decisiones por cerrar

| # | Pregunta | Quién | Propuesta del contrato |
|---|---|---|---|
| 1 | ~~Base de datos propia de la app~~ **Resuelta: Oracle** (la del wallet). El contrato no depende de esto; sí la implementación: `settings.py` ya apunta a Oracle, y además hace falta la conexión de solo lectura a la base comercial de CENS (VPN). | José Luis | Oracle; definir el modelo de usuario propio antes del primer `migrate` |
| 2 | ~~Contraseña temporal~~ **Resuelta: se envía por correo.** `POST /users/` ya no devuelve la contraseña (`temporary_password` en `null` o ausente). En desarrollo el correo sale por consola. | José Luis | Envío por correo; el frontend ya muestra "La contraseña temporal se envió a su correo" |
| 3 | Extracción **asíncrona** (`202` + consulta periódica del estado) en vez de bloquear la petición. La maqueta muestra 5 pasos con progreso. | José Luis | Asíncrona, con `409` si ya hay una en curso |
| 4 | La maqueta muestra **un concepto por fila**, pero una obligación consolidada puede sumar varios. Además, los códigos reales son **numéricos** (`30`, `94`), no `ENE-001`. | Clara · Angel | `conceptos: [codigo]` (arreglo de texto, sin formato fijo) |
| 5 | ~~Tabla 9 completa~~ **Resuelta** con el Manual v34: códigos `00` a `14`. Las descripciones de la maqueta ("Mora 30", "Mora 90") coinciden. | — | `edad_mora: { codigo (enum 00–14), descripcion }` |
| 6 | ¿Un Analista ve todas las extracciones o solo las suyas? | José Luis · Santiago | Todas (la maqueta muestra el log general) |
| 7 | Campo `code` estable en los errores generales para distinguir `403` por permisos, por CSRF y por contraseña temporal. | Dilan | Sí; el frontend lo usaría para mostrar el mensaje correcto |
| 8 | Qué eventos entran al log: la maqueta muestra inicio de sesión, usuarios, conceptos, extracción, consulta y corrección de obligación. `tipo_accion` es un conjunto fijo para poder filtrar. | Dilan · Omar | Lista del schema `TipoAccion` |
| 9 | ¿Front y back bajo el mismo dominio? (define `SameSite` y CORS) | Dilan | Mismo dominio |
| 10 | Pantalla `/restablecer?token=` (el frontend la agregó; no está en la maqueta). | Santiago | Confirmar |
| 11 | Forma real de `ReporteHistorico` y `DeudorHistorico`. | Clara | Borrador, se ajusta con su esquema |
| 12 | **Obligación por proceso, no por deudor.** El Acta 2 y el manual lo indican; RF4 y RF5 dicen "por deudor". El contrato ya devuelve una fila por obligación (proceso). | Clara · José Luis | Una fila por financiación; el número se deriva del proceso y es permanente (máx. 20 caracteres) |
| 13 | **Campos pendientes de la lista de CENS** (22 campos): identificación, fecha límite, valor inicial, de mora y de cuota, cuotas en mora, categoría de servicio `04`. Están en `Obligacion` marcados *(pendiente)*. Correo y celular quedan fuera de la API. | Clara · Santiago | Confirmar cuáles se muestran en la Iteración 1 y si CENS es entidad atípica o no atípica |
| 14 | **¿Quién ejecuta la extracción?** El Acta 3 dice que el Analista; el contrato deja entrar también al Administrador. | José Luis · Santiago | Pendiente de CENS; si solo el Analista, el Administrador recibe `403` |
| 15 | ~~Qué define "energía"~~ **Resuelta en el diseño:** la define la tabla de parámetros de RF35, en la base Oracle de la aplicación, que mantiene el Administrador (Angel crea la tabla y José Luis expone la API). El catálogo de CENS sugiere sembrarla con `30` (cuota) y `94` (interés). Queda validar esa lista inicial con Sergio. No cambia el contrato. | Angel · José Luis · Sergio | `codigo` libre; sembrar la tabla con `30` y `94` y validar |

Los puntos de sesión, `LANGUAGE_CODE`, Argon2 y modelo de usuario propio ya están detallados en [`../PENDIENTES_BACKEND.md`](../PENDIENTES_BACKEND.md) y siguen vigentes.

## Cómo se mantiene

1. **Los cambios entran por PR**, igual que el código, y los aprueban quien consume y quien implementa el endpoint.
2. **Un cambio que rompe** (renombrar un campo, quitar uno, cambiar un código HTTP) se avisa antes de fusionarlo; agregar un campo opcional no rompe a nadie.
3. **Cuando el backend implemente un endpoint**, genera su propio esquema con `drf-spectacular` (`python manage.py spectacular --file schema.yml`) y se compara con este archivo. Si difieren, uno de los dos está mal y se corrige.
4. **En el frontend**, al confirmarse un módulo se agregan sus rutas a `src/lib/api/endpoints.js`, su servicio y sus mocks (MSW) con exactamente estas formas.
