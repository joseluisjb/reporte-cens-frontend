// Servicio para Novedades Urgentes, Eliminaciones y Rectificaciones (RF24, RF50, RF55).
// SOLO Analista de Cartera. Implementado en el backend (contrato 0.9.5; 0.9.2 para `novedad_id` en la
// rectificación); con VITE_USE_MOCKS=true responden los mocks.
import { api, ApiError, ENDPOINTS } from '../../lib/api'
import { mapPagina } from '../../lib/api/pagina'
import { hoyISO } from '../../lib/format'
import { listObligations } from '../obligations/obligationsService'
import {
  aPeticionNovedad,
  aPeticionRectificacion,
  mapEliminacion,
  mapNovedad,
  mapRectificacion,
} from './updatesMapper'

// `GET /eliminaciones/` pagina (máximo 100 por página, contrato `Limite`).
export const LIMITE_ELIMINACIONES = 100

export async function listNovelties(params = {}) {
  const query = {}
  if (params.estado) query.estado = params.estado
  if (params.tipo) query.tipo = params.tipo
  const { data } = await api.get(ENDPOINTS.novedades, { params: query })
  return data.map(mapNovedad)
}

export async function createNovelty(valores) {
  const { data } = await api.post(ENDPOINTS.novedades, aPeticionNovedad(valores))
  return mapNovedad(data)
}

// La fecha de gestión es la del día, como en el mockup v3 (submitGestion: `n.gest = todayISO()`).
export async function manageNovelty(id, { numeroTransaccionTu, fechaGestion = hoyISO() }) {
  const { data } = await api.post(ENDPOINTS.novedadGestionar(id), {
    numero_transaccion_tu: numeroTransaccionTu,
    fecha_gestion: fechaGestion,
  })
  return mapNovedad(data)
}

export async function rejectNovelty(id, { motivoRechazo }) {
  const { data } = await api.post(ENDPOINTS.novedadRechazar(id), {
    motivo_rechazo: motivoRechazo,
  })
  return mapNovedad(data)
}

// Una página de eliminaciones → { items, total }.
export async function listEliminations({ limite = LIMITE_ELIMINACIONES, desplazamiento = 0 } = {}) {
  const { data } = await api.get(ENDPOINTS.eliminaciones, { params: { limite, desplazamiento } })
  return mapPagina(data, mapEliminacion)
}

export async function reactivateElimination(id, { numeroActivacionTu, fechaActivacion = hoyISO() }) {
  const { data } = await api.post(ENDPOINTS.eliminacionReactivar(id), {
    numero_activacion_tu: numeroActivacionTu,
    fecha_activacion: fechaActivacion,
  })
  return mapEliminacion(data)
}

export async function listRectifications() {
  const { data } = await api.get(ENDPOINTS.rectificaciones)
  return data.map(mapRectificacion)
}

// `valor_anterior` no se envía: lo toma el sistema del corte afectado (contrato, POST /rectificaciones/).
export async function createRectification(valores) {
  const { data } = await api.post(ENDPOINTS.rectificaciones, aPeticionRectificacion(valores))
  return mapRectificacion(data)
}

export async function confirmRectification(id, { confirmacionTu }) {
  const { data } = await api.post(ENDPOINTS.rectificacionConfirmar(id), {
    confirmacion_tu: confirmacionTu,
  })
  return mapRectificacion(data)
}

// La rectificación pide `obligacion_id`; el formulario recibe el número. Se busca con el filtro `q`
// de `GET /obligaciones/` y se exige coincidencia exacta. Sin coincidencia → error en `referencia`.
export async function findObligationId(numero) {
  const buscado = String(numero ?? '').trim()
  const { items } = await listObligations({ q: buscado })
  const obligacion = items.find((o) => o.numeroObligacion === buscado)
  if (!obligacion) {
    // Mismo texto que el 404 de `GET /obligaciones/{id}/` en el contrato.
    throw new ApiError('Obligación no encontrada.', { status: 400, fieldErrors: { referencia: 'Obligación no encontrada.' } })
  }
  return obligacion.id
}
