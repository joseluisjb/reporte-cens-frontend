# Accesibilidad — revisión del paso 11

Alcance: lo construido por Johan (base, login, sesión, roles, usuarios, contraseñas, diálogos). Referencia: WCAG 2.1 AA.
Las pantallas de Angel y Omar deben cumplir lo mismo: ver la sección 5.

## 1. Qué se revisó y cómo

| Qué | Cómo | Resultado |
|---|---|---|
| Etiquetas, roles, referencias ARIA, estructura, nombres de botones y enlaces | **axe-core** sobre 14 pantallas y diálogos reales (`src/test/accesibilidad.test.jsx`) | 0 violaciones |
| Teclado (Tab, Enter, Escape, flechas), foco atrapado en diálogos, retorno del foco, enlace "Saltar al contenido" | Pruebas automáticas (`src/test/teclado.test.jsx`) | Pasan |
| Contraste de colores | Cálculo con la fórmula WCAG sobre cada par de colores usado (jsdom no mide colores) | Corregido (sección 3); protegido por `src/test/contraste.test.js` |
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

### Contraste del verde de marca (resuelto)

El verde institucional `#0D9648` (`bosque`) da solo 3,84:1 con texto blanco. El 10/10/2026 Johan decidió usar el verde oscuro `bosque-d` (#0A7A3A) en todo fondo con texto blanco normal, y bordes de campo más oscuros. El verde de marca se conserva para texto grande, iconos y usos decorativos.

| Qué cambió | Antes | Ahora |
|---|---|---|
| Botones primarios y menú lateral: texto blanco sobre el fondo | 3,84 ✗ (`bosque`) | **5,44** ✓ (`bosque-d`) |
| Hover del botón primario | `bosque-d` | `bosque-dd` (#08622E): **7,51** ✓ |
| Menú lateral, ítem con el cursor encima / ítem activo | blanco translúcido sobre `bosque` | negro 10 % / 20 % sobre `bosque-d`: **6,38** / **7,51** ✓ |
| Borde de los campos de formulario (`Input`, `Select`, `SearchBox`, `FilterSelect`) y interruptor apagado | 2,57 ✗ (`gris` #A1A1A5) | **4,10** sobre blanco y **3,92** sobre el fondo ✓ (`gris-d` #7D7D81; piden 3:1) |
| Enlace "Cerrar sesión" de Cambiar contraseña (14 px) | 3,84 ✗ (`text-bosque`) | **5,44** ✓ (`text-bosque-d`) |

**Excepción que se mantiene:** el panel verde del login usa `bosque` con texto blanco **grande y en negrita**, donde WCAG pide 3:1 y hay 3,84:1 ✓. Los iconos decorativos en `text-bosque` o `text-citrico` tampoco cambian.

`src/test/contraste.test.js` calcula estos pares con la fórmula WCAG sobre los tokens reales de `src/index.css` y comprueba que botones, menú lateral e interruptor usen las clases nuevas: si alguien cambia un token o vuelve a poner `bg-bosque` con texto blanco, la prueba falla.

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

Reglas rápidas: todo campo con `label`; todo botón de solo icono con `label` (`IconButton`); tablas con `caption` y `<th scope="col">`; colores solo de los tokens (`text-bosque-d` para texto verde sobre fondo claro, no `text-bosque`; `bg-bosque-d` para superficies con texto blanco; `border-gris-d` para el borde de los controles de formulario, `border-line` solo para separadores decorativos); diálogos con `Modal` o `ConfirmDialog`; nunca transmitir información solo con color.
