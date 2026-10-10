// Base de datos FICTICIA para los mocks. Todos los datos y contraseñas son inventados.
// Vive en memoria y se copia a sessionStorage (solo en los mocks, nunca en producción) para que
// una recarga de la página no borre lo creado durante una demostración; cerrar la pestaña la reinicia.
// Incluye usuarios, conceptos de energía, grupos de conceptos y cortes de extracción de ejemplo.
// Los roles se guardan como CÓDIGO del backend (`ANALISTA_CARTERA`, `ADMINISTRADOR`), igual que el contrato.
// Cuentas de prueba (solo con VITE_USE_MOCKS=true; el rol se muestra aquí como texto):
//   rmartinez@cens.com.co / Admin12345      → Administrador
//   jperez@cens.com.co    / Analista123     → Analista de Cartera
//   mgomez@cens.com.co    / Temporal123     → debe cambiar la contraseña (primer ingreso)
//   avargas@cens.com.co   / Cartera123      → usuario desactivado
import { CODIGOS_ROL } from '../features/auth/roles'

const SESSION_KEY = 'nexovolt-mock-session' // solo mocks: id de un usuario ficticio
const DB_KEY = 'nexovolt-mock-db-v3' // solo mocks: usuarios ficticios y sus contraseñas de prueba (v2: roles como código; v3: cortes completos)

// Contraseña temporal que el backend simulado "envía por correo" a cada usuario nuevo.
export const CLAVE_TEMPORAL_MOCK = 'Temporal123'

const usuariosIniciales = () => [
  { id: 1, nombre: 'Juan Pérez', email: 'jperez@cens.com.co', rol: CODIGOS_ROL.ANALISTA, is_active: true, last_login: '2026-09-30T08:14:00-05:00', must_change_password: false, password: 'Analista123' },
  { id: 2, nombre: 'Rosa Martínez', email: 'rmartinez@cens.com.co', rol: CODIGOS_ROL.ADMIN, is_active: true, last_login: '2026-09-30T09:02:00-05:00', must_change_password: false, password: 'Admin12345' },
  { id: 3, nombre: 'Carlos Sánchez', email: 'csanchez@cens.com.co', rol: CODIGOS_ROL.ANALISTA, is_active: true, last_login: '2026-09-29T17:40:00-05:00', must_change_password: false, password: 'Cartera123' },
  { id: 4, nombre: 'Ana Lucía Vargas', email: 'avargas@cens.com.co', rol: CODIGOS_ROL.ANALISTA, is_active: false, last_login: '2026-06-02T11:05:00-05:00', must_change_password: false, password: 'Cartera123' },
  { id: 5, nombre: 'Pablo Rincón', email: 'princon@cens.com.co', rol: CODIGOS_ROL.ADMIN, is_active: true, last_login: '2026-09-30T07:51:00-05:00', must_change_password: false, password: 'Cartera123' },
  { id: 6, nombre: 'Diana Niño', email: 'dnino@cens.com.co', rol: CODIGOS_ROL.ANALISTA, is_active: true, last_login: '2026-09-30T10:22:00-05:00', must_change_password: false, password: 'Cartera123' },
  { id: 7, nombre: 'María Gómez', email: 'mgomez@cens.com.co', rol: CODIGOS_ROL.ANALISTA, is_active: true, last_login: null, must_change_password: true, password: CLAVE_TEMPORAL_MOCK },
]

export const TOKEN_RECUPERACION_VALIDO = 'token-de-prueba'

// Conceptos de energía (RF35). Misma forma que responde el backend; sin fecha de creación (diferencia B).
const conceptosIniciales = () => [
  { codigo: 30, descripcion: 'CUOTA FINANCIACION ENERGIA', activo: true, observacion: null },
  { codigo: 94, descripcion: 'INTERES FINANCIACION ENERGIA', activo: true, observacion: null },
  { codigo: 9001, descripcion: 'CONCEPTO DE PRUEBA ACTIVO', activo: true, observacion: 'Dato ficticio' },
  { codigo: 9002, descripcion: 'CONCEPTO DE PRUEBA INACTIVO', activo: false, observacion: null },
]

// Grupos de conceptos (RF43). Aquí solo se guardan los CÓDIGOS; la respuesta agrega la descripción.
const gruposIniciales = () => [
  { id: 1, nombre: 'Energía financiada', activo: true, conceptos: [30, 94], creado: '2026-10-01' },
  { id: 2, nombre: 'Solo cuota de energía', activo: true, conceptos: [30], creado: '2026-10-03' },
  { id: 3, nombre: 'Grupo de prueba inactivo', activo: false, conceptos: [9001], creado: '2026-10-05' },
]

// Cortes (extracciones, RF1–RF5). Guardan lo que el backend guarda: `grupo_nombre` es una FOTO del nombre
// del grupo al generar el corte (renombrar el grupo después no reescribe el historial). Las obligaciones
// no se guardan: se generan al pedirlas (mocks/datos/obligaciones.js). `fecha_envio` y `observacion`
// no salen en el resumen del corte (CorteResumen).
const cortesIniciales = () => [
  { id: 1, fecha_corte: '2026-08-31', fecha_ejecucion: '2026-09-01T08:05:00-05:00', grupo_id: 1, grupo_nombre: 'Energía financiada', estado: 'ENVIADO', fecha_envio: '2026-09-03', ejecutada_por: 'Juan Pérez', observacion: null },
  { id: 2, fecha_corte: '2026-09-30', fecha_ejecucion: '2026-10-01T07:40:00-05:00', grupo_id: 2, grupo_nombre: 'Solo cuota de energía', estado: 'BORRADOR', fecha_envio: null, ejecutada_por: 'Juan Pérez', observacion: null },
]

// Colecciones que se guardan en sessionStorage (todo lo de la base salvo `correos` y la sesión).
const COLECCIONES = ['usuarios', 'siguienteId', 'conceptos', 'grupos', 'siguienteGrupoId', 'cortes', 'siguienteCorteId']

const inicial = () => ({
  usuarios: usuariosIniciales(),
  siguienteId: 8,
  conceptos: conceptosIniciales(),
  grupos: gruposIniciales(),
  siguienteGrupoId: 4,
  cortes: cortesIniciales(),
  siguienteCorteId: 3,
})

// Lo guardado se mezcla sobre los valores iniciales POR COLECCIÓN: una pestaña guardada antes de que
// existieran conceptos y grupos (solo usuarios y siguienteId) no deja colecciones sin definir.
function leerBase() {
  const base = inicial()
  try {
    const guardada = JSON.parse(sessionStorage.getItem(DB_KEY))
    if (guardada?.usuarios?.length) return Object.fromEntries(COLECCIONES.map((k) => [k, guardada[k] ?? base[k]]))
  } catch {
    /* sin datos guardados o ilegibles: se parte de los iniciales */
  }
  return base
}

// `correos` (bandeja del correo simulado) y `cortesConErrorForzado` (cortes a los que las pruebas
// les fuerzan un error correctivo al validar) viven solo en memoria: no se guardan en sessionStorage.
export const db = { ...leerBase(), sesionId: leerSesion(), correos: [], cortesConErrorForzado: [] }
export const ultimoCorreo = () => db.correos.at(-1) ?? null

// Llamar después de cada cambio en las colecciones de db (usuarios, conceptos, grupos...).
export function persistir() {
  try {
    sessionStorage.setItem(DB_KEY, JSON.stringify(Object.fromEntries(COLECCIONES.map((k) => [k, db[k]]))))
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
  Object.assign(db, inicial())
  db.correos = []
  db.cortesConErrorForzado = []
  try {
    sessionStorage.removeItem(DB_KEY)
  } catch {
    /* nada que limpiar */
  }
  guardarSesion(null)
}
