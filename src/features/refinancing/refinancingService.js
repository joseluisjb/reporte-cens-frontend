// Refinanciaciones (pantalla 11, RF18). SOLO Analista de Cartera. Implementado en el backend (contrato 0.9.5); con VITE_USE_MOCKS=true
// responden los mocks. Los errores llegan como ApiError: 400 por campo (usa
// `mapRefinanciacionFieldErrors`), 404 si la original no existe y 409 si no se puede cerrar.
import { api, ENDPOINTS } from '../../lib/api'
import { aPeticionRefinanciacion, mapRefinanciacion } from './refinancingMapper'

// Las detectadas en el SAC y las registradas a mano, de la más reciente a la más antigua.
export async function listRefinancings() {
  const { data } = await api.get(ENDPOINTS.refinanciaciones)
  return data.map(mapRefinanciacion)
}

// Registro manual (respaldo): cierra la original con modo de extinción 16 y crea la nueva.
export async function createRefinancing(valores) {
  const { data } = await api.post(ENDPOINTS.refinanciaciones, aPeticionRefinanciacion(valores))
  return mapRefinanciacion(data)
}
