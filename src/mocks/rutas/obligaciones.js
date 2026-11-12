// Rutas de obligaciones de la Iteración 2 (pantalla 9, RF10–RF19, RF45–RF50) del backend simulado.
// Propuestas del contrato 0.9: el backend aún no las tiene. SOLO Analista de Cartera (el
// Administrador recibe 403). Datos: las 12 obligaciones del mockup v3 (mocks/datos/obligacionesIteracion2.js).
import { http, HttpResponse } from 'msw'
import { ESTADOS_OBLIGACION } from '../../features/transunion/catalogosTU'
import { ENDPOINTS } from '../../lib/api/endpoints'
import { aDetalle, aResumen, lineaTiempo, resumenCartera } from '../datos/obligacionesIteracion2'
import { db } from '../db'
import { corteVigente } from './ciclos'
import { aEntero, error, espera, exigirSesion, idDeRuta, SOLO_ANALISTA, url } from '../utilidades'
import { leerPaginacion } from './extracciones'

const MSG = {
  estado: 'Estado no válido.',
  eliminada: 'Usa true o false.',
  cuotas: 'Indica un número entero de cuotas, 0 o más.',
  q: 'La búsqueda admite hasta 60 caracteres.',
}
const NO_ENCONTRADA = { detail: 'Obligación no encontrada.' }

// Filtros y paginación de `GET /obligaciones/` → { filtros }, { errores } ({ campo: ['mensaje'] }, como DRF)
// o { detail } si la paginación no es válida (contrato 0.9.3: igual que la extracción).
// Un filtro vacío (`?q=`) se ignora, igual que si no viniera.
export function leerFiltrosObligaciones(params) {
  const valor = (nombre) => (params.get(nombre) ?? '').trim()
  const errores = {}
  const filtros = { eliminada: false, abierta: false }

  const estado = valor('estado_tu')
  if (estado) {
    if (Object.hasOwn(ESTADOS_OBLIGACION, estado)) filtros.estado_tu = estado
    else errores.estado_tu = [MSG.estado]
  }
  for (const nombre of ['eliminada', 'abierta']) {
    const texto = valor(nombre)
    if (!texto) continue
    if (texto === 'true' || texto === 'false') filtros[nombre] = texto === 'true'
    else errores[nombre] = [MSG.eliminada]
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

  if (Object.keys(errores).length) return { errores }

  const paginacion = leerPaginacion(params)
  if (paginacion.error) return { detail: paginacion.error }
  return { filtros: { ...filtros, limite: paginacion.limite, desplazamiento: paginacion.desplazamiento } }
}

function cumple(fila, { estado_tu: estado, eliminada, abierta, cuotas_mora_min: cuotas, q }) {
  if (fila.eliminada !== eliminada) return false
  if (abierta && (fila.cerrada || fila.eliminada)) return false
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
    const { filtros, errores, detail } = leerFiltrosObligaciones(new URL(request.url).searchParams)
    if (errores) return error(400, errores)
    if (detail) return error(400, { detail })
    const corte = corteVigente()
    const filas = db.obligaciones
      .map((o) => aResumen(o, corte))
      .filter((fila) => cumple(fila, filtros))
      .sort((a, b) => a.numero_obligacion.localeCompare(b.numero_obligacion))
    const { limite, desplazamiento } = filtros
    return HttpResponse.json({ total: filas.length, resultados: filas.slice(desplazamiento, desplazamiento + limite) })
  }),

  // Antes que `/:id/`, o 'resumen' se tomaría por un id.
  http.get(url(ENDPOINTS.obligacionesResumen), async () => {
    await espera()
    const { respuesta } = exigirSesion(SOLO_ANALISTA)
    return respuesta ?? HttpResponse.json(resumenCartera(db.obligaciones, corteVigente()))
  }),

  http.get(url(ENDPOINTS.obligacion(':id')), async ({ params }) => {
    await espera()
    const { respuesta } = exigirSesion(SOLO_ANALISTA)
    if (respuesta) return respuesta
    const obligacion = buscar(params.id)
    return obligacion ? HttpResponse.json(aDetalle(obligacion, corteVigente())) : error(404, NO_ENCONTRADA)
  }),

  http.get(url(ENDPOINTS.obligacionLineaTiempo(':id')), async ({ params }) => {
    await espera()
    const { respuesta } = exigirSesion(SOLO_ANALISTA)
    if (respuesta) return respuesta
    const obligacion = buscar(params.id)
    return obligacion ? HttpResponse.json(lineaTiempo(obligacion)) : error(404, NO_ENCONTRADA)
  }),
]
