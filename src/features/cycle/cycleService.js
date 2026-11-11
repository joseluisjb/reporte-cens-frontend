// Actualización mensual de estados (pantalla 10, RF10–RF17, RF19, RF45–RF49). SOLO Analista de Cartera.
// Implementado en el backend (contrato 0.9.5); con VITE_USE_MOCKS=true responden los mocks.
// Los errores llegan como ApiError (`message` en español y `fieldErrors`; usa `mapCicloFieldErrors`).
import { api, ENDPOINTS } from '../../lib/api'
import { TIEMPO_ESPERA_CORTE_MS } from '../../lib/config'
import { mapCicloDetalle, mapCicloResumen, mapMatriz } from './cycleMapper'

// Historial, del ciclo más reciente al más antiguo.
export async function listCycles() {
  const { data } = await api.get(ENDPOINTS.ciclos)
  return data.map(mapCicloResumen)
}

// Resultado completo de un ciclo (404 si ese corte no tiene ciclo).
export async function getCycle(corteId) {
  const { data } = await api.get(ENDPOINTS.ciclo(corteId))
  return mapCicloDetalle(data)
}

// Ejecuta el ciclo sobre el corte en BORRADOR de esa fecha. Es síncrono y puede tardar: usa el mismo
// tiempo de espera que la extracción. 400 → error en `fechaCorte`; 409 → no hay extracción de ese corte.
export async function runCycle(fechaCorte) {
  const { data } = await api.post(ENDPOINTS.ciclos, { fecha_corte: fechaCorte }, { timeout: TIEMPO_ESPERA_CORTE_MS })
  return mapCicloDetalle(data)
}

// Matriz de cambios de estado de Sector Real Servicios (Manual, p. 40).
export async function getStateMatrix() {
  const { data } = await api.get(ENDPOINTS.matrizEstados)
  return mapMatriz(data)
}
