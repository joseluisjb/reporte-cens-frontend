// Cliente HTTP único de la aplicación (axios). Todas las llamadas a la API pasan por aquí.
//
// Sesión: cookie de sesión de Django (HttpOnly) + token CSRF. El JavaScript nunca ve la
// sesión: el navegador la envía solo (withCredentials) y axios reenvía el token CSRF en
// el encabezado X-CSRFToken. Por eso no se guarda nada sensible en localStorage.
import axios from 'axios'
import { API_URL } from '../config'
import { ENDPOINTS } from './endpoints'
import { toApiError } from './ApiError'

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

api.interceptors.response.use(
  (respuesta) => respuesta,
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
