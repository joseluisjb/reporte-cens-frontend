// Catálogo de estados y homologación del SAC (RF48, pantalla 16), solo del Administrador (el Analista
// recibe 403). Propuesto en el contrato 0.9.1; hoy responden los mocks. Los errores llegan como ApiError;
// usa `mapHomologacionFieldErrors` para llevar los 400 a cada campo.
import { api, ENDPOINTS } from '../../lib/api'
import { mapEstadoTU, mapHomologacion } from './stateMappingMapper'
import { ACCIONES } from './stateMappingValidation'

// Los 10 estados de la Tabla 4b con su uso en CENS.
export async function getTuStates() {
  const { data } = await api.get(ENDPOINTS.estadosTU)
  return data.map(mapEstadoTU)
}

// La homologación vigente, por prioridad.
export async function getStateMappings() {
  const { data } = await api.get(ENDPOINTS.homologacionEstados)
  return data.map(mapHomologacion)
}

// Reemplaza la homologación de un estado del SAC. Con «Cierre» el estado va en null (contrato 0.9.1); la
// prioridad no se cambia aquí.
export async function updateStateMapping(estadoSac, { accion, estadoTu, confirmado }) {
  const { data } = await api.put(ENDPOINTS.homologacionEstado(estadoSac), {
    accion,
    estado_tu: accion === ACCIONES.ESTADO ? estadoTu : null,
    confirmado: Boolean(confirmado),
  })
  return mapHomologacion(data)
}
