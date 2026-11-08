// Datos de la entidad ante TransUnion (RF57, pantalla 15). Lectura para los dos roles (el Analista ve
// el aviso de marcador en el panel y en la pantalla 12). Propuesto en el contrato 0.9; hoy responden
// los mocks. La escritura (`PUT /entidad/`, solo Administrador) llega con la pantalla 15.
import { api, ENDPOINTS } from '../../lib/api'
import { mapEntidad } from './entityMapper'

export async function getEntity() {
  const { data } = await api.get(ENDPOINTS.entidad)
  return mapEntidad(data)
}
