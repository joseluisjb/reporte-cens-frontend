// Configuración del frontend leída de variables de entorno (.env). Ver .env.example.
// Importante: todo VITE_* es visible en el navegador; nunca pongas claves aquí.
const env = import.meta.env

export const API_URL = env.VITE_API_URL ?? '/api'
export const USE_MOCKS = env.VITE_USE_MOCKS === 'true'
export const DEMO_MODE = env.VITE_DEMO_MODE === 'true'

// Inactividad (RF26). Debe coincidir con el vencimiento de la sesión en el backend.
export const IDLE_MINUTES = Number(env.VITE_IDLE_MINUTES) > 0 ? Number(env.VITE_IDLE_MINUTES) : 10
export const IDLE_WARNING_SECONDS = 60
