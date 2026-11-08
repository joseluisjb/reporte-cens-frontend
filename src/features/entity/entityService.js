// Datos de la entidad ante TransUnion (RF57, pantalla 15). Propuesto en el contrato 0.9; hoy responden
// los mocks. Lectura para los dos roles (el Analista ve el aviso de marcador en el panel y en la
// pantalla 12); escritura solo del Administrador (el Analista recibe 403).
// Los errores llegan como ApiError; usa `mapEntidadFieldErrors` (entityMapper) para llevarlos a cada campo.
import { api, ENDPOINTS } from '../../lib/api'
import { mapEntidad } from './entityMapper'
import { MARCADOR, normalizarEntidad } from './entityValidation'

export async function getEntity() {
  const { data } = await api.get(ENDPOINTS.entidad)
  return mapEntidad(data)
}

// Reemplaza los tres datos ({ tipoEntidad, codigoEntidad, codigoSucursal }); se envían en mayúsculas.
export async function updateEntity(valores) {
  const v = normalizarEntidad(valores)
  const { data } = await api.put(ENDPOINTS.entidad, {
    tipo_entidad: v.tipoEntidad,
    codigo_entidad: v.codigoEntidad,
    codigo_sucursal: v.codigoSucursal,
  })
  return mapEntidad(data)
}

// «Volver al relleno»: los tres marcadores (los archivos vuelven a salir no aptos para envío).
export const resetEntity = () => updateEntity(MARCADOR)
