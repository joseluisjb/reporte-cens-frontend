// Configuración del frontend leída de variables de entorno (.env). Ver .env.example.
// Importante: todo VITE_* es visible en el navegador; nunca pongas claves aquí.
// Se escribe siempre import.meta.env.VITE_X completo (sin alias) para que Vite pueda reemplazarlo
// y quitar del build el código que no se usa.
export const API_URL = import.meta.env.VITE_API_URL ?? '/api'

// Atajo "Cambiar de perfil" (solo demostración). Exige mocks: en el sistema real el rol lo define
// el backend (RF27). Es una constante evaluada al compilar: con DEMO_ACTIVO en false, Vite quita
// del build todo el código del atajo.
export const DEMO_ACTIVO =
  import.meta.env.VITE_DEMO_MODE === 'true' && import.meta.env.VITE_USE_MOCKS === 'true'

// Inactividad (RF26). Debe coincidir con el vencimiento de la sesión en el backend.
export const IDLE_MINUTES =
  Number(import.meta.env.VITE_IDLE_MINUTES) > 0 ? Number(import.meta.env.VITE_IDLE_MINUTES) : 10
export const IDLE_WARNING_SECONDS = 60
