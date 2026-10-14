# Pendientes con el backend (Dilan y José Luis)

Lo que el frontend **ya espera** del backend y lo que hay que confirmar. El frontend está construido y probado contra una API simulada; cuando los endpoints reales existan, se apaga `VITE_USE_MOCKS` y se corrigen solo `src/lib/api/endpoints.js` y los mappers.

Dónde está todo: contrato en `docs/contrato/openapi.yaml` (explicación en `docs/contrato/README.md`), la API simulada en `src/mocks/handlers.js`.

Cada punto trae una **suposición** del frontend. Si es correcta, basta responder "ok"; si no, dígannos cuál es y se ajusta aquí.

---

## 1. Para Dilan — autenticación, sesión y roles (RF25, RF26, RF27)

**Quién lo hace, según la asignación de la iteración 1:**
- **Dilan:** RF25 (inicio de sesión con Argon2), RF26 (vencimiento por inactividad y cierre de sesión) y RF27 (roles y permisos en cada endpoint), en la fila 39. También RF30 (modelo y API de auditoría) y RF31 (validaciones del backend), en la fila 41.
- **José Luis:** RF28 (usuarios) y RF29 (cambio y recuperación de contraseña), en la fila 40; ver la sección 2.1.
- **José Luis y Johan:** la fila 42, conectar la extracción con la autenticación.

**Estado al 13/10/2026 (`main` `260d31e`, contrato 0.6):** RF25, RF26 y RF27 (PR #15 y #18 de Dilan), RF28 y RF29 (PR #25 de José Luis) y RF30 y RF31 (PR #27 de Dilan) ya están en el backend y desplegados en Render. Johan probó en local el recorrido real de login, usuarios, primer ingreso, desactivación y recuperación. La fila 42 sigue abierta (diferencia Y). Lo que queda pendiente está marcado **Abierto** en esta sección y en la 1.6.

**Actualización 14/10/2026 (backend `main` `011d30b`, contrato 0.7):** el `500` de `POST /api/extracciones/` quedó resuelto (marcadores SQL `:1` → `%s`, PR #32 de José Luis) y el backend ya registra los errores en el log de Render. El frontend tiene CI en GitHub Actions (PR #34 del frontend). La rama del backend `fix/api-mensajes-seguridad-auditoria` (**PR #34 del backend, a `dev`, sin fusionar**) resuelve AC, AD, AF, la parte de código de AG y la clave secreta por defecto (punto 1.4.9). Lo que sigue abierto, con su responsable, está en la [sección 4](#4-lo-que-sigue-abierto-y-quién-lo-tiene).

~~**Estado en vivo (11/10/2026, backend en Render, `main` `e835f31`):** `GET /api/salud/` responde 200, pero `/api/conceptos/` y `/api/extracciones/ultima/` responden **403** y `/api/auth/csrf/` responde **404**. Sin esta sección, **ninguna pantalla del frontend puede funcionar con el backend real**: los permisos (`usuarios/permisos.py`) leen `request.user.rol`, y hoy ningún usuario tiene ese campo. Las pruebas del backend pasan porque usan un usuario simulado con `rol` (`tests/ayudas.py`).~~ **Resuelto el 13/10/2026:** sin sesión, `401`; con sesión, cada rol recibe lo suyo.

### 1.1 Antes de la primera migración — **resuelto (RF25)**

`AUTH_USER_MODEL = "usuarios.Usuario"`, con el correo como identificador y los campos de abajo. Lo que sigue queda como referencia.

El repositorio todavía no tiene migraciones. **El modelo de usuario propio debe definirse antes del primer `migrate`**, también en la base de Render; cambiarlo después es muy doloroso en Django.

- `AUTH_USER_MODEL = 'usuarios.Usuario'`, con el correo como identificador de login (`USERNAME_FIELD = 'email'`).
- Campos que el frontend consume: `nombre`, `email`, `rol` (código `'ANALISTA_CARTERA'` o `'ADMINISTRADOR'`; el frontend lo traduce al texto en `userMapper`), `is_active`, `last_login`, `must_change_password`.
- Con ese campo, `EsAdministrador` y `EsAnalistaOAdministrador` funcionan sin cambios. Además `ejecutada_por` del corte (diferencia Y) puede llenarse con `request.user`.
- ~~`rest_framework` y `usuarios` no están en `INSTALLED_APPS`.~~ Resuelto: ya están.

### 1.2 Sesión: cookie de Django + CSRF, mismo origen en Render — **resuelto (RF25, RF26)**

Los ajustes de abajo ya están en `config/settings.py` (la duración sale de `DJANGO_SESSION_MINUTES`, 10 por defecto). Se dejan como referencia.

El frontend usa la **cookie de sesión HttpOnly de Django** y el token CSRF. No guarda nada en `localStorage`.

**Cómo se conectan en Render.** El frontend está en `https://reporte-cens.onrender.com` y el backend en `https://reporte-cens-backend.onrender.com`. `onrender.com` está en la *Public Suffix List*, así que para el navegador son **sitios distintos**: no enviaría la cookie de sesión en llamadas directas. Por eso el sitio del frontend **reescribirá `/api/*` hacia el backend** (regla de Render; la configura Johan). Para el navegador todo queda en el mismo origen: **no hace falta CORS ni `django-cors-headers`**, y la cookie queda con `SameSite=Lax`. En desarrollo, el proxy de Vite hace lo mismo.

Ajustes en `settings.py`:

```python
SESSION_COOKIE_AGE = 10 * 60          # RF26: 10 minutos de inactividad (coincide con VITE_IDLE_MINUTES)
SESSION_SAVE_EVERY_REQUEST = True     # vencimiento DESLIZANTE: cada petición renueva la sesión
SESSION_COOKIE_HTTPONLY = True        # (es el valor por defecto)
SESSION_COOKIE_SAMESITE = 'Lax'       # mismo origen gracias a la reescritura: no hace falta 'None'
SESSION_COOKIE_SECURE = not DEBUG     # solo por HTTPS en producción (RNF-05)
CSRF_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_HTTPONLY = False          # el JS necesita leer csrftoken para enviarlo en X-CSRFToken

# Render termina el HTTPS antes de gunicorn: sin esto Django cree que la petición llegó por HTTP.
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# La petición llega con Origin del frontend y Host del backend: Django debe confiar en ese origen.
CSRF_TRUSTED_ORIGINS = os.getenv('DJANGO_CSRF_TRUSTED_ORIGINS', 'http://localhost:5173').split(',')
```

Variable en Render (servicio del backend): `DJANGO_CSRF_TRUSTED_ORIGINS=https://reporte-cens.onrender.com,http://localhost:5173`.

### 1.3 Endpoints — **implementados en el backend** (contrato 0.6)

Además de lo de la tabla: el login exige `X-CSRFToken` (`403` `csrf_failed` sin él), y responde `401` con `code: authentication_failed` y `429` con `code: throttled` (10 intentos por minuto por IP y otros 10 por correo). La recuperación admite 5 intentos por hora por IP.

| Método y ruta | Cuerpo | Respuesta esperada |
|---|---|---|
| `GET /api/auth/csrf/` | — | 204, y entrega la cookie `csrftoken` (decorador `ensure_csrf_cookie`) |
| `POST /api/auth/login/` | `{ "email", "password" }` | 200 `{ "user": {...} }` · 401 credenciales malas · 403 usuario desactivado |
| `POST /api/auth/logout/` | `{ "motivo"? }` (`manual` o `inactividad`, contrato 0.7) | 204 (invalida la sesión en el servidor). El motivo solo cambia el detalle de la auditoría |
| `GET /api/auth/me/` | — | 200 `{ "user": {...} }` · 401 sin sesión. **También sirve de "ping"**: el frontend lo llama cada ~5 min mientras el usuario trabaja para renovar la sesión |
| `POST /api/auth/change-password/` (RF29, José Luis) | `{ "current_password", "new_password" }` | 204 · 400 con error por campo |
| `POST /api/auth/password-reset/` (RF29, José Luis) | `{ "email" }` | **202 siempre igual**, exista o no el correo |
| `POST /api/auth/password-reset/confirm/` (RF29, José Luis) | `{ "token", "new_password" }` | 204 · 400 `{ "token": [...] }` si venció o ya se usó |

`user` = `{ "id", "nombre", "email", "rol", "is_active", "last_login", "must_change_password" }`.

### 1.4 Detalles que el frontend da por hechos

1. **Mensajes de error en español** (RF31). **Resuelto en `dev` (10/10/2026):** `LANGUAGE_CODE = 'es-co'` y `TIME_ZONE = 'America/Bogota'`. Los validadores de contraseña propios (punto 6) también deben responder en español. El frontend traduce solo cuatro mensajes por defecto de DRF; el resto debe venir ya en español.
2. **Formato de error de DRF:** `{ "detail": "..." }` o `{ "campo": ["mensaje"] }`. El frontend los convierte en errores por campo.
3. **Resuelto (RF25).** **Usuario desactivado:** `authenticate()` de Django devuelve `None` para un usuario inactivo, igual que con una clave mala. Para poder responder 403 *"Tu usuario está desactivado. Contacta al administrador."* hay que comprobar `is_active` aparte (sin revelar nada si la contraseña es incorrecta).
4. **Resuelto (RF25, `csrf_failed`).** **Un 403 por CSRF** debe distinguirse de un 403 por falta de permiso. Sugerencia: `CSRF_FAILURE_VIEW` que devuelva JSON `{ "detail": "No se pudo verificar la seguridad de la solicitud. Recarga la página e intenta de nuevo." }`.
5. **Resuelto (RF25: `PASSWORD_HASHERS` con Argon2 y `argon2-cffi==25.1.0` en `requirements.docker.txt`).** **Contraseñas con Argon2** (RNF-04): falta `PASSWORD_HASHERS = ['django.contrib.auth.hashers.Argon2PasswordHasher', ...]`. Además `argon2-cffi` **no llega a Render**: no está en `requirements.docker.txt` (el que usa el `Dockerfile`), y en `requirements.txt` aparece con rutas locales de conda (`@ file:///...`) que `pip` no puede instalar en otra máquina. Hay que agregarlo con versión fija a `requirements.docker.txt` y dejar `requirements.txt` sin rutas locales.
6. **Resuelto (RF25):** validadores propios de mayúscula y número, más los de Django (longitud, contraseña común y parecido al correo o al nombre). **Reglas de contraseña** que muestra la maqueta y valida el frontend: mínimo 8 caracteres, al menos una mayúscula y al menos un número. Hay que replicarlas en `AUTH_PASSWORD_VALIDATORS` con un validador propio (Django solo trae el de longitud), con errores en español en la clave `new_password`.
7. **Resuelto (RF25):** el middleware deja pasar `/api/auth/` y `/api/salud/` y responde `403` `password_change_required` en lo demás. **Usuario con contraseña temporal** (`must_change_password = true`): el backend debería rechazar (403) todo endpoint salvo `me`, `logout` y `change-password`. El frontend ya lo obliga a la pantalla de cambio, pero la regla real es del servidor.
8. **Resuelto (RF25, RF27; diferencia K).** **Roles (RF27):** un Analista que llama a un endpoint de administración recibe **403**. El frontend oculta esas pantallas, pero no es seguridad. **Sin sesión, en cambio, 401** (diferencia K): hoy DRF responde 403 porque `SessionAuthentication` no tiene `authenticate_header`. Con el 403 el frontend muestra "Acceso restringido" en vez de volver al login. Se arregla con una subclase de `SessionAuthentication` cuyo `authenticate_header` devuelva, por ejemplo, `'Session'`.
9. **En revisión (PR #34 del backend).** La rama `fix/api-mensajes-seguridad-auditoria` quita el valor por defecto: con `DJANGO_DEBUG=False` y sin `DJANGO_SECRET_KEY`, el servidor no arranca. **Antes de pasar `dev` a `main`, José Luis confirma que la variable existe en Render.** Texto original: **Seguridad menor:** `SECRET_KEY`, `DEBUG` y `ALLOWED_HOSTS` ya se leen del `.env` (`DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS`; `DEBUG` es falso por defecto). Queda una clave de ejemplo escrita en `settings.py` como valor por defecto: en producción conviene que falte y el servidor no arranque. Hay que confirmar que en Render está definida `DJANGO_SECRET_KEY`; si no, el backend desplegado firma las sesiones con la clave que está publicada en el repositorio.
10. **Resuelto:** el comando `seed_usuarios` crea el Administrador y el Analista desde variables `SEED_ADMIN_*` y `SEED_ANALISTA_*` al arrancar. Como la contraseña temporal y el enlace de recuperación llegan por correo real, para probar esos flujos hace falta un buzón real del probador (nunca del dominio de CENS). **Cuentas de prueba en la base de Render**, para verificar la integración: un Administrador y un Analista con datos **ficticios** (los mismos correos del README del frontend: `rmartinez@example.com` y `jperez@example.com`). Las contraseñas no van en el repositorio: se comparten por privado.

### 1.5 Recuperación de contraseña (RF29, José Luis) — **resuelto**

El backend envía los correos por Google Apps Script (`DJANGO_APPS_SCRIPT_URL`, 100 correos al día), con un enlace `{FRONTEND_URL}/restablecer?token=uidb64.token` de un solo uso que vence en 30 minutos. **Abierto:** verificar que `FRONTEND_URL` esté definida en Render con `https://reporte-cens.onrender.com`; si no, el enlace apunta a `http://localhost:5173`. Lo que sigue era la propuesta original.

Es una de las "decisiones por cerrar" de la asignación. Propuesta:
- En desarrollo, `EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'`: el correo se imprime en la consola del servidor.
- El enlace del correo tiene la forma `{FRONTEND_URL}/restablecer?token=XXXX` (esa pantalla ya existe en el frontend).
- Token de un solo uso y de vencimiento corto (por ejemplo, 30 minutos), con límite de intentos por correo/IP.

**Nota:** la pantalla "Restablecer contraseña" no está en la maqueta ni en la asignación; el frontend la agregó porque sin ella el enlace del correo no tiene a dónde llevar. Hay que confirmarla con Santiago.

### 1.6 Auditoría (RF30, RF31, Dilan) — **implementada en el backend** (`6f596bb`, contrato 0.6)

`GET /api/auditoria/`, solo Administrador, con los filtros y mensajes del contrato. Un middleware registra en `NV_BITACORA` cada acción que termina bien. La pantalla de Omar ya está en el frontend (filtros, paginación y acciones del "Sistema" sin rol). Quedan abiertos (detalle en [`contrato/README.md`](contrato/README.md#diferencias-con-lo-implementado-en-el-backend)):
- **AG (urgente, Dilan).** Confirmar que `config/sql/08_rf30_nv_bitacora.sql` se ejecutó en el Oracle que usa Render; sin él no se registra nada y `GET /auditoria/` falla. **La parte de código está resuelta en el PR #34 del backend:** crear o editar usuarios, eliminar un borrador y la actualización mensual ya no responden `500` si falla la bitácora; el fallo queda en el log.
- **AF. Resuelta en el PR #34 del backend (sin fusionar).** `POST /auth/logout/` acepta `{ "motivo": "inactividad" }` y registra "Cierre por inactividad". El frontend ya lo envía; hasta la fusión, `main` lo ignora y todo queda como "Cierre manual".
- **AE.** El detalle de usuario creado o editado lleva el correo del usuario. Aceptable porque el log solo lo ve el Administrador; confirmarlo con Santiago.
- Las acciones del sistema llegan con `usuario: "Sistema"` y `usuario_id` y `rol` en `null`. El contrato 0.6 ya lo admite.

---

## 2. Para José Luis — usuarios y parámetros (RF28, RF29, RF35)

### 2.1 Endpoints de usuarios (solo Administrador; un Analista recibe 403) — **implementados en el backend** (contrato 0.6)

Además de la tabla: `GET /api/users/{id}/` (el frontend no lo usa) y `502` en `POST /api/users/` si el correo no sale (la creación se revierte).

| Método y ruta | Cuerpo | Respuesta esperada |
|---|---|---|
| `GET /api/users/` | — | 200 `[user, ...]` |
| `POST /api/users/` | `{ "nombre", "email", "rol" }` | 201 `{ "user": {...}, "temporary_password": null }` (la contraseña se envía por correo) · 400 por campo (correo repetido, rol inválido) |
| `PATCH /api/users/:id/` | `{ "nombre"?, "email"?, "rol"?, "is_active"? }` | 200 `user` (se usa para editar **y** para activar/desactivar) |

Reglas que el servidor debe imponer (el frontend ya las aplica en pantalla, pero no son seguridad):
- Un administrador **no puede desactivarse a sí mismo** ni **cambiarse su propio rol** (400 con `{ "is_active": [...] }` o `{ "rol": [...] }`). Los mocks del frontend ya simulan estas dos reglas.
- El correo es único (400 con el error en la clave `email`).
- Un usuario recién creado queda con `must_change_password = true`.
- Todo cambio de usuarios debe quedar en el log de auditoría (RF30).

### 2.2 Contraseña temporal

**Resuelto: se envía por correo** y la API no la devuelve (`temporary_password` en `null` o ausente); el frontend muestra "La contraseña temporal se envió a su correo". El diálogo que la muestra una sola vez queda como respaldo: solo aparece si algún día la respuesta la trajera. En los mocks el correo se simula (consola del navegador, `[Correo simulado]`).

### 2.3 Parámetros de conceptos de energía (RF35) y grupos de conceptos (RF43) — para Angel

**Estado: ya implementado en el backend** (`reporte-cens-backend`, rama `dev`, revisado el 10/10/2026). Angel construye la pantalla sobre `features/parameters/parametersService.js`, que ya funciona contra los mocks.

| Método y ruta | Rol | Respuesta |
|---|---|---|
| `GET /api/conceptos/` (`?activo=true|false`) | Analista y Administrador | 200 `[{ codigo, descripcion, activo, observacion }]`, ordenado por código |
| `POST /api/conceptos/` | Administrador | 201 concepto · 400 por campo · 409 `El código de concepto ya existe.` |
| `PATCH /api/conceptos/{codigo}/` | Administrador | 200 concepto · 404 `Concepto no encontrado.` (no hay `DELETE` ni detalle) |
| `GET /api/grupos-conceptos/` y `GET /api/grupos-conceptos/{id}/` | Analista y Administrador | 200 `{ id, nombre, activo, conceptos: [{ codigo, descripcion }], creado }` |
| `POST /api/grupos-conceptos/` | Administrador | 201 grupo · 400 (concepto inexistente o inactivo) · 409 `El nombre de grupo ya existe.` |
| `PATCH /api/grupos-conceptos/{id}/` | Administrador | 200 grupo (`conceptos` reemplaza la lista) · 404 · 409 · 400 |
| `DELETE /api/grupos-conceptos/{id}/` | Administrador | 204 · 404 · 409 si un corte en BORRADOR usa el grupo |

Diferencias que afectan a estas rutas (detalle y propuesta en [`contrato/README.md`](contrato/README.md#diferencias-con-lo-implementado-en-el-backend)):
- **A. Resuelta en `fix/api-reglas` y fusionada en `main` (`e835f31`):** solo el Administrador escribe, como en el contrato y los mocks.
- **B.** El concepto no expone fecha de creación (RF35 la pide). La rama `feature/RF35-sql` de Angel agrega la columna `FECHA_CREACION`; falta que la API la devuelva.
- ~~**J.**~~ **Resuelta (RF25).** ~~Sin modelo de usuario con `rol`, el permiso `EsAnalistaOAdministrador` respondería 403 siempre; depende de Dilan. Confirmado en vivo en Render el 11/10/2026: los endpoints de negocio responden 403 y no existe `/api/auth/`.~~
- ~~**K.**~~ **Resuelta (RF25).** ~~Un anónimo recibe 403 en vez de 401 (el frontend cierra la sesión con 401). Confirmado en vivo en Render el 11/10/2026: `403` con `Las credenciales de autenticación no se proveyeron.`~~
- **AB.** Resuelta en `3610b63` (`main` `e835f31`): `creado` de los grupos vuelve a llegar como fecha (`AAAA-MM-DD`).

Ya resueltas en `dev`: L (validaciones en español), O (códigos repetidos: `400` con `No se permiten códigos repetidos.`) y P (código no numérico en la ruta: `404`).

### 2.4 Extracción de cartera y ciclo de corte (RF1–RF5, RF7, RF44) — para José Luis y Angel

**Estado: ya implementado en el backend** (`reporte-cens-backend`, revisado el 11/10/2026 en `main`, commit `e835f31`, que incluye `fix/api-reglas`). Angel construye la pantalla sobre `features/extraction/extractionService.js`, que ya funciona contra los mocks. Rutas (ambos roles): `GET/POST /api/extracciones/`, `GET /api/extracciones/ultima/` (204 sin cuerpo si no hay cortes), `GET`, `DELETE /api/extracciones/{id}/` (el `DELETE` solo para un BORRADOR), `GET /api/extracciones/{id}/obligaciones/` (`limite`, `desplazamiento`), `POST /api/extracciones/{id}/validar/` y `POST /api/extracciones/{id}/registrar-envio/`. Es síncrono (201 al generar, sin consulta de estado).

**Lo que los mocks hacen distinto del backend de hoy.** Siguen el manual de TransUnion (Sector Real v34, sector **Servicios**, decisión de Johan del 10/10/2026) y el contrato; el detalle de cada punto está en [`contrato/DISCREPANCIAS.md`](contrato/DISCREPANCIAS.md):
- **A2.** El corte incluye las obligaciones **saldadas** desde el corte anterior (`estado_tu` `02`, saldo, mora y cuotas en `0`, `edad_mora` `00`); el backend hoy las excluye. Pendiente de confirmar por Santiago (RF1 dice "solo vigentes").
- **A3.** Tipo de identificación con el código de la Tabla 2 (`01` cédula, `02` NIT...), no `"CC"`. La documentación del backend ya muestra `"01"`, pero el código no valida el valor. Los mocks de extracción no lo simulan porque `ObligacionCorte` no trae `tipo_id_tu`: aplica a los endpoints del historial, que aún no se simulan (el catálogo ya está en `catalogosTU.js`).
- **A4.** Estado de la obligación con la Tabla 4b de Servicios (`01` Vigente, `02` Saldada, `03` Dudoso recaudo...; no existen `05` ni `09`); el backend no declara la tabla ni valida los códigos. `edad_mora` sigue la Tabla 9 (`00` a `14`) y se calcula a partir de `dias_mora`.

**Ya resuelto en el backend (10/10/2026)**, con los mismos textos que el contrato y los mocks:
- **En `dev`:** mensajes propios del serializador (M1), rango y máximo de `limite` y `desplazamiento` (M2, M3, N, S), ids no numéricos (S), `validar` filtrado por corte (U), fechas normalizadas (V) y búsqueda de deudores paginada y ordenada (T, adoptada en el contrato 0.5).
- **Fusionado en `main` (`e835f31`):** fecha de corte posterior al último ENVIADO (A9), identificación enmascarada (Q), `DELETE /extracciones/{id}/` para un BORRADOR (W), `fecha_envio` no anterior a la `fecha_corte` y primero el `404` en `registrar-envio` (AA, en parte).
- **`409` de validar.** Con errores correctivos responde `{ detail, errores: [{ regla, mensaje }] }`; si el corte no está en BORRADOR, solo `{ detail }` (ambos validan contra `ErrorCorrectivo`).

**Siguen abiertas** (filas de [`contrato/README.md`](contrato/README.md#diferencias-con-lo-implementado-en-el-backend)):
- **R.** `edad_mora`, `tipo_id_tu` y `estado_tu` son textos sin validar; los mocks de extracción devuelven siempre códigos válidos de las tablas del manual (`edad_mora` coherente con `dias_mora`).
- **Y. Resuelta en el PR #34 del backend (sin fusionar).** `ejecutada_por` trae el nombre de quien generó el corte (fila 42). **Antes de desplegar, aplicar en Oracle `config/sql/09_fila42_nv_corte_usuario.sql`**, que quita la llave de `NV_CORTE` hacia la tabla anterior `NV_USUARIO`; sin él, generar un corte con sesión falla. Los mocks ya devuelven el nombre.
- **Z.** "Último estado" de un deudor: ya no cuenta los `ANULADO`, pero puede ser un `BORRADOR`. Es del historial, que aún no se simula.
- **AA (el resto).** Un corte `ANULADO` de la misma fecha bloquea la generación con `409` (los mocks hacen lo mismo que el backend) y `observacion` del reporte no se puede escribir.
- **AC. Resuelta en el PR #34 del backend (sin fusionar).** El `409` por un BORRADOR de otra fecha ya no muestra la ruta `DELETE /api/extracciones/{id}/`: dice `Ya existe un corte en BORRADOR con fecha AAAA-MM-DD. Elimínelo o complételo antes de generar otro.`, como el contrato y los mocks.
- **AD. Resuelta en el PR #34 del backend (sin fusionar).** Una ruta inexistente (por ejemplo, un id no numérico) responde `404` con `{ "detail": "Recurso no encontrado." }`, no con la página HTML de Django.

**Contrato pendiente para mostrar el detalle RF3–RF5/RF7 por obligación.** El contrato actual de
`GET /api/extracciones/{id}/obligaciones/` documenta `limite` y `desplazamiento`, con respuesta
`{ total, resultados }`; cada resultado incluye `numero_obligacion`, `valor_saldo`, `dias_mora` y
`edad_mora`. No define un estado individual de consolidación, el total facturado, el pago aplicado ni
abonos no aplicados/excedentes. Además, la consulta SQL de referencia RF3–RF5 indicada en el contexto
del backend aún no está integrada a este endpoint.

Hasta que José Luis confirme el contrato, la pantalla muestra únicamente esos campos documentados,
no calcula mora, no redistribuye pagos y no etiqueta un saldo como confirmado ni como inconsistente.
Quedan por acordar el endpoint (o la ampliación de este), sus filtros, los nombres y tipos exactos de
los campos por obligación, y la semántica para comunicar y presentar una consolidación inconsistente
sin usarla como saldo confirmado. Los detalles de facturación, pagos parciales y excedentes solo se
podrán mostrar si el backend los entrega explícitamente. No se implementan vistas de historial RF6/RF8
con el esquema PostgreSQL propuesto mientras no se confirmen sus endpoints y contrato.

---

## 3. Decisiones por cerrar (resumen para responder rápido)

| # | Pregunta | Suposición del frontend |
|---|---|---|
| 1 | ¿Front y back en el mismo dominio? | **Resuelto (11/10/2026):** mismo origen. En Render, el sitio del frontend reescribirá `/api/*` al backend; en desarrollo, el proxy de Vite. Sin CORS (sección 1.2) |
| 2 | ¿Vencimiento deslizante de 10 minutos (`SESSION_SAVE_EVERY_REQUEST`)? | **Resuelto:** sí (RF26) |
| 3 | ¿`GET /auth/me/` sirve de "ping" para renovar la sesión? | **Resuelto:** sí |
| 4 | Campo del login | **Resuelto:** `email` |
| 5 | Forma del usuario | **Resuelto:** `{ id, nombre, email, rol, is_active, last_login, must_change_password }` |
| 6 | Valores de `rol` | Códigos `"ANALISTA_CARTERA"` y `"ADMINISTRADOR"` (resuelto en el contrato 0.2) |
| 7 | Contraseña temporal | Resuelto: se envía por correo; `temporary_password` llega en `null` |
| 8 | Reglas de contraseña | **Resuelto:** 8 caracteres, mayúscula y número, más las de Django (común, parecida al correo o al nombre) |
| 9 | Pantalla "Restablecer" con `?token=` | Sí, hay que confirmarla con Santiago |
| 10 | ¿Quién hace el modelo de usuario propio? (`LANGUAGE_CODE` ya está en español) | **Resuelto:** Dilan (RF25) |

---

## 4. Lo que sigue abierto y quién lo tiene

Revisado el 14/10/2026 contra la asignación de la iteración 1 (backend `main` `011d30b`, frontend `main` `d1eaaef`).

| Punto | Qué falta | Responsable |
|---|---|---|
| PR #34 del backend | Revisar y fusionar `fix/api-mensajes-seguridad-auditoria` en `dev` y luego en `main`. Antes de pasar a `main`: confirmar `DJANGO_SECRET_KEY` en Render (punto 1.4.9) y aplicar en Oracle el script 09 (fila 42) | José Luis |
| `DJANGO_SECRET_KEY` y `FRONTEND_URL` en Render | Verificar que las dos variables existan en el servicio del backend (`FRONTEND_URL=https://reporte-cens.onrender.com`; sin ella, el enlace de recuperación apunta a `localhost`) | José Luis |
| SQL 08 en Oracle (AG) | Confirmar que `config/sql/08_rf30_nv_bitacora.sql` se ejecutó en el Oracle de Render | Dilan |
| Y: `ejecutada_por` (fila 42) | El código ya está en el PR #34. Falta aplicar `config/sql/09_fila42_nv_corte_usuario.sql` en el Oracle de Render **antes** de desplegar, y luego probar generar → ver → eliminar en Render | José Luis (aplicar el SQL) y Johan (probar) |
| SQL de saldo neto RF3-RF5 | El SQL de referencia está escrito sobre tablas de ejemplo; falta conectarlo a las vistas reales y al endpoint. Depende de las respuestas de CENS sobre abonos parciales, mora y conceptos | Clara |
| Informe de rendimiento (fila 51) | Medir tiempos con 1.000, 10.000 y 100.000 registros y guardar los planes de ejecución; no se inventan tiempos. La base Oracle del wallet **es de pruebas**: datos sensibles cambiados y solo los primeros 1.000 registros de cada tabla. Con ella se puede medir el caso de 1.000; para 10.000 y 100.000 hay que generar datos ficticios (o pedirle más volumen a CENS) y confirmar que la cuenta puede escribir y ver los planes (`V$SQL`, `V$SQL_PLAN`) | Clara y Dilan |
| Pruebas de aceptación HU-A | Faltan CA-A2, CA-A3 y CA-A5 (ya están CA-A1, CA-A4 y CA-A6) | Santiago |
| Z | "Último estado" de un deudor puede venir de un `BORRADOR`: decidir si solo cuenta lo `ENVIADO` | José Luis |
| AA (el resto) | Un corte `ANULADO` de la misma fecha bloquea la generación; `observacion` del reporte no se puede escribir | José Luis |
| AE | El detalle del log lleva el correo del usuario creado o editado. Aceptable porque solo lo ve el Administrador; falta confirmarlo | Dilan y Santiago |
