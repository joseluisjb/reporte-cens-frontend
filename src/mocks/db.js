// Base de datos FICTICIA para los mocks. Todos los datos y contraseñas son inventados.
// Vive en memoria y se copia a sessionStorage (solo en los mocks, nunca en producción) para que
// una recarga de la página no borre lo creado durante una demostración; cerrar la pestaña la reinicia.
// Cuentas de prueba (solo con VITE_USE_MOCKS=true):
//   rmartinez@cens.com.co / Admin12345      → Administrador
//   jperez@cens.com.co    / Analista123     → Analista de Cartera
//   mgomez@cens.com.co    / Temporal123     → debe cambiar la contraseña (primer ingreso)
//   avargas@cens.com.co   / Cartera123      → usuario desactivado
import { ROLES } from '../features/auth/roles'

const SESSION_KEY = 'nexovolt-mock-session' // solo mocks: id de un usuario ficticio
const DB_KEY = 'nexovolt-mock-db' // solo mocks: usuarios ficticios y sus contraseñas de prueba

const usuariosIniciales = () => [
  { id: 1, nombre: 'Juan Pérez', email: 'jperez@cens.com.co', rol: ROLES.ANALISTA, is_active: true, last_login: '2026-09-30T08:14:00', must_change_password: false, password: 'Analista123' },
  { id: 2, nombre: 'Rosa Martínez', email: 'rmartinez@cens.com.co', rol: ROLES.ADMIN, is_active: true, last_login: '2026-09-30T09:02:00', must_change_password: false, password: 'Admin12345' },
  { id: 3, nombre: 'Carlos Sánchez', email: 'csanchez@cens.com.co', rol: ROLES.ANALISTA, is_active: true, last_login: '2026-09-29T17:40:00', must_change_password: false, password: 'Cartera123' },
  { id: 4, nombre: 'Ana Lucía Vargas', email: 'avargas@cens.com.co', rol: ROLES.ANALISTA, is_active: false, last_login: '2026-06-02T11:05:00', must_change_password: false, password: 'Cartera123' },
  { id: 5, nombre: 'Pablo Rincón', email: 'princon@cens.com.co', rol: ROLES.ADMIN, is_active: true, last_login: '2026-09-30T07:51:00', must_change_password: false, password: 'Cartera123' },
  { id: 6, nombre: 'Diana Niño', email: 'dnino@cens.com.co', rol: ROLES.ANALISTA, is_active: true, last_login: '2026-09-30T10:22:00', must_change_password: false, password: 'Cartera123' },
  { id: 7, nombre: 'María Gómez', email: 'mgomez@cens.com.co', rol: ROLES.ANALISTA, is_active: true, last_login: null, must_change_password: true, password: 'Temporal123' },
]

export const TOKEN_RECUPERACION_VALIDO = 'token-de-prueba'

function leerBase() {
  try {
    const guardada = JSON.parse(sessionStorage.getItem(DB_KEY))
    if (guardada?.usuarios?.length) return guardada
  } catch {
    /* sin datos guardados o ilegibles: se parte de los iniciales */
  }
  return { usuarios: usuariosIniciales(), siguienteId: 8 }
}

export const db = { ...leerBase(), sesionId: leerSesion() }

// Llamar después de cada cambio en db.usuarios.
export function persistir() {
  try {
    sessionStorage.setItem(DB_KEY, JSON.stringify({ usuarios: db.usuarios, siguienteId: db.siguienteId }))
  } catch {
    /* sin sessionStorage: los datos viven solo en memoria */
  }
}

function leerSesion() {
  try {
    const v = sessionStorage.getItem(SESSION_KEY)
    return v ? Number(v) : null
  } catch {
    return null
  }
}

export function guardarSesion(id) {
  db.sesionId = id
  try {
    if (id == null) sessionStorage.removeItem(SESSION_KEY)
    else sessionStorage.setItem(SESSION_KEY, String(id))
  } catch {
    /* sin sessionStorage: la sesión vive solo en memoria */
  }
}

export const usuarioActual = () => db.usuarios.find((u) => u.id === db.sesionId) ?? null
export const publico = ({ password: _password, ...u }) => u // nunca se devuelve la contraseña

export function resetMockDb() {
  db.usuarios = usuariosIniciales()
  db.siguienteId = 8
  try {
    sessionStorage.removeItem(DB_KEY)
  } catch {
    /* nada que limpiar */
  }
  guardarSesion(null)
}
