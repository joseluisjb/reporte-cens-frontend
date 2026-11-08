// Servicio para Novedades Urgentes, Eliminaciones y Rectificaciones (RF24, RF50, RF55).
// SOLO Analista de Cartera.
import { api, ENDPOINTS } from '../../lib/api'
import {
  aPeticionNovedad,
  mapEliminacion,
  mapNovedad,
  mapRectificacion,
} from './updatesMapper'

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

export async function manageNovelty(id, { numeroTransaccionTu, fechaGestion }) {
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

export async function listEliminations() {
  const { data } = await api.get(ENDPOINTS.eliminaciones)
  return data.map(mapEliminacion)
}

export async function reactivateElimination(id, { numeroActivacionTu }) {
  const { data } = await api.post(ENDPOINTS.eliminacionReactivar(id), {
    numero_activacion_tu: numeroActivacionTu,
  })
  return mapEliminacion(data)
}

export async function listRectifications() {
  const { data } = await api.get(ENDPOINTS.rectificaciones)
  return data.map(mapRectificacion)
}

export async function createRectification(valores) {
  const { data } = await api.post(ENDPOINTS.rectificaciones, {
    obligacion_id: Number(valores.obligacionId),
    corte_id: Number(valores.corteId),
    campo: valores.campo,
    valor_corregido: String(valores.valorCorregido),
    justificacion: valores.justificacion,
    medio: valores.medio,
  })
  return mapRectificacion(data)
}

export async function confirmRectification(id, { confirmacionTu }) {
  const { data } = await api.post(ENDPOINTS.rectificacionConfirmar(id), {
    confirmacion_tu: confirmacionTu,
  })
  return mapRectificacion(data)
}
