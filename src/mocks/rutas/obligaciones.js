// Rutas de obligaciones de la Iteración 2 (pantalla 9, RF10–RF19, RF45–RF50) del backend simulado.
// Propuestas del contrato 0.9: el backend aún no las tiene. SOLO Analista de Cartera (el
// Administrador recibe 403). Datos: las 12 obligaciones del mockup v3 (mocks/datos/obligacionesIteracion2.js).
import { http, HttpResponse } from 'msw'
import { ESTADOS_OBLIGACION } from '../../features/transunion/catalogosTU'
import { ENDPOINTS } from '../../lib/api/endpoints'
import { aDetalle, aResumen, lineaTiempo, resumenCartera } from '../datos/obligacionesIteracion2'
import { db } from '../db'
import { aEntero, error, espera, exigirSesion, idDeRuta, SOLO_ANALISTA, url } from '../utilidades'
import { LIMITE_MAXIMO } from './extracciones'

const MSG = {
  estado: 'Estado no válido. Usa un código de la Tabla 4b.',
  eliminada: 'Usa true o false.',
  cuotas: 'Indica un número entero de cuotas, 0 o más.',
  q: 'La búsqueda admite hasta 60 caracteres.',
  limite: 'El límite debe ser un entero mayor que 0.',
  desplazamiento: 'El desplazamiento debe ser un entero de 0 en adelante.',
}
const NO_ENCONTRADA = { detail: 'Obligación no encontrada.' }

// Filtros y paginación de `GET /obligaciones/` → { filtros } o { errores } ({ campo: ['mensaje'] }, como DRF).
// A diferencia de la paginación de extracción (`{ detail }`), el contrato 0.9 define este 400 como
// ErrorCampos, también para `limite` y `desplazamiento` (anotado en docs/PENDIENTES_BACKEND.md §5).
// Un filtro vacío (`?q=`) se ignora, igual que si no viniera.
export function leerFiltrosObligaciones(params) {
  const valor = (nombre) => (params.get(nombre) ?? '').trim()
  const errores = {}
  const filtros = { eliminada: false, limite: 20, desplazamiento: 0 }

  const estado = valor('estado_tu')
  if (estado) {
    if (Object.hasOwn(ESTADOS_OBLIGACION, estado)) filtros.estado_tu = estado
    else errores.estado_tu = [MSG.estado]
  }
  const eliminada = valor('eliminada')
  if (eliminada) {
    if (eliminada === 'true' || eliminada === 'false') filtros.eliminada = eliminada === 'true'
    else errores.eliminada = [MSG.eliminada]
  }
  const cuotas = valor('cuotas_mora_min')
  if (cuotas) {
    const n = aEntero(cuotas)
    if (n === null || n < 0) errores.cuotas_mora_min = [MSG.cuotas]
    else filtros.cuotas_mora_min = n
  }
  const q = valor('q')
  if (q.length > 60) errores.q = [MSG.q]
  else if (q) filtros.q = q.toLowerCase()

  const limite = valor('limite')
  if (limite) {
    const n = aEntero(limite)
    if (n === null || n < 1) errores.limite = [MSG.limite]
    else filtros.limite = Math.min(n, LIMITE_MAXIMO)
  }
  const desplazamiento = valor('desplazamiento')
  if (desplazamiento) {
    const n = aEntero(desplazamiento)
    if (n === null || n < 0) errores.desplazamiento = [MSG.desplazamiento]
    else filtros.desplazamiento = n
  }
  return Object.keys(errores).length ? { errores } : { filtros }
}

function cumple(fila, { estado_tu: estado, eliminada, cuotas_mora_min: cuotas, q }) {
  if (fila.eliminada !== eliminada) return false
  if (estado && fila.estado_tu !== estado) return false
  if (cuotas !== undefined && fila.cuotas_mora < cuotas) return false
  if (q && !fila.numero_obligacion.toLowerCase().includes(q) && !fila.nombre_titular.toLowerCase().includes(q)) return false
  return true
}

const buscar = (id) => db.obligaciones.find((o) => o.id === idDeRuta(id)) ?? null

export const obligacionesHandlers = [
  http.get(url(ENDPOINTS.obligaciones), async ({ request }) => {
    await espera()
    const { respuesta } = exigirSesion(SOLO_ANALISTA)
    if (respuesta) return respuesta
    const { filtros, errores } = leerFiltrosObligaciones(new URL(request.url).searchParams)
    if (errores) return error(400, errores)
    const filas = db.obligaciones
      .map(aResumen)
      .filter((fila) => cumple(fila, filtros))
      .sort((a, b) => a.numero_obligacion.localeCompare(b.numero_obligacion))
    const { limite, desplazamiento } = filtros
    return HttpResponse.json({ total: filas.length, resultados: filas.slice(desplazamiento, desplazamiento + limite) })
  }),

  // Antes que `/:id/`, o 'resumen' se tomaría por un id.
  http.get(url(ENDPOINTS.obligacionesResumen), async () => {
    await espera()
    const { respuesta } = exigirSesion(SOLO_ANALISTA)
    return respuesta ?? HttpResponse.json(resumenCartera(db.obligaciones))
  }),

  http.get(url(ENDPOINTS.obligacion(':id')), async ({ params }) => {
    await espera()
    const { respuesta } = exigirSesion(SOLO_ANALISTA)
    if (respuesta) return respuesta
    const obligacion = buscar(params.id)
    return obligacion ? HttpResponse.json(aDetalle(obligacion)) : error(404, NO_ENCONTRADA)
  }),

  http.get(url(ENDPOINTS.obligacionLineaTiempo(':id')), async ({ params }) => {
    await espera()
    const { respuesta } = exigirSesion(SOLO_ANALISTA)
    if (respuesta) return respuesta
    const obligacion = buscar(params.id)
    return obligacion ? HttpResponse.json(lineaTiempo(obligacion)) : error(404, NO_ENCONTRADA)
  }),
]
