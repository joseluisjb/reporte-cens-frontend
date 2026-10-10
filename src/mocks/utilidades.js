// Utilidades compartidas por las rutas del backend simulado (una por módulo en `rutas/`).
import { delay, HttpResponse } from 'msw'
import { CODIGOS_ROL } from '../features/auth/roles'
import { API_URL } from '../lib/config'
import { db, usuarioActual } from './db'

export const url = (ruta) => `${API_URL}${ruta}`
export const espera = () => delay(import.meta.env.MODE === 'test' ? 0 : 400)
export const error = (status, cuerpo) => HttpResponse.json(cuerpo, { status })
export const sinSesion = () => error(401, { detail: 'Authentication credentials were not provided.' })
export const sinPermiso = () => error(403, { detail: 'You do not have permission to perform this action.' })

// Simula el correo saliente (en Django, el EmailBackend de consola): queda en db.correos y, fuera de
// las pruebas, se imprime en la consola del navegador.
export function enviarCorreoSimulado({ para, asunto, cuerpo }) {
  db.correos.push({ para, asunto, cuerpo })
  if (import.meta.env.MODE !== 'test') console.info(`[Correo simulado] Para: ${para} · Asunto: ${asunto} · ${cuerpo}`)
}

// Devuelve { usuario } o { respuesta } con el error. exigeAdmin → 403 para el Analista.
export function exigirSesion(exigeAdmin = false) {
  const usuario = usuarioActual()
  if (!usuario) return { respuesta: sinSesion() }
  if (exigeAdmin && usuario.rol !== CODIGOS_ROL.ADMIN) return { respuesta: sinPermiso() }
  return { usuario }
}

const dos = (n) => String(n).padStart(2, '0')

// Fecha de hoy en hora LOCAL como 'YYYY-MM-DD' (toISOString la correría de día en Bogotá por el UTC).
export function hoyLocalISO() {
  const d = new Date()
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`
}

// Fecha y hora actuales en ISO 8601 con desfase fijo de Bogotá, p. ej. '2026-10-10T14:03:00-05:00'.
export function ahoraBogotaISO() {
  const d = new Date(Date.now() - 5 * 60 * 60 * 1000) // se corre el reloj 5 h y se leen los campos UTC
  const fecha = `${d.getUTCFullYear()}-${dos(d.getUTCMonth() + 1)}-${dos(d.getUTCDate())}`
  const hora = `${dos(d.getUTCHours())}:${dos(d.getUTCMinutes())}:${dos(d.getUTCSeconds())}`
  return `${fecha}T${hora}-05:00`
}
