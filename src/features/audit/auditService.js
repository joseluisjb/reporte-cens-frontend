// Log de auditoría (RF30). SOLO Administrador: el Analista recibe 403.
// Implementado en el backend (Dilan, `6f596bb`). Contrato: docs/contrato/openapi.yaml (0.6), `GET /auditoria/`. Más reciente primero. Pagina con `limite` y `desplazamiento`.
// Los errores llegan como ApiError (`message` en español y `fieldErrors`; usa `mapAuditFieldErrors`).
import { api, ENDPOINTS } from '../../lib/api'
import { mapPagina } from '../../lib/api/pagina'
import { mapRegistroAuditoria } from './auditMapper'

export const LIMITE_AUDITORIA = 20

const hayValor = (v) => v !== undefined && v !== null && String(v).trim() !== ''

// Una página del log → { items, total } (`total` cuenta todos los que cumplen el filtro).
//   desde / hasta: 'YYYY-MM-DD' (inclusivos) · usuarioId: id numérico · tipoAccion: código · modulo: texto.
//   `limite` de 1 a 100 (por defecto 20); `desplazamiento` desde 0. Los filtros vacíos no se envían.
export async function listAuditLog({ desde, hasta, usuarioId, tipoAccion, modulo, limite = LIMITE_AUDITORIA, desplazamiento = 0 } = {}) {
  const params = { limite, desplazamiento }
  if (hayValor(desde)) params.desde = String(desde).trim()
  if (hayValor(hasta)) params.hasta = String(hasta).trim()
  if (hayValor(usuarioId)) params.usuario = String(usuarioId).trim()
  if (hayValor(tipoAccion)) params.tipo_accion = tipoAccion
  if (hayValor(modulo)) params.modulo = modulo
  const { data } = await api.get(ENDPOINTS.auditoria, { params })
  return mapPagina(data, mapRegistroAuditoria)
}
