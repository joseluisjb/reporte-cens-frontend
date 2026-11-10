// Servicio para Reclamos Habeas Data (RF23, pantalla 13).
// SOLO Analista de Cartera. Endpoints:
//   GET /api/reclamos/
//   POST /api/reclamos/
//   POST /api/reclamos/{id}/cerrar/
//   GET /api/reclamos/insumo/?tipo=marcacion|desmarcacion
//   GET /api/catalogos/tipologias-reclamo/
import { api, ENDPOINTS } from '../../lib/api'
import { listObligations } from '../obligations/obligationsService'
import { CATALOGOS, getCatalog } from '../transunion/catalogosService'
import { aPeticionCerrarReclamo, aPeticionReclamo, mapReclamo } from './claimsMapper'

export async function listClaims(params = {}) {
  const query = {}
  if (params.estado) query.estado = params.estado
  const { data } = await api.get(ENDPOINTS.reclamos, { params: query })
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

export async function getClaimTipologias() {
  return getCatalog(CATALOGOS.tipologiasReclamo)
}

export async function listEligibleObligations() {
  const { items } = await listObligations({ limite: 100 })
  return items.filter((o) => !o.enReclamo && !o.eliminada)
}

// Descarga el insumo batch de marcación o desmarcación y devuelve el texto plano
export async function downloadClaimBatch(tipo) {
  const { data, headers } = await api.get(ENDPOINTS.reclamosInsumo, {
    params: { tipo },
    responseType: 'blob',
    headers: { Accept: 'text/plain, */*' },
  })

  // Disparar descarga en el navegador si estamos en entorno DOM
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const filenameHeader = headers?.['content-disposition']
    let filename = tipo === 'marcacion' ? 'Reclamos_Marcacion_TransUnion.txt' : 'Reclamos_Desmarcacion_TransUnion.txt'
    if (filenameHeader) {
      const match = filenameHeader.match(/filename="?([^";]+)"?/)
      if (match?.[1]) filename = match[1]
    }
    try {
      const blob = new Blob([data], { type: 'text/plain;charset=utf-8' })
      const url = typeof URL.createObjectURL === 'function' ? URL.createObjectURL(blob) : ''
      const link = document.createElement('a')
      if (url) link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      if (url && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(url)
    } catch {
      // Ignorar errores de jsdom cuando createObjectURL o click no están implementados
    }
  }

  return data
}
