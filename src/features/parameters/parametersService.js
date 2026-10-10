// Parámetros de conceptos de energía (RF35) y grupos de conceptos (RF43).
// Lectura: Analista y Administrador. Escritura (crear, editar, activar/desactivar, eliminar): solo
// Administrador; un Analista recibe 403. La pantalla de parámetros usa solo estas funciones.
// Contrato: docs/contrato/openapi.yaml (0.2). Ambos módulos ya existen en el backend.
// Los errores llegan como ApiError: `message` en español y `fieldErrors` ({ campo: 'mensaje' }).
import { api, ENDPOINTS } from '../../lib/api'
import { mapConcepto, mapGrupo } from './conceptMapper'

// Deja solo las claves permitidas que traen valor (undefined = "no cambiar"), para el PATCH.
function soloDefinidos(cambios, claves) {
  return Object.fromEntries(claves.filter((k) => cambios[k] !== undefined).map((k) => [k, cambios[k]]))
}

// ── Conceptos de energía ──

// Sin filtro devuelve todos, ordenados por código. `activo: true|false` filtra por estado.
export async function listConcepts({ activo } = {}) {
  const params = typeof activo === 'boolean' ? { activo: String(activo) } : undefined
  const { data } = await api.get(ENDPOINTS.conceptos, { params })
  return data.map(mapConcepto)
}

// Se crea activo salvo que se indique lo contrario. Código repetido → 409.
export async function createConcept({ codigo, descripcion, activo = true, observacion }) {
  const { data } = await api.post(ENDPOINTS.conceptos, { codigo, descripcion, activo, observacion })
  return mapConcepto(data)
}

// El código no se puede cambiar. Solo se envían los campos que vienen definidos.
export async function updateConcept(codigo, cambios) {
  const { data } = await api.patch(ENDPOINTS.concepto(codigo), soloDefinidos(cambios, ['descripcion', 'activo', 'observacion']))
  return mapConcepto(data)
}

export const setConceptActive = (codigo, activo) => updateConcept(codigo, { activo })

// ── Grupos de conceptos ──

export async function listConceptGroups() {
  const { data } = await api.get(ENDPOINTS.gruposConceptos)
  return data.map(mapGrupo)
}

export async function getConceptGroup(id) {
  const { data } = await api.get(ENDPOINTS.grupoConceptos(id))
  return mapGrupo(data)
}

// `conceptos` es la lista de códigos (enteros); todos deben existir y estar activos.
export async function createConceptGroup({ nombre, conceptos }) {
  const { data } = await api.post(ENDPOINTS.gruposConceptos, { nombre, conceptos })
  return mapGrupo(data)
}

// `conceptos` REEMPLAZA la lista completa del grupo.
export async function updateConceptGroup(id, cambios) {
  const { data } = await api.patch(ENDPOINTS.grupoConceptos(id), soloDefinidos(cambios, ['nombre', 'activo', 'conceptos']))
  return mapGrupo(data)
}

export const setConceptGroupActive = (id, activo) => updateConceptGroup(id, { activo })

// 204 sin cuerpo. Un grupo asociado a un corte en BORRADOR no se puede eliminar (409).
export async function deleteConceptGroup(id) {
  await api.delete(ENDPOINTS.grupoConceptos(id))
}
