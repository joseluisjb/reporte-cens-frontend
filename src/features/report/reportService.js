// Reporte a TransUnion (pantalla 12, RF20–RF22, RF51, RF53, RF54, RF57). Propuesto en el contrato 0.9; hoy
// responden los mocks. Los errores llegan como ApiError: el 409 de generar trae `datos.errores` (usa
// `mapErroresCorrectivos`) y el 422 de cargar resultados, el motivo en `message`.
import { api, ENDPOINTS } from '../../lib/api'
import { TIEMPO_ESPERA_CORTE_MS } from '../../lib/config'
import { mapArchivo, mapResultadosCargue, mapValidaciones } from './reportMapper'

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

// Tiempo que se conserva el enlace temporal del archivo: revocarlo en el mismo instante del clic
// cancela la descarga en algunos navegadores. Es un detalle técnico, no una regla de CENS ni de
// TransUnion: 40 s es el mismo valor que usa la librería FileSaver.js para revocar su enlace.
export const ESPERA_REVOCAR_MS = 40000

// Descarga el archivo tal cual lo devuelve el backend (texto Windows-1252, sin transformarlo) y lo
// guarda con el nombre que manda el servidor. Pide texto, no JSON (el cliente manda JSON por defecto).
export async function downloadFile(archivo) {
  const { data, headers } = await api.get(ENDPOINTS.archivoDescarga(archivo.id), { responseType: 'blob', headers: { Accept: 'text/plain, */*' } })
  const nombre = nombreDeDescarga(headers?.['content-disposition']) ?? `${archivo.nombre}.txt`
  const enlace = document.createElement('a')
  const url = URL.createObjectURL(data)
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  setTimeout(() => URL.revokeObjectURL(url), ESPERA_REVOCAR_MS)
  return nombre
}

// Resultados del cargue de TransUnion de un archivo (RF54). 404 si todavía no tiene.
export async function getUploadResults(archivoId) {
  const { data } = await api.get(ENDPOINTS.resultadosArchivo(archivoId))
  return mapResultadosCargue(data)
}

// Carga los archivos de respuesta de TransUnion (lista de File) de un archivo ya enviado. 409 si no se ha
// registrado su envío; 422 si un archivo es de otro corte o no tiene la estructura esperada (no se guarda nada).
export async function uploadResults(archivoId, archivos) {
  const formulario = new FormData()
  for (const archivo of archivos) formulario.append('archivos', archivo)
  const { data } = await api.post(ENDPOINTS.resultadosArchivo(archivoId), formulario, { timeout: TIEMPO_ESPERA_CORTE_MS })
  return mapResultadosCargue(data)
}
