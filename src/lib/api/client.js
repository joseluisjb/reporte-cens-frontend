// Cliente HTTP único de la aplicación (axios). Todas las llamadas a la API pasan por aquí.
//
// Sesión: cookie de sesión de Django (HttpOnly) + token CSRF. El JavaScript nunca ve la
// sesión: el navegador la envía solo (withCredentials) y axios reenvía el token CSRF en
// el encabezado X-CSRFToken. Por eso no se guarda nada sensible en localStorage.
import axios from 'axios'
import { API_URL } from '../config'
import { ENDPOINTS } from './endpoints'
import { ApiError, MENSAJE_RESPUESTA_INVALIDA, toApiError } from './ApiError'

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  withXSRFToken: true,
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
  headers: { Accept: 'application/json' },
  timeout: 15000,
})

// Manejo global de 401 y 403. La app los registra al iniciar (paso 7):
//   onUnauthorized → ir a /login · onForbidden → mostrar "Acceso restringido".
// Para que una llamada concreta no los dispare (ej. el login mismo): { skipAuthRedirect: true }.
let handlers = {}
export function setAuthHandlers(nuevos) {
  handlers = { ...nuevos }
}

// Django entrega el token CSRF en una cookie al llamar a un endpoint "csrf". Se pide una sola
// vez antes de la primera petición que modifica datos.
const SEGURAS = ['get', 'head', 'options']
const hayCookieCsrf = () => document.cookie.split('; ').some((c) => c.startsWith('csrftoken='))
let csrfPendiente = null
export function resetCsrf() {
  csrfPendiente = null
}

api.interceptors.request.use(async (config) => {
  const metodo = (config.method ?? 'get').toLowerCase()
  if (SEGURAS.includes(metodo) || config.url === ENDPOINTS.csrf || hayCookieCsrf()) return config
  csrfPendiente ??= api.get(ENDPOINTS.csrf, { skipAuthRedirect: true }).catch((e) => {
    csrfPendiente = null
    throw e
  })
  await csrfPendiente
  return config
})

// Una respuesta con cuerpo que no es JSON no viene de la API (ej. un sitio estático sin backend
// responde index.html con 200 a cualquier /api/...). Se rechaza con status 0, igual que "sin
// conexión": no es un 401/403, así que no dispara el manejo global, y los servicios no intentan
// leer campos de un texto. Los cuerpos vacíos (204) pasan.
const tieneCuerpo = (data) => data != null && data !== ''
const esJson = (respuesta) => String(respuesta.headers?.['content-type'] ?? '').toLowerCase().includes('application/json')
const esperaJson = (config) => !config?.responseType || config.responseType === 'json'

api.interceptors.response.use(
  (respuesta) => {
    if (esperaJson(respuesta.config) && tieneCuerpo(respuesta.data) && !esJson(respuesta)) {
      return Promise.reject(new ApiError(MENSAJE_RESPUESTA_INVALIDA, { status: 0 }))
    }
    return respuesta
  },
  (error) => {
    const apiError = toApiError(error)
    const config = error?.config ?? {}
    if (!config.skipAuthRedirect) {
      if (apiError.status === 401) handlers.onUnauthorized?.(apiError)
      if (apiError.status === 403) handlers.onForbidden?.(apiError)
    }
    return Promise.reject(apiError)
  },
)
