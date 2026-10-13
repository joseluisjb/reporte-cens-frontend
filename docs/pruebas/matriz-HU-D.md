# Matriz de casos de prueba — HU-D (seguridad, usuarios y auditoría)

**Iteración 1 · NexoVolt · Responsable: Santiago (Líder de QA, ficha 5.7) · Ejecuta: Santiago y Omar (fila 48)**

> **Validación independiente.** Omar programó parte de HU-D (formularios de RF28, RF29, RF30 y RF31),
> así que en la fila 48 **Santiago lidera la validación y Omar ejecuta**, según la ficha 5.5.

Cada caso sale de un criterio de aceptación del documento *Asignación de RF, Iteración 1* (sección 2) y
cubre los RF que ese criterio nombra. Los datos son **ficticios**: ningún dato de CENS aparece aquí.

La matriz de HU-A vive en el repositorio del backend: `docs/pruebas/matriz-HU-A.md`.

## Cómo leer la matriz

| Columna | Qué significa |
|---|---|
| **ID** | `CP-D-nn`. Se cita igual en la evidencia, en los defectos, en el acta y en el FP-15 |
| **Tipo** | Positivo (camino feliz), Negativo (flujo alterno del RF) o Frontera (valor límite) |
| **Dónde** | `UI` = frontend · `API` = backend |
| **Estado** | `Listo` se puede ejecutar hoy · `Bloqueado` falta algo, con la causa escrita |

## Criterios de aceptación de HU-D (textuales del documento)

| # | Criterio | RF | Casos |
|---|---|---|---|
| CA-D1 | El acceso requiere usuario y contraseña válidos, con cierre de sesión manual y automático por inactividad | RF25, RF26 | CP-D-01 a CP-D-10 |
| CA-D2 | Los permisos se restringen según el rol (Analista de Cartera / Administrador) | RF27 | CP-D-11 a CP-D-14 |
| CA-D3 | El Administrador crea, edita y desactiva usuarios con contraseña temporal de primer ingreso, y cualquier usuario puede recuperar su contraseña de forma segura | RF28, RF29 | CP-D-15 a CP-D-25 |
| CA-D4 | Toda acción sobre la cartera queda registrada en un log de auditoría consultable | RF30 | CP-D-26 a CP-D-28 |
| CA-D5 | Los formularios validan campos obligatorios antes de ejecutarse | RF31 | CP-D-29 a CP-D-32 |

## Datos ficticios de referencia

Todas las cuentas son inventadas y viven en los mocks (`src/mocks/db.js`). El dominio `example.com` es
reservado para ejemplos, nunca un dominio real de CENS.

| Correo | Contraseña | Para qué |
|---|---|---|
| `rmartinez@example.com` | `Admin12345` | Administrador |
| `jperez@example.com` | `Analista123` | Analista de Cartera |
| `mgomez@example.com` | `Temporal123` | Primer ingreso: debe cambiar la contraseña |
| `avargas@example.com` | `Cartera123` | Usuario desactivado |
| `ldiaz@example.com` | se crea en la prueba | Usuario nuevo creado por el Administrador |
| Enlace de recuperación | `/restablecer?token=token-de-prueba` | Restablecer contraseña |

**Cómo se prueba el correo sin enviar correos reales** (decisión pendiente de RF29): en el frontend el
envío es simulado y la contraseña temporal aparece en la consola del navegador como `[Correo simulado]`.
Cuando exista el backend, la prueba usa el backend de correo en memoria de Django y lee el buzón de
pruebas: **en ningún caso sale un correo a una dirección real**.

---

## CA-D1 · Acceso y cierre de sesión (RF25, RF26)

| ID | Tipo | RF | Dónde | Precondición | Pasos | Resultado esperado | Estado |
|---|---|---|---|---|---|---|---|
| CP-D-01 | Positivo | RF25 | UI | Sin sesión activa | Entrar con `rmartinez@example.com` / `Admin12345` | Accede al sistema; el menú muestra las opciones del Administrador | Listo |
| CP-D-02 | Positivo | RF25 | UI | Sin sesión activa | Entrar con `jperez@example.com` / `Analista123` | Accede al sistema; el menú muestra solo las opciones del Analista | Listo |
| CP-D-03 | Negativo | RF25 | UI | Sin sesión activa | Entrar con `rmartinez@example.com` y una contraseña incorrecta | Rechaza el acceso con un mensaje que **no revela** cuál de los dos datos falla | Listo |
| CP-D-04 | Negativo | RF25 | UI | Sin sesión activa | Entrar con un correo que no existe | Mismo mensaje genérico que CP-D-03: no se filtra si la cuenta existe | Listo |
| CP-D-05 | Negativo | RF25, RF28 | UI | El usuario `avargas@example.com` está desactivado | Entrar con `avargas@example.com` / `Cartera123` | Rechaza el inicio de sesión y explica que la cuenta está desactivada | Listo |
| CP-D-06 | Negativo | RF25, RF31 | UI | Sin sesión activa | Pulsar Iniciar sesión con los campos vacíos, y luego con un correo sin `@` | Valida antes de enviar y dice en español qué falta o qué está mal | Listo |
| CP-D-07 | Positivo | RF26 | UI | Sesión activa | Menú de perfil, Cerrar sesión | La sesión se cierra y se muestra el aviso de cierre correcto | Listo |
| CP-D-08 | Positivo | RF26 | UI | Sesión activa con inactividad configurada corta | No tocar nada hasta que falte un minuto | Aparece el aviso previo preguntando si el usuario sigue ahí | Listo |
| CP-D-09 | Positivo | RF26 | UI | La situación de CP-D-08 | Dejar que el tiempo se agote | La sesión se cierra sola y la pantalla de inicio explica por qué | Listo |
| CP-D-10 | Frontera | RF26 | UI | Sesión activa cerca de agotarse | Interactuar con la pantalla justo antes de que venza | El temporizador se reinicia y la sesión **no** se cierra | Listo |

## CA-D2 · Roles y permisos (RF27)

| ID | Tipo | RF | Dónde | Precondición | Pasos | Resultado esperado | Estado |
|---|---|---|---|---|---|---|---|
| CP-D-11 | Positivo | RF27 | UI | Sesión de Administrador | Revisar el menú lateral | Se ven las opciones de administración, marcadas como ADMIN | Listo |
| CP-D-12 | Negativo | RF27 | UI | Sesión de Analista de Cartera | Revisar el menú lateral | **No** aparecen las opciones de administración | Listo |
| CP-D-13 | Negativo | RF27 | UI | Sesión de Analista de Cartera | Escribir a mano la dirección de la pantalla de Usuarios | Muestra *Acceso restringido*: no basta con conocer la URL | Listo |
| CP-D-14 | Negativo | RF27 | API | Sesión de Analista de Cartera | Llamar a un endpoint de administración | `403`. Se ejecuta contra el backend de `dev`, que ya trae sesión y roles | Listo |

## CA-D3 · Gestión de usuarios y recuperación de contraseña (RF28, RF29)

| ID | Tipo | RF | Dónde | Precondición | Pasos | Resultado esperado | Estado |
|---|---|---|---|---|---|---|---|
| CP-D-15 | Positivo | RF28 | UI | Sesión de Administrador | Crear a `Laura Díaz`, `ldiaz@example.com`, rol Analista de Cartera | Se crea, se genera contraseña temporal y se avisa que se envió al correo | Listo |
| CP-D-16 | Positivo | RF28 | UI | El usuario creado en CP-D-15 | Entrar con esa cuenta y su contraseña temporal | Obliga a cambiar la contraseña antes de cualquier otra cosa | Listo |
| CP-D-17 | Negativo | RF28 | UI | Sesión con contraseña temporal sin cambiar | Escribir a mano la dirección de otra pantalla | No deja salir del cambio de contraseña, ni escribiendo la dirección | Listo |
| CP-D-18 | Positivo | RF28 | UI | La situación de CP-D-16 | Cambiar a una contraseña que cumple la política | Entra al sistema con la contraseña nueva | Listo |
| CP-D-19 | Negativo | RF28, RF29 | UI | La situación de CP-D-16 | Intentar una contraseña que no cumple la política mínima | La rechaza y muestra cuáles requisitos faltan, en español | Listo |
| CP-D-20 | Negativo | RF28 | UI | La situación de CP-D-16 | Escribir la confirmación distinta de la contraseña nueva | La rechaza indicando que no coinciden | Listo |
| CP-D-21 | Positivo | RF28 | UI | Sesión de Administrador | Editar el nombre de un usuario existente | El cambio queda guardado y visible en la lista | Listo |
| CP-D-22 | Positivo | RF28 | UI | Sesión de Administrador | Desactivar un usuario y confirmar; luego intentar entrar con esa cuenta | Se desactiva con confirmación previa y la cuenta ya no puede iniciar sesión | Listo |
| CP-D-23 | Negativo | RF28 | UI | Sesión de Administrador | Intentar desactivarse a sí mismo y cambiarse su propio rol | El sistema lo impide en ambos casos | Listo |
| CP-D-24 | Negativo | RF28, RF31 | UI | Sesión de Administrador | Crear un usuario con un correo que ya existe | Lo rechaza con un mensaje claro en español | Listo |
| CP-D-25 | Positivo | RF29 | UI | Sin sesión activa | Pedir recuperación con un correo que existe y con uno que no | **La respuesta es idéntica en los dos casos**: no revela si la cuenta existe | Listo |
| CP-D-26 | Positivo | RF29 | UI | Enlace de recuperación válido | Abrir `/restablecer?token=token-de-prueba` y definir una contraseña válida | Permite definir la contraseña nueva y entrar con ella | Listo |
| CP-D-27 | Negativo | RF29 | UI | Enlace vencido o ya usado | Abrir el enlace | Explica que no sirve y ofrece pedir uno nuevo. El enlace es **de un solo uso** | Listo |

## CA-D4 · Log de auditoría (RF30)

> **Criterio bloqueado del lado del backend.** No existe el endpoint de auditoría: el contrato lo marca
> como *Propuesta*. Hay un módulo `config/bitacora.py`, pero no una API consultable. Sin él, el criterio
> *"toda acción sobre la cartera queda registrada en un log consultable"* no se puede dar por cumplido
> aunque la pantalla exista.

| ID | Tipo | RF | Dónde | Precondición | Pasos | Resultado esperado | Estado |
|---|---|---|---|---|---|---|---|
| CP-D-28 | Positivo | RF30 | UI | Sesión de Administrador | Abrir el Log de Auditoría y filtrar por fecha, usuario y tipo de acción | La tabla muestra fecha y hora, usuario, rol, acción, módulo y detalle, y los filtros funcionan | Listo |
| CP-D-29 | Negativo | RF30, RF27 | UI | Sesión de Analista de Cartera | Intentar abrir el Log de Auditoría | Acceso restringido: la auditoría es solo del Administrador | Listo |
| CP-D-30 | Positivo | RF30 | API | Un usuario genera un corte, lo consulta y lo envía | Consultar el log de auditoría | Queda registrado quién, cuándo y qué acción, **sin contraseñas ni datos personales completos** | Bloqueado |

## CA-D5 · Validación de campos obligatorios (RF31)

| ID | Tipo | RF | Dónde | Precondición | Pasos | Resultado esperado | Estado |
|---|---|---|---|---|---|---|---|
| CP-D-31 | Negativo | RF31 | UI | Sesión de Administrador | Enviar el formulario de crear usuario con campos vacíos | No se envía y el mensaje dice **qué campo falta**, en español | Listo |
| CP-D-32 | Negativo | RF31 | UI | Sesión de Administrador | Escribir un correo con formato inválido | No se envía y explica que el formato no es válido | Listo |
| CP-D-33 | Positivo | RF31 | UI | Cualquier sesión | Recorrer los formularios del sistema | Todos validan antes de ejecutar y todos los mensajes están en español | Listo |
| CP-D-34 | Negativo | RF31 | API | — | `POST /api/extracciones/` omitiendo `fecha_corte` | `400` con el mensaje **en español** | Listo |

## Cobertura y bloqueos

| Criterio | Casos | Listos | Bloqueados |
|---|---|---|---|
| CA-D1 | 10 | 10 | 0 |
| CA-D2 | 4 | 4 | 0 |
| CA-D3 | 13 | 13 | 0 |
| CA-D4 | 3 | 2 | 1 |
| CA-D5 | 4 | 4 | 0 |
| **Total** | **34** | **33** | **1** |

| Bloqueo | Casos | Quién lo desbloquea |
|---|---|---|
| No existe el endpoint de auditoría (RF30) | CP-D-30 | Dilan |

**Importante para el acta.** Hay que distinguir dónde se validó cada cosa:

| Qué | Dónde se valida hoy |
|---|---|
| RF25, RF26, RF27 | Interfaz **y** backend: la rama `dev` del backend ya tiene inicio de sesión por sesión, cierre, roles y contraseñas con hash Argon2 |
| RF28, RF29 | **Solo interfaz**, contra datos simulados: el backend todavía no expone la gestión de usuarios ni la recuperación de contraseña |
| RF30 | **Ninguno**: no existe el endpoint de auditoría. La pantalla existe, el log consultable no |
| RF31 | Interfaz **y** backend: las validaciones del servidor ya responden en español (`LANGUAGE_CODE = es-co` en `dev`) |

Esto se dice tal cual en la reunión con CENS: decir que HU-D está completa sería inexacto
mientras RF28, RF29 y RF30 no tengan backend.

## Trazabilidad RF a casos

| RF | Criterio | Casos |
|---|---|---|
| RF25 | CA-D1 | CP-D-01 a CP-D-06 |
| RF26 | CA-D1 | CP-D-07, CP-D-08, CP-D-09, CP-D-10 |
| RF27 | CA-D2 | CP-D-11, CP-D-12, CP-D-13, CP-D-14, CP-D-29 |
| RF28 | CA-D3 | CP-D-05, CP-D-15 a CP-D-24 |
| RF29 | CA-D3 | CP-D-19, CP-D-25, CP-D-26, CP-D-27 |
| RF30 | CA-D4 | CP-D-28, CP-D-29, CP-D-30 |
| RF31 | CA-D5 | CP-D-06, CP-D-24, CP-D-31 a CP-D-34 |
