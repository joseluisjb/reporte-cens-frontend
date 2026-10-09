// Llamadas de autenticación al backend. Las pantallas usan SOLO estas funciones, nunca axios.
// Respuesta propuesta de login y me: { user: {...} } (ver userMapper). Contrato por confirmar con Dilan.
import { api, ApiError, ENDPOINTS } from '../../lib/api'
import { mapUser } from '../users/userMapper'
import { IDENTIFICADOR, MSG_CREDENCIALES } from './authConfig'

// El login no dispara el manejo global de 401: credenciales malas son un error del formulario.
export async function login(identificador, password) {
  try {
    const { data } = await api.post(
      ENDPOINTS.login,
      { [IDENTIFICADOR.campo]: identificador, password },
      { skipAuthRedirect: true },
    )
    return mapUser(data.user)
  } catch (e) {
    if (e instanceof ApiError && (e.status === 400 || e.status === 401)) {
      throw new ApiError(MSG_CREDENCIALES, { status: e.status })
    }
    throw e // 403 (usuario desactivado), red o servidor: ya traen su mensaje en español
  }
}

export async function logout() {
  await api.post(ENDPOINTS.logout, null, { skipAuthRedirect: true })
}

// Usuario de la sesión actual, o null si no hay sesión. Se llama al abrir la app.
export async function getCurrentUser() {
  try {
    const { data } = await api.get(ENDPOINTS.me, { skipAuthRedirect: true })
    return mapUser(data.user)
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null
    throw e
  }
}

// Cambio obligatorio de contraseña temporal en el primer ingreso (RF28).
export async function changePassword({ actual, nueva }) {
  await api.post(ENDPOINTS.changePassword, { current_password: actual, new_password: nueva })
}

// Recuperación (RF29). Siempre responde igual: no revela si el correo existe.
export async function requestPasswordReset(identificador) {
  await api.post(ENDPOINTS.passwordReset, { [IDENTIFICADOR.campo]: identificador }, { skipAuthRedirect: true })
}

// Segundo paso de la recuperación: el enlace del correo trae un token de un solo uso.
export async function confirmPasswordReset({ token, nueva }) {
  await api.post(ENDPOINTS.passwordResetConfirm, { token, new_password: nueva }, { skipAuthRedirect: true })
}

// Solo modo demostración con mocks: cambia la sesión simulada a otro perfil.
export async function demoSwitchProfile(rol) {
  const { data } = await api.post(ENDPOINTS.demoSwitchProfile, { rol })
  return mapUser(data.user)
}
