# Contrato de la API — Iteración 1

Acuerdo entre frontend y backend sobre **cómo se hablan**: rutas, qué se envía, qué se responde y qué errores existen. Está escrito como **OpenAPI 3.0** en [`openapi.yaml`](openapi.yaml), el formato estándar que entiende DRF (`drf-spectacular`), Swagger y Postman.

**Estado: BORRADOR 0.2 para revisión** de José Luis y Dilan. Parte de lo que el frontend ya construyó y probó contra mocks (autenticación y usuarios), se **alinea con lo que José Luis ya implementó** en `reporte-cens-backend` (rama `dev`: conceptos, grupos de conceptos y salud; su propia referencia está en `docs/API.md` de ese repo) y propone lo que falta (extracción, historial, auditoría). Cada operación dice en su descripción si está *implementado en el frontend* o es *propuesta*. Está contrastado con las actas de CENS, el catálogo de conceptos y el Manual Sector Real v34.

## Cómo verlo

```bash
# Documentación navegable en el navegador
npx @redocly/cli@1 preview-docs docs/contrato/openapi.yaml

# Validar que el archivo esté bien escrito
npx @redocly/cli@1 lint docs/contrato/openapi.yaml --config docs/contrato/redocly.yaml
```

También se puede pegar `openapi.yaml` en <https://editor.swagger.io>. No contiene datos reales.

## Qué cubre

| Módulo | Endpoints | RF | Responsable backend | Rol | Estado |
|---|---|---|---|---|---|
| Autenticación | `GET /auth/csrf/` · `POST /auth/login/` · `POST /auth/logout/` · `GET /auth/me/` · `POST /auth/change-password/` | RF25, RF26 | Dilan | Todos | Implementado en el frontend |
| Recuperación | `POST /auth/password-reset/` · `POST /auth/password-reset/confirm/` | RF29 | José Luis | Público | Implementado en el frontend |
| Usuarios | `GET`, `POST /users/` · `PATCH /users/{id}/` | RF28 | José Luis | Administrador | Implementado en el frontend |
| Utilidades | `GET /salud/` | — | José Luis | Público | Implementado en el backend |
| Conceptos de energía | `GET`, `POST /conceptos/` · `PATCH /conceptos/{codigo}/` | RF35 | José Luis (API) · Angel (tabla) | Lectura: ambos · escritura: Administrador | Implementado en el backend (permisos por ajustar) |
| Grupos de conceptos | `GET`, `POST /grupos-conceptos/` · `GET`, `PATCH`, `DELETE /grupos-conceptos/{id}/` | RF43 | José Luis | Lectura: ambos · escritura: Administrador | Implementado en el backend (permisos por ajustar) |
| Extracción | `GET`, `POST /extracciones/` · `GET /extracciones/{id}/` · `GET /extracciones/{id}/obligaciones/` | RF1–RF5, RF7 | José Luis · Clara | Analista y Administrador | Propuesta |
| Historial | `GET /historial/reportes/` · `GET /historial/deudores/` | RF6, RF8 | José Luis · Clara | Analista y Administrador | Borrador |
| Auditoría | `GET /auditoria/` | RF30 | Dilan | Administrador | Propuesta |

Transversales que el contrato fija para todos los endpoints: sesión por cookie y CSRF, vencimiento deslizante de 10 minutos (RF26), roles con `403` (RF27), errores en español por campo (RF31), paginación `{count, next, previous, results}`, fechas ISO 8601 en hora de Colombia y montos en pesos (COP) como número. El archivo de TransUnion los exige en **miles de pesos**: esa conversión es del generador (Iteración 2), no de la API.

**Sin endpoint a propósito:** RF9 (actualización mensual) es un comando de gestión de Django, no una ruta.

**Reglas del manual de TransUnion que ya están en el contrato:** `numero_obligacion` de máximo 20 caracteres, solo letras, números y `( ) * , - . / \ _`, único y permanente; `edad_mora` con los 15 códigos de la Tabla 9; categoría de servicio `04` en lugar de línea de crédito; `tipo_accion` del log con las acciones de RF30 y del Acta 3 (consulta, cálculo, generación, exportación, modificación, corrección y eliminación).

## Fuera del contrato (aparece en la maqueta, no en el alcance)

"Cambiar datos", "Cambiar de perfil", "Exportar resumen" y "Exportar log". `POST /demo/switch-profile/` existe solo en los mocks del frontend. Si CENS o el docente piden alguno de estos, primero se agregan al alcance y después al contrato.

Los **grupos de conceptos** dejaron de estar fuera: el backend ya implementó RF43 y la extracción se ejecuta eligiendo un grupo (`grupo_id`). RF43 no aparece en la Planificación de Alcance Global (RF1–RF42) ni en la Asignación: hay que documentarlo y confirmar que está aprobado.

## Diferencias con lo implementado en el backend

El contrato 0.2 ya adopta lo que José Luis construyó. Estas son las diferencias que **quedan por resolver** (revisado en `origin/dev` el 10/10/2026):

| # | Backend hoy | Lo que piden la documentación o el frontend | Propuesta |
|---|---|---|---|
| A | `GET/POST/PATCH` de conceptos y grupos permitidos a **Analista y Administrador**. | Parametrización es solo del Administrador (Acta 3, RF27, maqueta con la etiqueta ADMIN). El Analista sí necesita **leer** los grupos para elegir uno al extraer. | Lectura para ambos; crear, editar y eliminar solo Administrador. |
| B | `NV_CONCEPTO_REPORTABLE` no tiene fecha de creación. | RF35 (Asignación, ficha de Angel) pide mostrar código, descripción, estado y **fecha de creación**. | Agregar la columna `FECHA_CREACION`, o quitar el requisito. Responsable: Angel y Clara (tabla). |
| C | La extracción se modela como un **corte** (`NV_CORTE`, con `GRUPO_ID` y `ESTADO`, por ejemplo `BORRADOR`). | El contrato propone `/extracciones/` con estados `en_proceso`, `completada` y `fallida`. | Acordar el nombre del recurso y los estados. Puede que el estado del *corte* (negocio) y el de la *ejecución* (técnico) sean dos cosas distintas. |
| D | `repositorio.py` lee `NEXOVOLT.V_DEUDOR_VIGENTE` y `V_CREDITO_REPORTABLE`. Esas vistas **no traen nombre ni identificación del deudor**, solo `CLIENTE_ID`. | La pantalla de resultados muestra el nombre del deudor; el archivo de TransUnion exige identificación. | Definir de dónde sale el nombre y la identificación (otra tabla o vista). |
| E | Los conflictos responden `409` con `{ detail }`. | El primer borrador usaba `400` con error por campo. | El contrato adopta `409`. |
| F | Conceptos y grupos usan `activo` (booleano). Usuarios usarán `is_active` (convención de Django). | — | Se mantiene la diferencia; el frontend la absorbe en sus mappers. |
| G | Sin búsqueda ni paginación en conceptos y grupos. | El borrador proponía `?buscar=`. | Se quita; el frontend filtra en el cliente. |
| H | `usuarios/models.py` vacío y `docs/API.md` dice "Autenticación: pendiente de RF25". Roles como códigos `ANALISTA_CARTERA` y `ADMINISTRADOR`. | El frontend asumía los textos "Analista de Cartera" y "Administrador". | El contrato usa los códigos del backend; el frontend los traduce. Dilan lo confirma al construir la autenticación. |
| I | El código del concepto es un entero de 1 a 9999. | El primer borrador lo trataba como texto. | Entero, como el backend. |
| J | No hay autenticación ni campo `rol` en `request.user` (`usuarios/models.py` vacío, sin `AUTH_USER_MODEL`); `EsAnalistaOAdministrador` lee `getattr(request.user, "rol", None)`, así que hoy **todo** endpoint de conceptos y grupos respondería 403 (deducido del código; confirmar con un login real). | Que los permisos funcionen con el usuario real. | Dilan: modelo de usuario con `rol` antes del primer `migrate`. |
| K | Con `SessionAuthentication` como primera clase, un anónimo recibe **403** "Authentication credentials were not provided." y no 401. | El contrato usa 401 para "sin sesión o sesión vencida" (el frontend cierra la sesión con 401). | `authenticate_header` propio o un `EXCEPTION_HANDLER` que devuelva 401 con `code: not_authenticated`. |
| L | `LANGUAGE_CODE = "en-us"`: las validaciones de DRF salen en inglés (por ejemplo "This field is required."). | RF31: mensajes en español. | `LANGUAGE_CODE = "es-co"`; los mocks del frontend ya responden en español. |
| M | `TIME_ZONE = "UTC"`; `creado` de los grupos sale de `SYSDATE` de Oracle. | Fechas en hora de Colombia. | `TIME_ZONE = "America/Bogota"` y generar la fecha en Django (`timezone.localdate()`) en vez de `SYSDATE`, que sigue el reloj del servidor Oracle. |
| N | Sin `DEFAULT_PAGINATION_CLASS`. | Listados paginados `{count, next, previous, results}` con `?page` y `?page_size`. | `PageNumberPagination` con `page_size_query_param = "page_size"` y `max_page_size = 100`. |
| O | Códigos repetidos en `conceptos` de un grupo (`[30, 30]`) no se validan; el detalle tiene llave compuesta, posible 500. | Error claro. | Rechazar repetidos con 400 (`uniqueItems`). |
| P | `PATCH /conceptos/abc/` (código no numérico) llega a Oracle; posible 500. | 404. | Validar el código en la ruta (`<int:codigo>` o un `lookup_value_regex`). |

## Decisiones por cerrar

| # | Pregunta | Quién | Propuesta del contrato |
|---|---|---|---|
| 1 | ~~Base de datos propia de la app~~ **Resuelta: Oracle** (la del wallet). El contrato no depende de esto; sí la implementación: `settings.py` ya apunta a Oracle, y además hace falta la conexión de solo lectura a la base comercial de CENS (VPN). | José Luis | Oracle; definir el modelo de usuario propio antes del primer `migrate` |
| 2 | ~~Contraseña temporal~~ **Resuelta: se envía por correo.** `POST /users/` ya no devuelve la contraseña (`temporary_password` en `null` o ausente). En desarrollo el correo sale por consola. | José Luis | Envío por correo; el frontend ya muestra "La contraseña temporal se envió a su correo" |
| 3 | Extracción **asíncrona** (`202` + consulta periódica del estado) en vez de bloquear la petición. La maqueta muestra 5 pasos con progreso. | José Luis | Asíncrona, con `409` si ya hay una en curso |
| 4 | Una obligación consolidada puede sumar varios conceptos. Los códigos reales son **numéricos** (`30`, `94`), enteros de 1 a 9999. | Clara · Angel | `conceptos: [codigo]` (arreglo de enteros) |
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
| 15 | ~~Qué define "energía"~~ **Resuelta en el diseño:** la define la tabla `NV_CONCEPTO_REPORTABLE` (columna `REPORTABLE`) en la base Oracle de la aplicación, agrupada en **grupos de conceptos** (RF43) que se eligen al extraer. El catálogo de CENS sugiere sembrarla con `30` (cuota) y `94` (interés). Queda validar esa lista inicial con el contacto de cartera de CENS. | Angel · José Luis · contacto de cartera de CENS | Sembrar la tabla con `30` y `94` y validar |
| 16 | **RF43 (grupos de conceptos)** está implementado pero no figura en la Planificación ni en la Asignación. | Santiago · José Luis | Documentarlo como requerimiento y confirmar con CENS (¿está en el acta de los mockups, que falta?) |
| 17 | Permisos de escritura de conceptos y grupos (diferencia A). | José Luis | Solo Administrador para escribir |
| 18 | Fecha de creación del concepto (diferencia B). | Angel · Clara | Agregar la columna |
| 19 | Recurso y estados de la extracción: `corte` o `extraccion` (diferencia C). | José Luis | Acordar nombre y estados |
| 20 | Origen del nombre y de la identificación del deudor (diferencia D). | José Luis · Clara | Otra vista o tabla del esquema `NEXOVOLT` |

Los puntos de sesión, `LANGUAGE_CODE`, Argon2 y modelo de usuario propio ya están detallados en [`../PENDIENTES_BACKEND.md`](../PENDIENTES_BACKEND.md) y siguen vigentes.

## Cómo se mantiene

1. **Los cambios entran por PR**, igual que el código, y los aprueban quien consume y quien implementa el endpoint.
2. **Un cambio que rompe** (renombrar un campo, quitar uno, cambiar un código HTTP) se avisa antes de fusionarlo; agregar un campo opcional no rompe a nadie.
3. **Cuando el backend implemente un endpoint**, genera su propio esquema con `drf-spectacular` (`python manage.py spectacular --file schema.yml`) y se compara con este archivo. Si difieren, uno de los dos está mal y se corrige.
4. **En el frontend**, al confirmarse un módulo se agregan sus rutas a `src/lib/api/endpoints.js`, su servicio y sus mocks (MSW) con exactamente estas formas.
