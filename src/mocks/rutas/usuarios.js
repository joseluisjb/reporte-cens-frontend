// Rutas de gestión de usuarios (solo Administrador) del backend simulado.
import { http, HttpResponse } from 'msw'
import { CODIGOS_ROL } from '../../features/auth/roles'
import { ENDPOINTS } from '../../lib/api/endpoints'
import { CLAVE_TEMPORAL_MOCK, db, persistir, publico } from '../db'
import { enviarCorreoSimulado, error, espera, exigirSesion, url } from '../utilidades'

const MSG_ROL_INVALIDO = 'Selecciona un rol válido.'
const rolValido = (rol) => Object.values(CODIGOS_ROL).includes(rol)

export const usuariosHandlers = [
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
