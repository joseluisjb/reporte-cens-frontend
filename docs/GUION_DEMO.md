# Guion de demostración — HU-D (seguridad, usuarios y contraseñas)

Reunión de aceptación con CENS (fila 54). **Duración: 10 minutos.** Presentan Johan (HU-D, frontend) y Santiago (acta y RF aprobados).
Cubre RF25 a RF29. La extracción (HU-A), la auditoría (RF30) y el componente de validación (RF31) los presentan sus responsables; el guion de HU-A lo agrega Santiago a continuación.

> **Antes de empezar, decirlo con claridad:** "Esta parte corre con **datos de prueba ficticios**; ningún dato de CENS aparece en pantalla. La conexión con el backend real es el siguiente paso." (Si para la reunión ya existe el backend y se probó, se cambia por "corre contra el backend de pruebas".)

## 1. Preparación (la víspera y 15 minutos antes)

| # | Qué hacer |
|---|---|
| 1 | `git checkout main && git pull` y `npm install` |
| 2 | En el `.env`: `VITE_USE_MOCKS=true`, `VITE_IDLE_MINUTES=10`, `VITE_DEMO_MODE=false` |
| 3 | Terminal 1 (demo principal): `npm run dev` → http://localhost:5173 |
| 4 | Terminal 2 (solo para la inactividad, ver paso 7): `$env:VITE_IDLE_MINUTES='0.5'; npm run dev -- --port 5174` (PowerShell) → http://localhost:5174. El valor del entorno manda sobre el `.env`, así que no se toca ningún archivo |
| 5 | Navegador en **ventana nueva** (sin extensiones ni marcadores a la vista), zoom al **110–125 %** para que se lea en proyector, dos pestañas: 5173 y 5174 |
| 6 | Probar el recorrido completo **una vez** y luego **cerrar las pestañas y abrirlas de nuevo**: eso reinicia los datos ficticios (el usuario Laura, las ediciones, etc.) |
| 7 | Tener grabado un video corto del recorrido (plan B) y las cuentas de la sección 3 a mano |

**Datos de la demo:** lo que se crea o edita se conserva mientras la pestaña esté abierta, incluso si se recarga o se escribe una dirección en la barra. **Cerrar la pestaña lo reinicia todo.** Por eso, no cerrar la pestaña 5173 durante la reunión.

**Correo simulado:** al crear un usuario (2:00) el "correo" con la contraseña temporal aparece en la consola del navegador (F12 → Consola, línea `[Correo simulado]`). Si se quiere mostrar, abrir la consola antes de ese paso.

## 2. Recorrido (10 minutos)

| Min | Pantalla | Qué hacer | Qué decir | RF |
|---|---|---|---|---|
| 0:00 | Inicio de sesión | Pulsar **Iniciar sesión** con los campos vacíos. Escribir un correo sin `@`. Luego `rmartinez@example.com` con una contraseña incorrecta | "El sistema valida antes de enviar y dice exactamente qué falta, en español. Si las credenciales son incorrectas no revela cuál de los dos datos falla." | RF25, RF31 |
| 1:00 | Inicio de sesión | Probar `avargas@example.com` / `Cartera123` | "Un usuario desactivado no puede entrar y se le explica por qué." | RF25, RF28 |
| 1:30 | Inicio (Administrador) | Entrar con `rmartinez@example.com` / `Admin12345`. Señalar el menú | "El Administrador ve cinco opciones; las de administración llevan la etiqueta ADMIN." | RF25, RF27 |
| 2:00 | Gestión de Usuarios | Mostrar la lista. **Crear usuario**: `Laura Díaz`, `ldiaz@example.com`, rol Analista de Cartera. Aparece el aviso "La contraseña temporal se envió a su correo" | "El Administrador crea usuarios. El sistema genera una contraseña temporal y la **envía por correo** al usuario; deberá cambiarla en su primer ingreso." (En la demostración el correo es simulado: con F12 → Consola se ve la línea `[Correo simulado]` y la contraseña es `Temporal123`.) | RF28 |
| 3:00 | Gestión de Usuarios | **Editar** a Carlos Sánchez (cambiar el nombre) y **desactivar** a otro usuario con el interruptor | "Se edita y se desactiva con confirmación. No se puede desactivar el propio usuario ni cambiarse el propio rol." | RF28 |
| 4:00 | Cierre manual | Menú de perfil (arriba a la derecha) → **Cerrar sesión** | "El cierre de sesión manual invalida la sesión." Se ve el aviso "Sesión cerrada correctamente." | RF26 |
| 4:20 | Primer ingreso | Entrar con `ldiaz@example.com` / `Temporal123`. Intentar abrir otra pantalla escribiendo `localhost:5173/usuarios` en la barra | "Con contraseña temporal no se puede hacer nada más que cambiarla, ni escribiendo la dirección." | RF28 |
| 5:00 | Cambio obligatorio | Escribir `Temporal123` y la nueva `Demo12345` (dos veces). Mostrar cómo los requisitos se marcan a medida que se escribe | "La nueva contraseña debe cumplir las reglas. Al guardar, entra al sistema." | RF28 |
| 6:00 | Roles | Ya como Analista: mostrar el menú de **dos opciones**. Escribir `localhost:5173/usuarios` en la barra | "El Analista no ve las opciones de administración y, aunque escriba la dirección, ve *Acceso restringido*." | RF27 |
| 7:00 | Recuperar contraseña | Cerrar sesión → **¿Olvidaste tu contraseña?** → escribir un correo cualquiera, existente o no | "La respuesta es siempre la misma: no revela si el correo existe. El enlace llega al correo corporativo, es de un solo uso y vence pronto." | RF29 |
| 7:45 | Restablecer | Abrir `localhost:5173/restablecer?token=token-de-prueba` y definir una contraseña | "Este es el enlace que llegaría por correo. Con un enlace vencido o ya usado, se ofrece pedir uno nuevo." | RF29 |
| 8:30 | Inactividad | Cambiar a la **pestaña 5174** (inactividad corta de 30 s), entrar como `jperez@example.com` / `Analista123` y **no tocar nada** | "En producción son 10 minutos; para la demo está en 30 segundos. Un minuto antes de cerrar, el sistema avisa." Aparece "¿Sigues ahí?" a los 15 s | RF26 |
| 9:15 | Inactividad | Dejar que el tiempo se agote | "Si no hay respuesta, la sesión se cierra sola y el login dice por qué." Se ve el aviso ámbar | RF26 |
| 9:45 | Cierre | Volver a la pestaña 5173 | Resumen (ver abajo) | — |

**Frase de cierre (30 s):** "Mostramos inicio de sesión, cierre manual y por inactividad, roles diferenciados, gestión de usuarios con contraseña temporal enviada por correo y cambio obligatorio, y recuperación de contraseña. Todo en español, accesible con teclado y lector de pantalla."

## 3. Datos de la demostración (todos ficticios)

| Correo | Contraseña | Para qué |
|---|---|---|
| `rmartinez@example.com` | `Admin12345` | Administrador |
| `jperez@example.com` | `Analista123` | Analista de Cartera (también para la inactividad) |
| `avargas@example.com` | `Cartera123` | Usuario desactivado |
| `ldiaz@example.com` | `Temporal123` → `Demo12345` | Usuario que se crea en vivo. La contraseña temporal "llega por correo" (simulado: consola del navegador, F12) |
| Enlace de recuperación | `/restablecer?token=token-de-prueba` | Restablecer contraseña |

## 4. Si algo falla (plan B)

| Problema | Qué hacer |
|---|---|
| La pantalla queda en blanco o rara | Recargar con F5: la sesión y los datos se conservan |
| El servidor de desarrollo se cae | Cerrar la terminal y repetir `npm run dev` (≈10 s) |
| Una cuenta no entra | Se cambió su contraseña en un ensayo anterior (p. ej. Laura). Cerrar la pestaña y abrirla de nuevo restaura todas las cuentas |
| Falla el proyector o la red | Usar el **video grabado** (preparación, punto 7) y explicar encima |
| El aviso de inactividad no aparece | Confirmar que se está en el puerto **5174**; la pestaña 5173 usa 10 minutos |
| Con el backend real, algo no responde | Pasar a los mocks: poner `VITE_USE_MOCKS=true` en el `.env` y reiniciar |

## 5. Cómo se mantiene este guion

La prueba `src/test/guionDemo.test.jsx` ejecuta este recorrido contra la API simulada (incluidas las recargas de página). Si alguien cambia el código y el guion deja de ser cierto, la prueba falla. Al correr `npm test` antes de la reunión, queda confirmado.

## 6. Para el acta de Santiago (qué RF se demuestra y qué debe aprobar el cliente)

| RF | Qué se vio | Aprobado / observaciones |
|---|---|---|
| RF25 Inicio de sesión | Correo y contraseña, validaciones, error de credenciales, usuario desactivado | |
| RF26 Cierre de sesión | Manual y por inactividad con aviso previo | |
| RF27 Roles y permisos | Menú y pantallas distintos para Analista y Administrador; acceso restringido | |
| RF28 Gestión de usuarios | Crear, editar, desactivar; contraseña temporal; cambio obligatorio | |
| RF29 Recuperar contraseña | Enlace de un solo uso, sin revelar si el correo existe; restablecer | |

Puntos para consultar al cliente en la reunión (están pendientes, no se asumen):
1. **Tiempo de inactividad:** se propone 10 minutos con aviso un minuto antes. ¿Es el adecuado?
2. **Reglas de contraseña:** mínimo 8 caracteres, una mayúscula y un número. ¿Cumplen la política de CENS?
3. **Contraseña temporal:** resuelto, se envía por correo al usuario (en la demostración el correo es simulado).
4. **Parametrización de conceptos:** hoy solo la ve el Administrador. ¿Es correcto?
5. **Pantalla "Restablecer contraseña":** no estaba en la maqueta; se agregó porque el enlace del correo la necesita. ¿Se aprueba?
