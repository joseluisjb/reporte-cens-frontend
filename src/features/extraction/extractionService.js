// Extracción de cartera y ciclo de corte (RF1–RF5, RF7, RF44). Lo usa la pantalla de Angel
// (`ExtractionPage.jsx`) y la tarjeta "Última extracción" del inicio. Todas las funciones: Analista y
// Administrador. Contrato: docs/contrato/openapi.yaml (0.5). Ya existe en el backend.
//
// Es SÍNCRONO: `generateCut` responde 201 cuando el corte ya está generado; no hay 202 ni consulta
// periódica del estado (no hagas polling).
//
// Ciclo de un corte: BORRADOR → (validateCut) → VALIDADO → (registerSubmission) → ENVIADO.
// Solo puede haber un BORRADOR a la vez. Los errores llegan como ApiError (`message` en español y
// `fieldErrors`; usa `mapCorteFieldErrors` para los nombres de campo del formulario).
// Al validar, un 409 por reglas correctivas trae la lista en `err.datos.errores`
// ([{ regla, mensaje }]); las pantallas la leen con `err.datos?.errores`. El corte sigue en BORRADOR.
import { api, ENDPOINTS } from '../../lib/api'
import { mapPagina } from '../../lib/api/pagina'
import { mapCorte, mapCorteValidado, mapObligacionCorte } from './extractionMapper'

// Cortes no anulados, del más reciente al más antiguo (por fecha de ejecución). Puede ser [].
export async function listCuts() {
  const { data } = await api.get(ENDPOINTS.extracciones)
  return data.map(mapCorte)
}

// El corte más reciente, o null si todavía no hay ninguno (el backend responde 204 sin cuerpo).
export async function getLatestCut({ skipAuthRedirect = false } = {}) {
  const { data, status } = await api.get(ENDPOINTS.extraccionUltima, { skipAuthRedirect })
  return status === 204 || !data ? null : mapCorte(data)
}

export async function getCut(id) {
  const { data } = await api.get(ENDPOINTS.extraccion(id))
  return mapCorte(data)
}

// Genera un corte en BORRADOR. `fechaCorte`: 'YYYY-MM-DD', no futura. `grupoId`: grupo de conceptos
// activo; null = todos los conceptos reportables. Un BORRADOR de la misma fecha se reemplaza (mismo id).
export async function generateCut({ fechaCorte, grupoId = null }) {
  const { data } = await api.post(ENDPOINTS.extracciones, { fecha_corte: fechaCorte, grupo_id: grupoId })
  return mapCorte(data)
}

// Elimina un corte. Solo se puede en BORRADOR: en otro estado responde 409. No devuelve nada (204).
export async function deleteCut(id) {
  await api.delete(ENDPOINTS.extraccion(id))
}

// BORRADOR → VALIDADO. Devuelve { corte, advertencias } (las advertencias no bloquean).
// 409 con reglas correctivas: ApiError con `datos.errores` y el corte sigue en BORRADOR.
export async function validateCut(id) {
  const { data } = await api.post(ENDPOINTS.validarExtraccion(id))
  return mapCorteValidado(data)
}

// VALIDADO → ENVIADO. `fechaEnvio` ('YYYY-MM-DD', no futura) es opcional: sin ella se usa hoy.
export async function registerSubmission(id, { fechaEnvio } = {}) {
  const cuerpo = fechaEnvio ? { fecha_envio: fechaEnvio } : {}
  const { data } = await api.post(ENDPOINTS.registrarEnvio(id), cuerpo)
  return mapCorte(data)
}

// Una página de obligaciones del corte (una fila por financiación), ordenada por número de obligación.
// Devuelve { items, total }. `limite` de 1 a 100; `desplazamiento` desde 0. La identificación llega enmascarada.
export async function listCutObligations(id, { limite = 20, desplazamiento = 0 } = {}) {
  const { data } = await api.get(ENDPOINTS.obligacionesCorte(id), { params: { limite, desplazamiento } })
  return mapPagina(data, mapObligacionCorte)
}
