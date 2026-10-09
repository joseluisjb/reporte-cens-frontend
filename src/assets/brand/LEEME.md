# Marca NexoVolt

| Archivo | Para qué |
|---|---|
| `logo-nexovolt-original.jpeg` | Original recibido (fondo gris claro). **No se usa en pantalla**; es la fuente para regenerar los demás |
| `logo-nexovolt.png` | Logo completo con fondo transparente (login). Solo para fondos claros |
| `icono-nexovolt.png` | Solo el emblema (gráfico + rayo), fondo transparente. Solo para fondos claros |
| `rayo-blanco.png` | Solo el rayo, en blanco. Para fondos verdes (barra lateral) |

Iconos de la pestaña (en `public/`, los pide `index.html`): `favicon.ico` (16 a 64 px), `icon-192.png` y `apple-touch-icon.png`: el rayo blanco sobre un cuadrado verde `#0D9648`.

Importar desde un componente: `import logo from '../../assets/brand/logo-nexovolt.png'` y `<img src={logo} alt="NexoVolt" />`.
Si llega un logo en mejor calidad (SVG o PNG con transparencia), se reemplaza `logo-nexovolt.png` y listo.
