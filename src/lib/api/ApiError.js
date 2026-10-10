// Error uniforme de la API. Las pantallas muestran `message` (siempre en español) y, en
// formularios, `fieldErrors` ({ campo: 'mensaje' }) para marcar cada campo.
// Además conserva:
//   - `code`: identificador estable del error si el backend lo manda (ej. `permission_denied`), o null.
//   - `datos`: el cuerpo de la respuesta tal cual (objeto), o null si no había. Sirve para lo que no
//     es un campo, como la lista `errores` del 409 de validar un corte: `err.datos?.errores`.
export class ApiError extends Error {
  constructor(message, { status = 0, fieldErrors = {}, code = null, datos = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
    this.code = code
    this.datos = datos
  }
}

const MENSAJES_POR_ESTADO = {
  400: 'Los datos enviados no son válidos.',
  401: 'Tu sesión no es válida o expiró. Inicia sesión de nuevo.',
  403: 'No tienes permiso para realizar esta acción.',
  404: 'No se encontró lo que buscabas.',
  429: 'Demasiados intentos. Espera un momento e intenta de nuevo.',
}
const MENSAJE_RED = 'No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.'
const MENSAJE_SERVIDOR = 'Ocurrió un error en el servidor. Intenta de nuevo más tarde.'
// El servidor respondió 200 pero no es la API (ej. un sitio estático que devuelve index.html).
export const MENSAJE_RESPUESTA_INVALIDA = 'No se pudo conectar con el servidor de NexoVolt. Intenta de nuevo más tarde.'

// Mensajes por defecto de Django REST Framework (vienen en inglés) → español.
const DRF_EN_ESPANOL = {
  'Authentication credentials were not provided.': MENSAJES_POR_ESTADO[401],
  'Invalid token.': MENSAJES_POR_ESTADO[401],
  'You do not have permission to perform this action.': MENSAJES_POR_ESTADO[403],
  'Not found.': MENSAJES_POR_ESTADO[404],
}

const aTexto = (v) => (Array.isArray(v) ? v.filter(Boolean).join(' ') : typeof v === 'string' ? v : '')
const esObjetoPlano = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
// Una lista de objetos (ej. `errores: [{ regla, mensaje }]`) no es el mensaje de un campo.
const esListaDeObjetos = (v) => Array.isArray(v) && v.some(esObjetoPlano)

// Convierte un error de axios en ApiError. Formato DRF: { detail } o { campo: ['mensaje'] }.
export function toApiError(error) {
  if (error instanceof ApiError) return error
  const res = error?.response
  if (!res) return new ApiError(MENSAJE_RED, { status: 0 })

  const { status, data } = res
  const fieldErrors = {}
  let detail = ''
  let code = null
  if (data && typeof data === 'object') {
    if (typeof data.code === 'string') code = data.code
    for (const [campo, valor] of Object.entries(data)) {
      if (campo === 'code' || campo === 'errores' || esListaDeObjetos(valor)) continue // no son campos del formulario
      const texto = aTexto(valor)
      if (!texto) continue
      if (campo === 'detail') detail = texto
      else if (campo === 'non_field_errors') detail = detail || texto
      else fieldErrors[campo] = texto
    }
  }
  detail = DRF_EN_ESPANOL[detail] ?? detail

  let message
  if (status >= 500) message = MENSAJE_SERVIDOR
  else if (status === 401) message = MENSAJES_POR_ESTADO[401]
  else message = detail || MENSAJES_POR_ESTADO[status] || MENSAJES_POR_ESTADO[400]
  return new ApiError(message, { status, fieldErrors, code, datos: esObjetoPlano(data) ? data : null })
}
