// Simula el backend Django según el contrato `docs/contrato/openapi.yaml` (0.2); rutas en lib/api/endpoints.js.
// Responde como lo haría DRF: errores en { detail } o { campo: ['mensaje'] }.
import { delay, http, HttpResponse } from 'msw'
import { reglasIncumplidas } from '../features/auth/authConfig'
import { CODIGOS_ROL } from '../features/auth/roles'
import { API_URL } from '../lib/config'
import { ENDPOINTS } from '../lib/api/endpoints'
import { CLAVE_TEMPORAL_MOCK, db, guardarSesion, persistir, publico, TOKEN_RECUPERACION_VALIDO, usuarioActual } from './db'

const url = (ruta) => `${API_URL}${ruta}`
const espera = () => delay(import.meta.env.MODE === 'test' ? 0 : 400)
const error = (status, cuerpo) => HttpResponse.json(cuerpo, { status })
const sinSesion = () => error(401, { detail: 'Authentication credentials were not provided.' })
const sinPermiso = () => error(403, { detail: 'You do not have permission to perform this action.' })
const MSG_ROL_INVALIDO = 'Selecciona un rol válido.'
const rolValido = (rol) => Object.values(CODIGOS_ROL).includes(rol)
const mensajePassword = (nueva) => {
  const faltan = reglasIncumplidas(nueva ?? '')
  return faltan.length ? { new_password: [`La contraseña debe cumplir: ${faltan.join('; ').toLowerCase()}.`] } : null
}

// Simula el correo saliente (en Django, el EmailBackend de consola): queda en db.correos y, fuera de
// las pruebas, se imprime en la consola del navegador.
function enviarCorreoSimulado({ para, asunto, cuerpo }) {
  db.correos.push({ para, asunto, cuerpo })
  if (import.meta.env.MODE !== 'test') console.info(`[Correo simulado] Para: ${para} · Asunto: ${asunto} · ${cuerpo}`)
}

// Devuelve { usuario } o { respuesta } con el error. exigeAdmin → 403 para el Analista.
function exigirSesion(exigeAdmin = false) {
  const usuario = usuarioActual()
  if (!usuario) return { respuesta: sinSesion() }
  if (exigeAdmin && usuario.rol !== CODIGOS_ROL.ADMIN) return { respuesta: sinPermiso() }
  return { usuario }
}

export const handlers = [
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

  http.get(url(ENDPOINTS.users), async () => {
    await espera()
    const { respuesta } = exigirSesion(true)
    return respuesta ?? HttpResponse.json(db.usuarios.map(publico))
  }),

  http.post(url(ENDPOINTS.users), async ({ request }) => {
    await espera()
    const { respuesta } = exigirSesion(true)
    if (respuesta) return respuesta
    const { nombre, email, rol } = await request.json()
    const errores = {}
    if (!nombre?.trim()) errores.nombre = ['Ingresa el nombre completo.']
    if (!email?.trim()) errores.email = ['Ingresa el correo corporativo.']
    else if (db.usuarios.some((u) => u.email.toLowerCase() === email.toLowerCase())) errores.email = ['Ya existe un usuario con ese correo.']
    if (!rolValido(rol)) errores.rol = [MSG_ROL_INVALIDO]
    if (Object.keys(errores).length) return error(400, errores)
    const u = { id: db.siguienteId++, nombre: nombre.trim(), email: email.trim(), rol, is_active: true, last_login: null, must_change_password: true, password: CLAVE_TEMPORAL_MOCK }
    db.usuarios.push(u)
    persistir()
    enviarCorreoSimulado({
      para: u.email,
      asunto: 'Tu cuenta en NexoVolt',
      cuerpo: `Hola ${u.nombre}, tu contraseña temporal es ${CLAVE_TEMPORAL_MOCK}. Deberás cambiarla en tu primer ingreso.`,
    })
    // La contraseña temporal va por correo: la API no la devuelve (contrato 0.2).
    return HttpResponse.json({ user: publico(u), temporary_password: null }, { status: 201 })
  }),

  http.patch(url('/users/:id/'), async ({ request, params }) => {
    await espera()
    const { usuario, respuesta } = exigirSesion(true)
    if (respuesta) return respuesta
    const u = db.usuarios.find((x) => x.id === Number(params.id))
    if (!u) return error(404, { detail: 'Not found.' })
    const cambios = await request.json()
    if (cambios.email && db.usuarios.some((x) => x.id !== u.id && x.email.toLowerCase() === cambios.email.toLowerCase())) {
      return error(400, { email: ['Ya existe un usuario con ese correo.'] })
    }
    if (cambios.rol !== undefined && !rolValido(cambios.rol)) return error(400, { rol: [MSG_ROL_INVALIDO] })
    // Reglas del servidor sobre el propio usuario (el formulario envía el mismo rol al editarse a sí mismo).
    if (u.id === usuario.id && cambios.is_active === false) return error(400, { is_active: ['No puedes desactivar tu propio usuario.'] })
    if (u.id === usuario.id && cambios.rol !== undefined && cambios.rol !== u.rol) return error(400, { rol: ['No puedes cambiar tu propio rol.'] })
    for (const campo of ['nombre', 'email', 'rol', 'is_active']) {
      if (cambios[campo] !== undefined) u[campo] = cambios[campo]
    }
    persistir()
    return HttpResponse.json(publico(u))
  }),
]
