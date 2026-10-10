// Rutas de autenticación del backend simulado: CSRF, sesión, cambio y recuperación de contraseña, demo.
import { http, HttpResponse } from 'msw'
import { reglasIncumplidas } from '../../features/auth/authConfig'
import { ENDPOINTS } from '../../lib/api/endpoints'
import { db, guardarSesion, persistir, publico, TOKEN_RECUPERACION_VALIDO } from '../db'
import { error, espera, exigirSesion, url } from '../utilidades'

const mensajePassword = (nueva) => {
  const faltan = reglasIncumplidas(nueva ?? '')
  return faltan.length ? { new_password: [`La contraseña debe cumplir: ${faltan.join('; ').toLowerCase()}.`] } : null
}

export const authHandlers = [
  http.get(url(ENDPOINTS.csrf), () => new HttpResponse(null, { status: 204 })),

  http.post(url(ENDPOINTS.login), async ({ request }) => {
    await espera()
    const { email, password } = await request.json()
    const u = db.usuarios.find((x) => x.email.toLowerCase() === String(email ?? '').toLowerCase())
    if (!u || u.password !== password) return error(401, { detail: 'No active account found with the given credentials' })
    if (!u.is_active) return error(403, { detail: 'Tu usuario está desactivado. Contacta al administrador.' })
    guardarSesion(u.id)
    u.last_login = new Date().toISOString()
    persistir()
    return HttpResponse.json({ user: publico(u) })
  }),

  http.post(url(ENDPOINTS.logout), () => {
    guardarSesion(null)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(url(ENDPOINTS.me), async () => {
    await espera()
    const { usuario, respuesta } = exigirSesion()
    return respuesta ?? HttpResponse.json({ user: publico(usuario) })
  }),

  http.post(url(ENDPOINTS.changePassword), async ({ request }) => {
    await espera()
    const { usuario, respuesta } = exigirSesion()
    if (respuesta) return respuesta
    const { current_password: actual, new_password: nueva } = await request.json()
    if (usuario.password !== actual) return error(400, { current_password: ['La contraseña actual no es correcta.'] })
    const invalida = mensajePassword(nueva)
    if (invalida) return error(400, invalida)
    usuario.password = nueva
    usuario.must_change_password = false
    persistir()
    return new HttpResponse(null, { status: 204 })
  }),

  // Responde igual exista o no el correo (RF29: no revelar si el correo existe).
  http.post(url(ENDPOINTS.passwordReset), async () => {
    await espera()
    return HttpResponse.json({ detail: 'Si el correo está registrado, recibirás un enlace.' }, { status: 202 })
  }),

  http.post(url(ENDPOINTS.passwordResetConfirm), async ({ request }) => {
    await espera()
    const { token, new_password: nueva } = await request.json()
    if (token !== TOKEN_RECUPERACION_VALIDO) return error(400, { token: ['El enlace no es válido o ya venció.'] })
    const invalida = mensajePassword(nueva)
    if (invalida) return error(400, invalida)
    return new HttpResponse(null, { status: 204 })
  }),

  // Solo demostración: alterna entre un Analista y un Administrador ficticios.
  http.post(url(ENDPOINTS.demoSwitchProfile), async ({ request }) => {
    const { rol } = await request.json() // código del backend
    const u = db.usuarios.find((x) => x.rol === rol && x.is_active && !x.must_change_password)
    if (!u) return error(404, { detail: 'No existe un perfil de demostración para ese rol.' })
    guardarSesion(u.id)
    return HttpResponse.json({ user: publico(u) })
  }),
]
