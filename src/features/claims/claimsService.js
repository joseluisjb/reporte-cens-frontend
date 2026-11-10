// Servicio de Reclamos Habeas Data (RF23, pantalla 13). Solo Analista de Cartera (contrato 0.9.4):
//   GET  /reclamos/?estado=EN_RECLAMO|CERRADO
//   POST /reclamos/
//   POST /reclamos/{id}/cerrar/
//   GET  /reclamos/insumo/?tipo=marcacion|desmarcacion  (text/plain; deja marcados los que incluye)
//   GET  /catalogos/tipologias-reclamo/
import { api, ENDPOINTS } from '../../lib/api'
import { guardarArchivo, nombreDeDescarga } from '../../lib/descarga'
import { listObligations } from '../obligations/obligationsService'
import { CATALOGOS, getCatalog } from '../transunion/catalogosService'
import { aPeticionCerrarReclamo, aPeticionReclamo, mapReclamo } from './claimsMapper'

const NOMBRE_INSUMO = { marcacion: 'Reclamos_Marcacion_TransUnion.txt', desmarcacion: 'Reclamos_Desmarcacion_TransUnion.txt' }

export async function listClaims({ estado } = {}) {
  const { data } = await api.get(ENDPOINTS.reclamos, { params: estado ? { estado } : {} })
  return data.map(mapReclamo)
}

export async function createClaim(valores) {
  const { data } = await api.post(ENDPOINTS.reclamos, aPeticionReclamo(valores))
  return mapReclamo(data)
}

export async function closeClaim(id, valores) {
  const { data } = await api.post(ENDPOINTS.reclamoCerrar(id), aPeticionCerrarReclamo(valores))
  return mapReclamo(data)
}

export const getClaimTipologias = () => getCatalog(CATALOGOS.tipologiasReclamo)

// Obligaciones que pueden recibir un reclamo: sin otro reclamo abierto y no eliminadas en TransUnion.
// Las cerradas sí: su información negativa sigue en TransUnion durante la permanencia (Manual, cap. 4).
export async function listEligibleObligations() {
  const { items } = await listObligations({ limite: 100 })
  return items.filter((o) => !o.enReclamo && !o.eliminada)
}

// Genera el insumo del Reclamos Batch (Manual, p. 57) y lo guarda en el equipo. El backend deja
// marcados los reclamos que incluye (`marcacion_generada` o `desmarcacion_generada`); 409 si otro
// usuario los cambió mientras se generaba.
export async function downloadClaimBatch(tipo) {
  const { data, headers } = await api.get(ENDPOINTS.reclamosInsumo, {
    params: { tipo },
    responseType: 'blob',
    headers: { Accept: 'text/plain, */*' },
  })
  const nombre = nombreDeDescarga(headers?.['content-disposition']) ?? NOMBRE_INSUMO[tipo]
  guardarArchivo(data, nombre)
  return nombre
}
