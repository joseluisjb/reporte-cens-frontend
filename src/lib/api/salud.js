// Verificación de que el backend responde (GET /salud/, sin sesión). Sirve para "despertar" el
// servidor tras un arranque en frío de Render o para diagnosticar la conexión.
import { TIEMPO_ESPERA_ARRANQUE_MS } from '../config'
import { api } from './client'
import { ENDPOINTS } from './endpoints'

export async function checkHealth() {
  const { data } = await api.get(ENDPOINTS.salud, { timeout: TIEMPO_ESPERA_ARRANQUE_MS, skipAuthRedirect: true })
  return data
}
