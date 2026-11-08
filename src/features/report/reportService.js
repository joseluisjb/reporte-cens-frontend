// Reporte a TransUnion (pantalla 12, RF20–RF22, RF51, RF53, RF57). Analista y Administrador (como
// `validar`). Propuesto en el contrato 0.9; hoy responden los mocks. Los errores llegan como ApiError:
// el 409 de generar trae `datos.errores` (usa `mapErroresCorrectivos`).
import { api, ENDPOINTS } from '../../lib/api'
import { TIEMPO_ESPERA_CORTE_MS } from '../../lib/config'
import { mapArchivo, mapValidaciones } from './reportMapper'

// «Validaciones antes de generar» del corte (solo consulta: no cambia el corte).
export async function getValidations(corteId) {
  const { data } = await api.get(ENDPOINTS.validacionesCorte(corteId))
  return mapValidaciones(data)
}

// Genera el archivo plano del corte VALIDADO. Puede tardar con la cartera real: espera ampliada.
// 409 si el corte no está validado o si un campo no cabe en su posición (no se genera nada).
export async function generateFile(corteId) {
  const { data } = await api.post(ENDPOINTS.generarArchivo(corteId), null, { timeout: TIEMPO_ESPERA_CORTE_MS })
  return mapArchivo(data)
}

// Archivos generados, del más reciente al más antiguo (`corteId` filtra por corte).
export async function listFiles({ corteId } = {}) {
  const { data } = await api.get(ENDPOINTS.archivos, { params: corteId ? { corte_id: corteId } : undefined })
  return data.map(mapArchivo)
}

// Nombre del archivo en `Content-Disposition: attachment; filename="SSR….txt"`, o null.
export const nombreDeDescarga = (cabecera) => /filename="?([^";]+)"?/i.exec(cabecera ?? '')?.[1] ?? null

// Descarga el archivo tal cual lo devuelve el backend (texto Windows-1252, sin transformarlo) y lo
// guarda con el nombre que manda el servidor.
export async function downloadFile(archivo) {
  const { data, headers } = await api.get(ENDPOINTS.archivoDescarga(archivo.id), { responseType: 'blob' })
  const nombre = nombreDeDescarga(headers?.['content-disposition']) ?? `${archivo.nombre}.txt`
  const enlace = document.createElement('a')
  const url = URL.createObjectURL(data)
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
  return nombre
}
