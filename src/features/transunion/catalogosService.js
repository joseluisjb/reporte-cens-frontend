// Catálogos del Manual de TransUnion guardados en la base (`GET /catalogos/{nombre}/`, contrato 0.9,
// propuesto). Lectura para los dos roles. Cada código trae `confirmado`: si es `false`, la pantalla lo
// marca «por confirmar» (Tabla 11 y tipologías de reclamo, mientras CENS o TransUnion no respondan).
import { api, ENDPOINTS } from '../../lib/api'
import { mapItemCatalogo } from './catalogosMapper'

export const CATALOGOS = Object.freeze({
  modosExtincion: 'modos-extincion', // Tabla 10
  tiposPago: 'tipos-pago', // Tabla 31
  naturalezasReestructuracion: 'naturalezas-reestructuracion', // Tabla 11
  motivosEliminacion: 'motivos-eliminacion', // Tabla 28
  tipologiasReclamo: 'tipologias-reclamo', // Ley 1266 (por confirmar)
})

// nombre: uno de CATALOGOS → [{ codigo, descripcion, confirmado }], ordenados por código.
export async function getCatalog(nombre) {
  const { data } = await api.get(ENDPOINTS.catalogo(nombre))
  return data.map(mapItemCatalogo)
}
