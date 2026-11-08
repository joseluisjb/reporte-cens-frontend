// Obligaciones de la Iteración 2 (pantalla 9, RF10–RF19, RF45–RF50). SOLO Analista de Cartera: el
// Administrador recibe 403. Propuesto en el contrato 0.9; hoy responden los mocks (el backend no lo tiene).
// Los errores llegan como ApiError (`message` en español y `fieldErrors`).
import { api, ENDPOINTS } from '../../lib/api'
import { mapPagina } from '../../lib/api/pagina'
import { mapEventoObligacion, mapObligacionDetalle, mapObligacionResumen, mapResumenCartera } from './obligationsMapper'

export const LIMITE_OBLIGACIONES = 20

const hayValor = (v) => v !== undefined && v !== null && String(v).trim() !== ''

// Una página de obligaciones → { items, total }, ordenadas por número de obligación.
//   estado: código de la Tabla 4b · eliminadas: true = solo las eliminadas en TransUnion (RF50)
//   cuotasMoraMin: al menos esas cuotas en mora · q: número de obligación o nombre del titular
//   `limite` de 1 a 100 (por defecto 20); `desplazamiento` desde 0. Los filtros vacíos no se envían.
export async function listObligations({ estado, eliminadas = false, cuotasMoraMin, q, limite = LIMITE_OBLIGACIONES, desplazamiento = 0 } = {}) {
  const params = { limite, desplazamiento }
  if (hayValor(estado)) params.estado_tu = estado
  if (eliminadas) params.eliminada = 'true'
  if (hayValor(cuotasMoraMin)) params.cuotas_mora_min = cuotasMoraMin
  if (hayValor(q)) params.q = String(q).trim()
  const { data } = await api.get(ENDPOINTS.obligaciones, { params })
  return mapPagina(data, mapObligacionResumen)
}

// Tarjetas de la cartera: por estado y por cuotas en mora (RF19), y financiaciones nuevas (RF10).
export async function getObligationsSummary() {
  const { data } = await api.get(ENDPOINTS.obligacionesResumen)
  return mapResumenCartera(data)
}

// Detalle de una obligación (404 → ApiError «Obligación no encontrada.»).
export async function getObligation(id) {
  const { data } = await api.get(ENDPOINTS.obligacion(id))
  return mapObligacionDetalle(data)
}

// Línea de tiempo de estados, del evento más reciente al más antiguo.
export async function getObligationTimeline(id) {
  const { data } = await api.get(ENDPOINTS.obligacionLineaTiempo(id))
  return data.map(mapEventoObligacion)
}
