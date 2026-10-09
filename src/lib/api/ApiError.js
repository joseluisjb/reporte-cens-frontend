// Error uniforme de la API. Las pantallas muestran `message` (siempre en español) y, en
// formularios, `fieldErrors` ({ campo: 'mensaje' }) para marcar cada campo.
export class ApiError extends Error {
  constructor(message, { status = 0, fieldErrors = {} } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
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

// Mensajes por defecto de Django REST Framework (vienen en inglés) → español.
const DRF_EN_ESPANOL = {
  'Authentication credentials were not provided.': MENSAJES_POR_ESTADO[401],
  'Invalid token.': MENSAJES_POR_ESTADO[401],
  'You do not have permission to perform this action.': MENSAJES_POR_ESTADO[403],
  'Not found.': MENSAJES_POR_ESTADO[404],
}

const aTexto = (v) => (Array.isArray(v) ? v.filter(Boolean).join(' ') : typeof v === 'string' ? v : '')

// Convierte un error de axios en ApiError. Formato DRF: { detail } o { campo: ['mensaje'] }.
export function toApiError(error) {
  if (error instanceof ApiError) return error
  const res = error?.response
  if (!res) return new ApiError(MENSAJE_RED, { status: 0 })

  const { status, data } = res
  const fieldErrors = {}
  let detail = ''
  if (data && typeof data === 'object') {
    for (const [campo, valor] of Object.entries(data)) {
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
  return new ApiError(message, { status, fieldErrors })
}
