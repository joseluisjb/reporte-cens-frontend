# Accesibilidad — revisión del paso 11

Alcance: lo construido por Johan (base, login, sesión, roles, usuarios, contraseñas, diálogos). Referencia: WCAG 2.1 AA.
Las pantallas de Angel y Omar deben cumplir lo mismo: ver la sección 5.

## 1. Qué se revisó y cómo

| Qué | Cómo | Resultado |
|---|---|---|
| Etiquetas, roles, referencias ARIA, estructura, nombres de botones y enlaces | **axe-core** sobre 14 pantallas y diálogos reales (`src/test/accesibilidad.test.jsx`) | 0 violaciones |
| Teclado (Tab, Enter, Escape, flechas), foco atrapado en diálogos, retorno del foco, enlace "Saltar al contenido" | Pruebas automáticas (`src/test/teclado.test.jsx`) | Pasan |
| Contraste de colores | Cálculo con la fórmula WCAG sobre cada par de colores usado (jsdom no mide colores) | Corregido salvo lo de la sección 3 |
| Lector de pantalla y navegador reales | **Revisión manual** (sección 4) | Pendiente de hacer por una persona |

Para correr las pruebas: `npm test`. Cobertura: `npm run test:cov` (98 % de líneas al cerrar este paso).

## 2. Qué se corrigió en este paso

- **Login:** todo el contenido ahora está dentro de `<main>` (antes, el panel verde izquierdo quedaba fuera de cualquier zona).
- **Cambio de pantalla anunciado:** en una app de una sola página el lector de pantalla no se entera de que cambió la página. `RouteAnnouncer` lee el título nuevo ("NexoVolt — Usuarios del Sistema") sin mover el foco.
- **Zona principal enfocable** (`tabindex="-1"`), para que el enlace "Saltar al contenido" funcione de forma fiable.
- **Campos obligatorios** marcados como `required` (el lector dice "obligatorio"), sin cambiar el aspecto ni activar la validación nativa del navegador (los formularios usan `noValidate` y sus propios mensajes en español).
- **Requisitos de contraseña** asociados al campo (`aria-describedby`): el lector los lee al entrar a "Nueva contraseña".
- **Diálogos que exigen respuesta** (confirmar desactivar, "¿Sigues ahí?") ahora son `alertdialog` con su mensaje como descripción: el lector los lee completos al abrirse.
- **Tablas:** nombre (`caption` solo para lectores) y `scope="col"` en los encabezados.
- **Interruptores:** área de toque de 25 px (mínimo de WCAG 2.2: 24 px); antes eran de 17 px de alto.
- **Contraste** (ver sección 3).

## 3. Contraste de color

Mínimo AA: 4,5:1 para texto normal y 3:1 para texto grande y componentes de interfaz.

| Par de colores | Antes | Ahora |
|---|---|---|
| Texto verde (enlaces, botón contorno) sobre blanco | 3,84 ✗ | **5,44** ✓ (usa `bosque-d`) |
| Insignia "Activo": verde sobre verde claro | 3,49 ✗ | **4,96** ✓ |
| Etiqueta ADMIN (10 px) sobre cítrico | 2,12 ✗ | **5,46** ✓ |
| Texto de error en el aviso rojo | 4,41 ✗ | **5,91** ✓ |
| Placeholder de los campos | 2,56 ✗ | **4,76** ✓ |
| Insignia "Inactivo" | 4,34 ✗ | **6,92** ✓ |
| Texto apagado (`muted`) sobre blanco y sobre el fondo | 4,76 / 4,55 ✓ | igual |
| Error rojo sobre blanco, aviso ámbar, chips, insignia de rol | ✓ | igual |

`bosque-d` (#0A7A3A) es el mismo verde oscuro que la maqueta ya usa al pasar el cursor sobre un botón, así que el cambio casi no se nota.

### Limitaciones conocidas (decisión de marca, no resuelta)

Estas dos combinaciones **siguen por debajo de 4,5:1** porque usan el verde institucional `#0D9648` como fondo, que viene definido por la marca y por la maqueta aprobada:

| Par | Contraste | Dónde |
|---|---|---|
| Texto blanco sobre verde de marca | 3,84:1 | Botones primarios (texto de 14–16 px) y menú lateral |
| Borde gris de marca `#A1A1A5` sobre blanco | 2,57:1 | Borde de los campos de formulario (WCAG pide 3:1) |

Opciones, de menor a mayor impacto visual:
1. **Dejarlo** y documentarlo (la marca manda). Es lo que hay hoy.
2. **Botones primarios con `bosque-d`** (#0A7A3A, 5,44:1) en vez del verde de marca, y el borde de los campos un tono más oscuro. Cambio de dos líneas en `buttonClasses.js` y `Field.jsx`.
3. Además, un verde más oscuro en el menú lateral.

Esto se decide con el cliente o el docente: no se cambió por cuenta propia para no alejarse de la maqueta aprobada.

## 4. Revisión manual pendiente (necesita una persona)

Ninguna herramienta automática puede confirmar esto. Con **NVDA** (gratis, Windows) y el navegador; unos 20 minutos:

1. **Teclado solo** (sin mouse): iniciar sesión, abrir el menú, ir a Usuarios, crear un usuario, desactivar otro, cerrar sesión. ¿Se ve siempre dónde está el foco? ¿Se puede salir de todos los diálogos con Escape?
2. **NVDA** en el login: ¿lee "Correo electrónico, obligatorio, campo de edición"? Provoca un error: ¿lo lee?
3. Cambiar de pantalla con el menú: ¿lee el nuevo título?
4. Dejar la sesión inactiva (usa `VITE_IDLE_MINUTES=0.5`): ¿lee el aviso "¿Sigues ahí?" completo al aparecer?
5. **Zoom al 200 %** y ventana de 320 px de ancho: ¿hay scroll horizontal en la página (no en las tablas)? ¿Se corta algún texto?
6. **Modo de alto contraste de Windows** y "reducir movimiento": la interfaz sigue siendo usable.
7. Capturas o notas de lo que encuentres: sirven como evidencia para la sustentación.

## 5. Para las pantallas de Angel y Omar

Antes de abrir el PR, agreguen su pantalla a `src/test/accesibilidad.test.jsx` (3 líneas):

```js
test('parametrización', async () => {
  await renderConSesion('/parametrizacion')
  await screen.findByText('...algo de tu pantalla ya cargada...')
  await expectAccesible()
})
```

Reglas rápidas: todo campo con `label`; todo botón de solo icono con `label` (`IconButton`); tablas con `caption` y `<th scope="col">`; colores solo de los tokens (`text-bosque-d` para texto verde sobre fondo claro, no `text-bosque`); diálogos con `Modal` o `ConfirmDialog`; nunca transmitir información solo con color.
