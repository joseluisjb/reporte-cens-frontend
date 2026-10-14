# Guion de demostración — HU-A y HU-D

Reunión de aceptación con CENS (fila 54). **Duración: unos 18 minutos.** Conduce Johan. Si están, Angel presenta Parametrización y Extracción (sus pantallas) y Omar la Auditoría; Santiago lleva el acta y la lista de RF aprobados (sección 6).
Cubre HU-D (RF25 a RF31) y HU-A (RF1 a RF5, RF7 y RF35). RF6, RF8 y RF9 no tienen pantalla en esta iteración: se explican, no se muestran (sección 6).

> **Antes de empezar, decirlo con claridad:** "Esta demostración corre con **datos de prueba ficticios**; ningún dato de CENS aparece en pantalla." (Si para la reunión se usa el backend de pruebas, se dice "corre contra el backend de pruebas, con datos ficticios".)

## 1. Preparación (la víspera y 15 minutos antes)

| # | Qué hacer |
|---|---|
| 1 | `git checkout main && git pull` y `npm install` |
| 2 | En el `.env`: `VITE_USE_MOCKS=true`, `VITE_IDLE_MINUTES=10`, `VITE_DEMO_MODE=false` |
| 3 | Terminal 1 (demo principal): `npm run dev` → http://localhost:5173 |
| 4 | Terminal 2 (solo para la inactividad, ver 16:00): `$env:VITE_IDLE_MINUTES='0.5'; npm run dev -- --port 5174` (PowerShell) → http://localhost:5174. El valor del entorno manda sobre el `.env`, así que no se toca ningún archivo |
| 5 | Navegador en **ventana nueva** (sin extensiones ni marcadores a la vista), zoom al **110–125 %** para que se lea en proyector, dos pestañas: 5173 y 5174 |
| 6 | Probar el recorrido completo **una vez** y luego **cerrar las pestañas y abrirlas de nuevo**: eso reinicia los datos ficticios (el usuario Laura, el corte enviado, etc.) |
| 7 | Tener grabado un video corto del recorrido (plan B) y las cuentas de la sección 3 a mano |

**Datos de la demo:** lo que se crea o edita se conserva mientras la pestaña esté abierta, incluso si se recarga o se escribe una dirección en la barra. **Cerrar la pestaña lo reinicia todo.** Por eso, no cerrar la pestaña 5173 durante la reunión.

**Correo simulado:** al crear un usuario (2:00) el "correo" con la contraseña temporal aparece en la consola del navegador (F12 → Consola, línea `[Correo simulado]`). Si se quiere mostrar, abrir la consola antes de ese paso.

**Log de auditoría:** con los datos ficticios, la Auditoría (6:00) muestra **registros de ejemplo**; las acciones hechas en la demo no aparecen ahí. Con el backend real sí aparecen todas.

## 2. Recorrido (unos 18 minutos)

### HU-D — Seguridad y usuarios (Administrador)

| Min | Pantalla | Qué hacer | Qué decir | RF |
|---|---|---|---|---|
| 0:00 | Inicio de sesión | Pulsar **Iniciar sesión** con los campos vacíos. Escribir un correo sin `@`. Luego `rmartinez@example.com` con una contraseña incorrecta | "El sistema valida antes de enviar y dice exactamente qué falta, en español. Si las credenciales son incorrectas no revela cuál de los dos datos falla." | RF25, RF31 |
| 1:00 | Inicio de sesión | Probar `avargas@example.com` / `Cartera123` | "Un usuario desactivado no puede entrar y se le explica por qué." | RF25, RF28 |
| 1:30 | Inicio (Administrador) | Entrar con `rmartinez@example.com` / `Admin12345`. Señalar el menú | "El Administrador ve cinco opciones; las de administración llevan la etiqueta ADMIN." | RF25, RF27 |
| 2:00 | Gestión de Usuarios | Mostrar la lista. **Crear usuario**: `Laura Díaz`, `ldiaz@example.com`, rol Analista de Cartera. Aparece el aviso "La contraseña temporal se envió a su correo" | "El Administrador crea usuarios. El sistema genera una contraseña temporal y la **envía por correo** al usuario; deberá cambiarla en su primer ingreso." (En la demostración el correo es simulado: con F12 → Consola se ve la línea `[Correo simulado]` y la contraseña es `Temporal123`.) | RF28 |
| 3:00 | Gestión de Usuarios | **Editar** a Carlos Sánchez (cambiar el nombre) y **desactivar** a Diana Niño con el interruptor | "Se edita y se desactiva con confirmación. No se puede desactivar el propio usuario ni cambiarse el propio rol." | RF28 |

### HU-A — Parametrización (Administrador)

| Min | Pantalla | Qué hacer | Qué decir | RF |
|---|---|---|---|---|
| 4:00 | Parametrización de Conceptos | Abrir la opción del menú. Escribir `interes` en el buscador | "Aquí el Administrador define qué conceptos de facturación cuentan como energía. Arrancamos con el 30 (cuota) y el 94 (interés); la lista no está escrita en el código." | RF35 |
| 4:30 | Parametrización | Borrar la búsqueda. **Agregar concepto** y pulsar **Agregar concepto** con los campos vacíos. Luego código `30` y descripción `CONCEPTO DUPLICADO` | "Valida los campos obligatorios y no permite repetir un código: el mensaje viene del servidor, en español." | RF35, RF31 |
| 5:00 | Parametrización | Cambiar a código `8888`, descripción `CONCEPTO DEMO` y guardar. Desactivar el concepto `9001` con su interruptor y confirmar | "Un concepto nuevo queda activo. Desactivar pide confirmación y no borra el historial." | RF35 |
| 5:30 | Parametrización | Abrir la pestaña **Grupos de conceptos** | "Los conceptos se pueden agrupar para extraer solo un grupo." (Punto por confirmar con CENS, sección 6.) | RF35 |

### HU-D — Auditoría (Administrador)

| Min | Pantalla | Qué hacer | Qué decir | RF |
|---|---|---|---|---|
| 6:00 | Auditoría | Abrir la opción del menú. Filtrar por **Módulo** `Seguridad` y **Tipo de acción** `Cierre de sesión` | "Cada acción queda registrada con fecha, usuario, rol y detalle, sin contraseñas ni datos de deudores. Se distingue el cierre manual del cierre por inactividad." | RF30 |
| 6:30 | Auditoría | **Limpiar filtros** y filtrar por **Tipo de acción** `Cálculo` | "Las tareas automáticas, como la actualización mensual, aparecen como *Sistema*." | RF30, RF9 |

### HU-D — Primer ingreso y roles

| Min | Pantalla | Qué hacer | Qué decir | RF |
|---|---|---|---|---|
| 7:00 | Cierre manual | Menú de perfil (arriba a la derecha) → **Cerrar sesión** | "El cierre de sesión manual invalida la sesión." Se ve el aviso "Sesión cerrada correctamente." | RF26 |
| 7:20 | Primer ingreso | Entrar con `ldiaz@example.com` / `Temporal123`. Intentar abrir otra pantalla escribiendo `localhost:5173/usuarios` en la barra | "Con contraseña temporal no se puede hacer nada más que cambiarla, ni escribiendo la dirección." | RF28 |
| 8:00 | Cambio obligatorio | Escribir `Temporal123` y la nueva `Demo12345` (dos veces). Mostrar cómo los requisitos se marcan a medida que se escribe | "La nueva contraseña debe cumplir las reglas. Al guardar, entra al sistema." | RF28 |
| 9:00 | Roles | Ya como Analista: mostrar el menú de **dos opciones**. Escribir `localhost:5173/usuarios` en la barra | "El Analista no ve las opciones de administración y, aunque escriba la dirección, ve *Acceso restringido*." | RF27 |

### HU-A — Extracción y consolidación (Analista: Laura)

| Min | Pantalla | Qué hacer | Qué decir | RF |
|---|---|---|---|---|
| 9:30 | Extracción de Cartera | Abrir la opción del menú. Mostrar el **Corte #2 al 30/09/2026** en BORRADOR y la tabla de obligaciones | "Cada fila es una obligación: los créditos de energía de una misma financiación se consolidan en una sola, con su saldo neto, días de mora y edad de mora según la Tabla 9 de TransUnion. La identificación sale enmascarada, solo los últimos 4 dígitos." | RF1, RF3, RF4, RF5, RF7 |
| 10:30 | Extracción | Poner una **fecha de corte** futura y pulsar **Iniciar extracción**. Luego `05/10/2026` | "No deja extraer con fecha futura. Y si ya hay un borrador de otra fecha, lo dice en lenguaje claro: hay que completarlo o eliminarlo antes." | RF1, RF31 |
| 11:30 | Extracción | Fecha `30/09/2026`, **Grupo de conceptos de energía** `Energía financiada`, **Iniciar extracción** | "Se puede regenerar el borrador del mismo mes, con todos los conceptos de energía o solo con un grupo. Solo entran conceptos de energía de financiaciones vigentes." | RF1, RF2 |
| 12:30 | Extracción | **Validar corte** | "Antes de enviar, el sistema revisa reglas: los errores bloquean y las observaciones solo informan." | RF5, RF7 |
| 13:30 | Extracción | **Registrar envío a TransUnion** → **Confirmar envío** | "Queda la fecha de envío y el corte pasa a ENVIADO; ya no se puede modificar. El archivo plano para TransUnion es de la Iteración 2." | RF1 |

### HU-D — Recuperación e inactividad

| Min | Pantalla | Qué hacer | Qué decir | RF |
|---|---|---|---|---|
| 14:30 | Recuperar contraseña | Cerrar sesión → **¿Olvidaste tu contraseña?** → escribir un correo cualquiera, existente o no | "La respuesta es siempre la misma: no revela si el correo existe. El enlace llega al correo corporativo, es de un solo uso y vence pronto." | RF29 |
| 15:15 | Restablecer | Abrir `localhost:5173/restablecer?token=token-de-prueba` y definir una contraseña | "Este es el enlace que llegaría por correo. Con un enlace vencido o ya usado, se ofrece pedir uno nuevo." | RF29 |
| 16:00 | Inactividad | Cambiar a la **pestaña 5174** (inactividad corta de 30 s), entrar como `jperez@example.com` / `Analista123` y **no tocar nada** | "En producción son 10 minutos; para la demo está en 30 segundos. Un minuto antes de cerrar, el sistema avisa." Aparece "¿Sigues ahí?" a los 15 s | RF26 |
| 16:45 | Inactividad | Dejar que el tiempo se agote | "Si no hay respuesta, la sesión se cierra sola, el login dice por qué y la auditoría lo registra como *Cierre por inactividad*." Se ve el aviso ámbar | RF26, RF30 |
| 17:15 | Cierre | Volver a la pestaña 5173 | Resumen (ver abajo) | — |

**Frase de cierre (45 s):** "Mostramos el inicio de sesión, el cierre manual y por inactividad, los roles, la gestión de usuarios con contraseña temporal por correo y la recuperación de contraseña; la parametrización de los conceptos de energía; la extracción y consolidación por obligación con su saldo neto y su mora, y el ciclo del corte hasta registrar el envío; y el log de auditoría. Todo en español, accesible con teclado y lector de pantalla."

**Sobre el cierre por inactividad en la auditoría:** con el backend real, "Cierre por inactividad" aparece desde que se fusione el PR #34 del backend. Antes de eso, el backend lo registra como "Cierre manual".

## 3. Datos de la demostración (todos ficticios)

| Correo | Contraseña | Para qué |
|---|---|---|
| `rmartinez@example.com` | `Admin12345` | Administrador |
| `jperez@example.com` | `Analista123` | Analista de Cartera (para la inactividad) |
| `avargas@example.com` | `Cartera123` | Usuario desactivado |
| `ldiaz@example.com` | `Temporal123` → `Demo12345` | Usuario que se crea en vivo; hace la extracción. La contraseña temporal "llega por correo" (simulado: consola del navegador, F12) |
| Enlace de recuperación | `/restablecer?token=token-de-prueba` | Restablecer contraseña |
| Cortes | `#1` al 31/08/2026 (ENVIADO), `#2` al 30/09/2026 (BORRADOR, 24 obligaciones) | Extracción |
| Conceptos | `30`, `94`, `9001` (activos) y `9002` (inactivo) | Parametrización |

## 4. Si algo falla (plan B)

| Problema | Qué hacer |
|---|---|
| La pantalla queda en blanco o rara | Recargar con F5: la sesión y los datos se conservan |
| El servidor de desarrollo se cae | Cerrar la terminal y repetir `npm run dev` (≈10 s) |
| Una cuenta no entra | Se cambió su contraseña en un ensayo anterior (p. ej. Laura). Cerrar la pestaña y abrirla de nuevo restaura todas las cuentas |
| El corte #2 ya aparece ENVIADO | Quedó así de un ensayo. Cerrar la pestaña y abrirla de nuevo |
| Falla el proyector o la red | Usar el **video grabado** (preparación, punto 7) y explicar encima |
| El aviso de inactividad no aparece | Confirmar que se está en el puerto **5174**; la pestaña 5173 usa 10 minutos |
| Con el backend real, algo no responde | Pasar a los mocks: poner `VITE_USE_MOCKS=true` en el `.env` y reiniciar |

## 5. Cómo se mantiene este guion

La prueba `src/test/guionDemo.test.jsx` ejecuta este recorrido contra la API simulada (incluidas las recargas de página), salvo la recuperación y la inactividad, que tienen sus propias pruebas (`passwordFlows.test.jsx` e `inactivity.test.jsx`). Si alguien cambia el código y el guion deja de ser cierto, la prueba falla. Al correr `npm test` antes de la reunión, queda confirmado.

## 6. Para el acta de Santiago (los 17 RF de la iteración 1)

| RF | Qué se vio | Aprobado / observaciones |
|---|---|---|
| RF1 Extracción de financiaciones vigentes | Iniciar extracción con fecha de corte; fecha futura rechazada; borrador de otra fecha; regenerar el borrador; registrar el envío | |
| RF2 Solo conceptos de energía | Extracción con todos los conceptos reportables o con un grupo | |
| RF3 Créditos por financiación | Columna "Créditos" de cada obligación | |
| RF4 Saldo neto | Columna "Saldo neto (COP)" | |
| RF5 Una obligación por financiación | Tabla del corte: una fila por obligación; validación del corte | |
| RF6 Historial de reportes enviados | **No se muestra:** la API existe en el backend, pero la pantalla no está en esta iteración | |
| RF7 Días y edad de mora | Columnas "Días Mora" y "Edad Mora (T9)" | |
| RF8 Historial de un deudor | **No se muestra:** igual que RF6 | |
| RF9 Actualización mensual automática | **No tiene pantalla:** es una tarea programada; su registro aparece como *Sistema* en la auditoría | |
| RF25 Inicio de sesión | Correo y contraseña, validaciones, error de credenciales, usuario desactivado | |
| RF26 Cierre de sesión | Manual y por inactividad con aviso previo | |
| RF27 Roles y permisos | Menú y pantallas distintos para Analista y Administrador; acceso restringido | |
| RF28 Gestión de usuarios | Crear, editar, desactivar; contraseña temporal por correo; cambio obligatorio | |
| RF29 Recuperar contraseña | Enlace de un solo uso, sin revelar si el correo existe; restablecer | |
| RF30 Auditoría | Log con filtros por módulo y tipo de acción; acciones del sistema | |
| RF31 Validaciones y mensajes | Mensajes en español en el login, los formularios de usuarios y conceptos y la extracción | |
| RF35 Parametrización de conceptos | Buscar, agregar, código repetido, desactivar; grupos de conceptos | |

Puntos para consultar al cliente en la reunión (están pendientes, no se asumen):
1. **Tiempo de inactividad:** se propone 10 minutos con aviso un minuto antes. ¿Es el adecuado?
2. **Reglas de contraseña:** mínimo 8 caracteres, una mayúscula y un número. ¿Cumplen la política de CENS?
3. **Contraseña temporal:** resuelto, se envía por correo al usuario (en la demostración el correo es simulado).
4. **Parametrización de conceptos:** hoy solo la ve el Administrador. ¿Es correcto?
5. **Pantalla "Restablecer contraseña":** no estaba en la maqueta; se agregó porque el enlace del correo la necesita. ¿Se aprueba?
6. **Grupos de conceptos:** están construidos, pero no aparecen en las actas. ¿Les sirven o se dejan fuera?
7. **Eliminar un borrador equivocado:** el backend ya lo permite, pero la pantalla de Extracción todavía no tiene el botón (pendiente de Angel). ¿Es necesario para la aceptación?
