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

---

## 5. Iteración 2: endpoints del contrato 0.9 a 0.9.3 y su estado en el backend

El contrato 0.9 (`docs/contrato/openapi.yaml`) define la Iteración 2 como **propuesta**. Mientras el backend no publique estos endpoints, el frontend los usa con datos simulados (MSW), armados con los ejemplos del contrato. A medida que cada pantalla los usa, los marca como «propuesto (contrato 0.9)» en `src/lib/api/endpoints.js`. Cada PR de pantalla agrega aquí sus criterios de aceptación para el backend (los «Listo cuando» de la ficha).

La columna «En `dev`» es el cotejo del 10/11/2026 contra `dev` del backend (`d41aa13`; el anterior fue el 09/11 sobre `fa26721`): rutas de `config/api_urls.py`, vistas y serializers. Las diferencias con el contrato están en la sección 5.1. **Nada de esto está en `main` ni en Render** (allí `/api/obligaciones/` da 404). El contrato 0.9.3 está copiado en el backend (PR #55 del backend); la copia del **0.9.5** va en el PR #66 del backend.

| Módulo | Endpoints | RF | Backend | Rol (permiso) | En `dev` (09/11) |
|---|---|---|---|---|---|
| Obligaciones | `GET /obligaciones/`, `/obligaciones/resumen/`, `/obligaciones/{id}/`, `/obligaciones/{id}/linea-tiempo/` | RF10–RF19, RF45–RF50, RF52 | José Luis | Analista (`EsAnalista`, nuevo) | Sí, menos `linea-tiempo` y el filtro `abierta`. Detalle incompleto (5.1) |
| Ciclo mensual | `GET /matriz-estados/`, `GET` y `POST /ciclos/`, `GET /ciclos/{corte_id}/` | RF10–RF17, RF19, RF45–RF49 | José Luis | Analista | Sí, igual al contrato |
| Refinanciaciones | `GET` y `POST /refinanciaciones/` | RF18 | Santiago | Analista | No |
| Catálogos | `GET /catalogos/{nombre}/` | RF18, RF23, RF24, RF47, RF50 | José Luis (tablas de Clara) | Analista y Administrador | No |
| Estados y homologación | `GET /estados/`, `GET /homologacion-estados/`, `PUT /homologacion-estados/{estado_sac}/` | RF48 | Santiago | Administrador | Sí, igual al contrato (PR #57 del backend) |
| Reporte a TransUnion | `GET /extracciones/{id}/validaciones/`, `POST /extracciones/{id}/archivo/`, `GET /archivos/`, `GET /archivos/{id}/descarga/`, y los ajustes a `validar` y `registrar-envio` | RF20–RF22, RF51, RF53, RF57 | Dilan y José Luis | Analista y Administrador (como `validar`) | No. `validar` y `registrar-envio` siguen como en la 0.8 (5.1) |
| Resultados del cargue | `GET` y `POST /archivos/{id}/resultados/`, con el estado nuevo `ENVIADO_CON_INCONSISTENCIAS` | RF54 | José Luis | Analista | Sí, igual al contrato |
| Reclamos | `GET` y `POST /reclamos/`, `POST /reclamos/{id}/cerrar/`, `GET /reclamos/insumo/` | RF23 | Clara | Analista | Sí (PR #60 del backend), con las diferencias del contrato 0.9.4 (5.1) |
| Novedades | `/novedades/`, `/eliminaciones/`, `/rectificaciones/` y sus acciones | RF24, RF50, RF55 | José Luis y Clara | Analista | Sí; rectificaciones igual al contrato 0.9.5 (PR #62 del backend) |
| Entidad | `GET /entidad/` (ambos roles) y `PUT /entidad/` | RF57 | Santiago | Administrador para escribir | Sí, igual al contrato |
| Panel | `GET /panel/resumen/` | RF6, RF19, RF23, RF24, RF57 | José Luis | Analista | No |

### 5.1 Diferencias del backend `dev` con el contrato (cotejo del 09/11/2026 sobre `fa26721`, actualizado el 10/11/2026 sobre `d41aa13` y el contrato 0.9.5)

Del 09/11 al 10/11 el backend no tocó ciclo, obligaciones ni cartera: los puntos 1 a 5 siguen abiertos.

Lo que hay que corregir en el backend o, si se decide otra cosa, primero en el contrato:

1. **Detalle de una obligación (`GET /obligaciones/{id}/`, `ciclo/servicios.py`).**
   - `concepto` llega `None` siempre, y `fecha_ingreso` y `valor_inicial` pueden llegar nulos. El contrato los pide obligatorios y no nulos. El frontend los tolera desde el PR #58 y muestra «—», pero la pantalla 9 necesita el concepto (RF52).
   - `en_reclamo` llega `False` siempre, también en la lista. Debe salir de los reclamos abiertos (RF23).
   - `posibles_transiciones` y `advertencias` llegan vacíos: la pantalla 9 no muestra «Qué puede pasar con esta obligación».
   - `reestructuracion` y `refinanciada_en` llegan `None` siempre: no se ven las refinanciaciones (RF18).
   - `valor_cuota_antes_cierre` llega `None` siempre: en las cerradas no sale «Antes $X: al cerrar se reporta en $0» (RF52).
   - `pago_mora.tipo_pago` puede llegar `None`; el contrato lo pide no nulo (`CodigoDescripcion`).
2. **`GET /obligaciones/?abierta=true` (0.9.3).** El backend ignora `abierta` y devuelve también las cerradas y las eliminadas. El formulario de refinanciación las mostraría en la lista de originales.
3. **`POST /extracciones/{id}/validar/` (0.9.3).** No exige la actualización mensual: falta la correctiva `ACTUALIZACION_MENSUAL` en `errores` (409).
4. **`POST /extracciones/{id}/registrar-envio/` (0.9).** No responde 409 `sin_archivo` ni `archivo_no_apto`. Hoy se puede registrar el envío de un corte sin archivo o con un archivo no apto.
5. **`GET /eliminaciones/`.** `motivo` puede llegar `None`; el contrato lo pide no nulo (`ItemCatalogo`).
6. **Rutas que faltan** (dan 404): `/obligaciones/{id}/linea-tiempo/`, `/refinanciaciones/`, `/catalogos/{nombre}/`, `/extracciones/{id}/validaciones/`, `/extracciones/{id}/archivo/`, `GET /archivos/`, `/archivos/{id}/descarga/` y `/panel/resumen/`. Desde el 10/11 ya existen `/estados/`, `/homologacion-estados/`, `/reclamos/` y `/rectificaciones/`.
7. **Reclamos (contrato 0.9.4, Manual p. 57; decisión 28 del README del contrato).**
   - `Reclamo` sale con `radicado_en_tu` (que en el backend es la columna `MARCACION_GENERADA`) y sin `desmarcacion_generada`. El contrato pide `marcacion_generada` y `desmarcacion_generada`: generar el insumo no es estar radicado.
   - `cartera/servicios.py` reconoce archivos `radicacion_*` y `cierre_reclamo_*` como resultados del corte. Son respuestas del Reclamos Batch, no del reporte mensual; y esos nombres no salen del Manual.
   - `POST /reclamos/{id}/cerrar/` rechaza `observacion_cierre` porque `NV_RECLAMO` no tiene esa columna. La ficha del RF23 la pide: hay que agregar la columna.
   - `nombre_titular` y `fecha_limite_respuesta` pueden llegar `null`; el contrato los pide no nulos.
   - El `409` del reclamo repetido dice «La obligación ya tiene un reclamo abierto.» sin el número; el contrato lo incluye («La obligación 2260-5543 ya tiene…»).
   - Una obligación inexistente responde `400` en `obligacion_id` («La obligación no existe.»). El contrato lo admite (400 por campo) y el mock ya responde igual.

Lo que sí coincide campo por campo con el contrato (serializers y vistas): ciclos y matriz, lista y resumen de obligaciones, entidad (con los permisos por método), resultados del cargue (409, 422 y el campo multipart `archivos`), novedades y eliminaciones, estados y homologación (las reglas del `PUT` las valida el servicio con `400` por campo) y rectificaciones (incluido el `insumo` del 0.9.5).

**Por definir con el backend:**

- **Rechazos del ciclo (713 y 881).** Hoy se resuelven así: se corrige el dato en el SAC, se regenera la extracción y se repite el ciclo. Falta definir la exclusión de una obligación con justificación (RF10, flujo alterno); no tiene endpoint en la 0.9.
- **`ENVIADO_CON_INCONSISTENCIAS` cuenta como enviado.** Vale para el historial de reportes, para la regla A9 y para saber cuál es el último corte enviado.
- **Errores de paginación de `/obligaciones/` y `/eliminaciones/` (resuelto en el contrato 0.9.3).** Responden `{ detail }`, igual que la paginación que ya tiene el backend en extracción: «Los parámetros limite y desplazamiento deben ser enteros.» o «El límite debe ser mayor que 0 y el desplazamiento no puede ser negativo.». Los filtros siguen por campo (`ErrorCampos`).
- **Plazo de los reclamos.** Son 15 días hábiles, sin contar fines de semana ni festivos de Colombia. La regla exacta de conteo está por confirmar con jurídica.

**Criterios de aceptación para el backend** (los «Listo cuando» de las fichas; el frontend los prueba contra los mocks salvo donde se indica):

- **Entidad (RF57, `PUT /entidad/`).** El Administrador guarda `001` / `123` / `A1B2C3`: responde 200 con `con_marcador: false` y `prefijo_archivo: SSR001123`, y los archivos nuevos salen aptos. Con `12` en el tipo de entidad responde 400 `{ tipo_entidad: [...] }` (3 dígitos o `XXX`). El Analista recibe 403. Los tres marcadores (`XXX`, `XXX`, `XXXXXX`) son válidos: así se «vuelve al relleno». Devuelve quién y cuándo (`actualizado_por`, `fecha_actualizacion`). Además cada cambio debe quedar en la bitácora de auditoría: eso **no** lo simula el mock ni lo prueba el frontend.
- **Panel (`GET /panel/resumen/`).** Solo el Analista (el Administrador recibe 403). `distribucion` cuenta las obligaciones no eliminadas por estado, en el orden 01, 03, 06, 02, 07 y luego los demás; `con_dos_o_mas_cuotas` cuenta solo las abiertas; `ultimo_archivo` es el más reciente por `fecha_generacion` (o `null`); `entidad_con_marcador` sigue a `GET /entidad/`. `novedades_pendientes` cuenta las novedades en `PENDIENTE` de `GET /novedades/`.
- **Obligaciones (pantalla 9, `GET /obligaciones/…`).** Solo el Analista. `GET /obligaciones/` ordena por número y filtra por `estado_tu`, `eliminada`, `cuotas_mora_min` (cuenta solo las abiertas: las cerradas tienen 0) y `q` (número o nombre, sin mayúsculas). Sin `eliminada=true` no trae las eliminadas. Los días, la edad, el valor en mora, las cuotas en mora y la fecha de exigibilidad se calculan **al corte del último ciclo**. El detalle trae `posibles_transiciones` como texto sin HTML (`ReglaAplicada`) y `por_confirmar` donde depende de CENS o TransUnion; `numero_identificacion` llega enmascarado. Con las 12 obligaciones de ejemplo al 30/09/2026: 2250-0987 está en 03 con 156 días, edad 05 y 6 cuotas; `cuotas_mora_min=2` devuelve 5.
- **Ciclo mensual (pantalla 10, `POST /ciclos/`).** Solo el Analista. Es síncrono y trabaja sobre el corte en `BORRADOR` de `fecha_corte`; sin él responde 409 `«Primero genera la extracción de ese corte.»`. Responde 400 por campo si la fecha falta, no es el último día del mes (el mensaje sugiere el correcto) o no es posterior al último corte **enviado**. Volver a ejecutarlo sobre el mismo `BORRADOR` reemplaza el resultado, no lo duplica, y el historial (`GET /ciclos/`) queda del más reciente al más antiguo. Un cambio que la matriz no permite (713) o que no se acepta en primer reporte (881) conserva el estado anterior, va en `rechazos` y cuenta en `rechazados`. `requiere_revision` marca el salto de más de un tramo de edad, la baja de edad sin abono (RF11) y el caducado o castigo sin mora (RF14, RF45). Las reglas que dependen de CENS (imputación de pagos C-29, caducado → 03 C-53, RF46) llegan con `por_confirmar: true`. Después del ciclo, `GET /obligaciones/` y `GET /obligaciones/resumen/` muestran el corte nuevo (`fecha_ultimo_ciclo`) y las financiaciones que entraron dejan de salir en `financiaciones_nuevas`. Con los datos de ejemplo, el ciclo del 31/10/2026 da 3 en primer reporte, 3 cambios de estado, 1 cierre, 0 rechazados, 7 obligaciones con pagos y 1 normalizada (RF46). En el mock este resultado es una **foto** calculada con el mockup; el backend lo calcula de verdad.
- **Matriz (`GET /matriz-estados/`).** Solo el Analista. Las 400 combinaciones de la Tabla de Cambios de Estado 2 (Manual, p. 40), leídas de la base. Se comparan con `docs/iteracion2/MATRIZ_ESTADOS_SERVICIOS.md`: 02 y 07 no tienen salidas; 03 con mora → 07 sin mora sí.
- **Refinanciaciones (pantalla 11, `POST /refinanciaciones/`).** Solo el Analista. Cierra la original con modo de extinción `16` y tipo de pago `02`: en `02` si estaba en `01` u `08`, en `07` si estaba en `03` o `06` (por confirmar con TransUnion, P-TU-06). Valida el cambio con la matriz: si no se permite (por ejemplo desde `04`) responde 409 `transicion_no_permitida`; si ya está cerrada o eliminada, 409 `obligacion_cerrada` u `obligacion_eliminada`. Crea la nueva con número propio (RF5), en `01`, primer reporte, reestructurada con `numero_reestructuraciones` = el de la original + 1 y `obligacion_anterior`, y deja `refinanciada_en` en la original. 400 por campo con los mensajes del ejemplo del contrato (cuotas de 1 a 120, naturaleza del catálogo, fecha obligatoria y no futura). `GET /refinanciaciones/` lista de la más reciente a la más antigua. **Pendiente de diseño:** el formulario elige la original en una lista de hasta 100 obligaciones (`GET /obligaciones/?limite=100`); con la cartera real hará falta buscarla por número o titular.
- **Refinanciaciones: más reglas del mock.** La fecha no puede ser anterior al ingreso de la obligación ni a un corte ya enviado (400 en `fecha`), y la nueva obligación conserva la identificación del titular. **Contrato 0.9.3:** `GET /obligaciones/?abierta=true` deja solo las abiertas (estado distinto de 02 y 07 **y** no eliminadas, como `abiertas` en el resumen); el formulario lo pide para no gastar la página de 100 en cerradas. `abierta` inválido responde 400 por campo.
- **Reporte a TransUnion (pantalla 12, parte 1).** `GET /extracciones/{id}/validaciones/` es de los dos roles y no cambia el corte. Cada ítem trae su `nivel` y, si falla en obligaciones concretas, la lista con `obligacion_id`, `numero_obligacion`, `campo` y `mensaje`. `puede_generar` es `false` con alguna correctiva o si el corte no está `VALIDADO`. Reglas que el mock ya aplica:
  - correctivas: actualización mensual sin ejecutar, rechazos 713 u 881 del ciclo, número de obligación inválido, cierre incompleto (RF22: fecha de pago, modo, tipo, y saldo, mora y cuota en 0) y campos obligatorios;
  - advertencias: valores fuera de $10.000 a $99 millones, entidad con marcador y mora de 540 días o más (Ley 2157, por confirmar);
  - informativas: miles de pesos (por confirmar) y saldo mayor que el valor inicial;
  - la omisión frente al último corte (RF21) solo se cuenta en el mock; el backend debe bloquearla.

  `POST /extracciones/{id}/validar/` aplica las mismas correctivas y las devuelve con la obligación. En el mock eso solo pasa en cortes con actualización mensual, para no cambiar el flujo de la Iteración 1; el backend real debe exigir siempre el ciclo (contrato 0.9.3: sin actualización mensual, `409` con `{ regla: ACTUALIZACION_MENSUAL, mensaje: 'Falta ejecutar la actualización mensual de este corte.' }` en `errores`; no es un 409 aparte). `POST /extracciones/{id}/archivo/` exige `VALIDADO` (409) y, si un campo no cabe (por ejemplo, un nombre de más de 60 caracteres), responde 409 con `errores` y no genera nada. Con los datos de ejemplo, el corte del 30/09/2026 da 11 registros 2, 13 en total y 1 excluida. El nombre es `SSR` + tipo + código + fecha, y con marcador sale `apto_envio: false`. `GET /archivos/{id}/descarga/` devuelve `text/plain` en Windows-1252 con `Content-Disposition: attachment; filename="….txt"`, CRLF, registro 1 de 29 caracteres, registro 2 de la longitud del parámetro y registro 9 de 33. En el mock el registro 2 es ilustrativo (solo los primeros campos).

- **Reporte a TransUnion (pantalla 12, parte 2, RF54).** `POST /extracciones/{id}/registrar-envio/` sigue la 0.9 sin excepciones: 409 `sin_archivo` si el corte no tiene archivo y 409 `archivo_no_apto` si el último no es apto; al enviar, ese archivo queda con `enviado: true` y su `fecha_envio`. `GET` y `POST /archivos/{id}/resultados/` son solo del Analista. El `POST` es multipart (`archivos`), exige que el archivo ya se haya enviado (409) y responde 422 sin guardar nada si un archivo es de otro corte (`archivo_de_otro_corte`) o no tiene la estructura esperada (`estructura_invalida`). Lo que el mock da por hecho:
  - los archivos se reconocen por el nombre del Manual (p. 43): `Esta_Inco_CSR_…`, `est.…`, `Detalle_Inco_CSR_…_Correctivas|Alertas|Especiales_…`, `953_Detalle_Inco_CSR_…` y `norep.…`; la fecha del nombre debe ser la del corte. No se comprueban el tipo y el código de entidad del nombre ni el CODIGOPRODUCTO;
  - en el detalle de inconsistencias (pp. 52-53) el mock busca el registro tipo 2 después de los 6 campos de identificación y lee hasta 5 grupos de código, descripción y tipo; el número de obligación sale de las posiciones 89 a 108 del registro tipo 2 (Tabla 2, p. 46). La tabla del Manual salta el campo 7, así que el total de campos está **por confirmar con TransUnion**; el tipo sale del archivo (Correctivas → CORRECTIVA; Alertas, Especiales y 953 → INFORMATIVA);
  - en los nombres, la p. 43 escribe `CSR`, pero en la Tabla 22 (p. 75) `CSR` es cartera préstamos y `SSR` cartera servicios: el mock acepta las dos (**por confirmar**);
  - en el norep (pp. 53-54) el número de obligación es el tercer campo; cada uno se reporta con código `R`;
  - la estructura de los estadísticos no está en el Manual: el mock solo cuenta sus filas (**por confirmar**);
  - `recibidos` son los registros 2 del archivo, `cargados` los que no tienen correctivas, y `con_inconsistencias` y `no_reportadas` cuentan obligaciones;
  - el corte pasa a `ENVIADO_CON_INCONSISTENCIAS` si hay correctivas y a `ENVIADO` si no; volver a cargar reemplaza los resultados del archivo. Los archivos de radicación y cierre de reclamos (RF23) son de la pantalla 13.
- **Archivo plano (RF20, Manual pp. 44-52).** El mock arma el registro tipo 2 con las posiciones de la Tabla 2: número de obligación en 89-108 (a la derecha), sucursal en 109-114, calidad P, estado, edad y años de mora, fecha de corte, exigibilidad, fecha de pago, modo de extinción y tipo de pago del cierre, cuotas en mora, y valor inicial, mora, saldo y cuota en miles con 12 dígitos; lo demás va en espacios. El backend debe llenar además los campos que el mock no guarda, empezando por el tipo y el número de identificación (obligatorios). Los campos de la Tabla 2 suman 929 caracteres y el Manual declara 930 (**por confirmar**).

- **Homologación de estados (pantalla 16, RF48, contrato 0.9.1).** `GET /estados/`, `GET /homologacion-estados/` y `PUT /homologacion-estados/{estado_sac}/` son solo del Administrador (el Analista recibe 403). Lo que el frontend espera y lo que hay que resolver en la base (`01_nexovolt_bd.sql`):
  - **F se guarda como `ESTADO_TU '02'` y la tabla no tiene columna de acción** (`NV_HOMOLOGA_ESTADO`, carga 3.5). El contrato la expone como `accion: CIERRE` con `estado_tu: null`: al cerrar, el estado sale de `NV_ESTADO_TU.CIERRE_AL_PAGAR` según el estado anterior (01 → 02; 03 y 06 → 07; RF12, RF15). Hace falta una columna `ACCION` (`ESTADO`/`CIERRE`) o una regla equivalente;
  - `PUT` responde **400 si `accion: ESTADO` apunta a 02 o 07** («Saldada (02) y Castigada recuperada (07) se asignan con «Cierre», según el estado anterior.»), si el estado no se usa en CENS (04 y 08) y si `CIERRE` trae estado;
  - **`NV_ESTADO_TU` no tiene columna `USADO`**, aunque el contrato dice que `usado` sale de ahí: hace falta agregarla (01, 02, 03, 06, 07, 10, 11 y 12 se usan; 04 y 08 no, según la ficha RF48);
  - `prioridad` sale de `NV_HOMOLOGA_ESTADO.PRIORIDAD` (A 1, C 2, D 3, B 4, F 5) y no se cambia por la API; `descripcion`, de `DESCRIPCION_SAC`;
  - el nombre del estado 12 en la Tabla 4b es «Ley 1564 de 2012 Insolvencia PNNC» (Manual, p. 64), como ya lo tiene la base.- **Novedades, eliminaciones y rectificaciones (pantalla 14, RF24, RF50, RF55, contrato 0.9.2).** Solo el Analista. `GET /novedades/` es un arreglo plano, el más reciente primero, con filtros `estado` y `tipo` (400 por campo si no son válidos). `POST /novedades/` exige `motivo_eliminacion` (Tabla 28) en una eliminación. `POST /novedades/{id}/gestionar/` exige `numero_transaccion_tu` y `fecha_gestion` (la pantalla manda la fecha del día, como el mockup v3), responde 409 si la novedad no está pendiente y, si es una eliminación, crea la eliminación bloqueada (RF50) sin repetirla si la obligación ya estaba eliminada. `GET /eliminaciones/` pagina `{ total, resultados }` y la pantalla pide `limite=100`. `POST /eliminaciones/{id}/reactivar/` exige `numero_activacion_tu` y `fecha_activacion`, y responde 409 si ya se reactivó. Una corrección son dos registros: la pantalla crea la novedad `CORRECCION` y luego `POST /rectificaciones/` con su `novedad_id` (**0.9.2**; 400 en `novedad_id` si no existe); «Rectifica el corte…» sale de `GET /rectificaciones/`. La pantalla busca el `obligacion_id` de la rectificación con `GET /obligaciones/?q=` y exige coincidencia exacta del número. `valor_anterior` lo pone el backend desde el corte afectado (en el mock queda `null`).
