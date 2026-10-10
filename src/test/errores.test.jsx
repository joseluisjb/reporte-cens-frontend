// Rutas de error y casos límite de lo construido por Johan: el backend falla, está caído o responde raro.
import { renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { useAuth } from '../features/auth/authContext'
import { api, ApiError, resetCsrf } from '../lib/api'
import { toApiError } from '../lib/api/ApiError'
import { server } from '../mocks/server'
import { renderApp, renderConSesion } from './renderApp'

const caido = () => HttpResponse.text('boom', { status: 500 })
const MSG_500 = 'Ocurrió un error en el servidor. Intenta de nuevo más tarde.'
const escribir = (etiqueta, texto) => userEvent.type(screen.getByLabelText(etiqueta), texto)
const boton = (nombre) => screen.getByRole('button', { name: nombre })

describe('toApiError', () => {
  test('un ApiError pasa sin cambios', () => {
    const original = new ApiError('x', { status: 400 })
    expect(toApiError(original)).toBe(original)
  })

  test('non_field_errors se usa como mensaje general', () => {
    const e = toApiError({ response: { status: 400, data: { non_field_errors: ['No coinciden los datos.'] } } })
    expect(e.message).toBe('No coinciden los datos.')
    expect(e.fieldErrors).toEqual({})
  })

  test.each([
    [404, 'No se encontró lo que buscabas.'],
    [429, 'Demasiados intentos. Espera un momento e intenta de nuevo.'],
    [400, 'Los datos enviados no son válidos.'],
    [418, 'Los datos enviados no son válidos.'], // estado desconocido: mensaje general
  ])('un %s sin detalle da un mensaje en español', (status, mensaje) => {
    expect(toApiError({ response: { status, data: null } }).message).toBe(mensaje)
  })

  test('un cuerpo con listas de varios mensajes los une', () => {
    const e = toApiError({ response: { status: 400, data: { new_password: ['Muy corta.', 'Sin número.'] } } })
    expect(e.fieldErrors.new_password).toBe('Muy corta. Sin número.')
  })
})

describe('token CSRF', () => {
  test('si falla pedirlo, la siguiente petición lo intenta de nuevo', async () => {
    let intentos = 0
    server.use(
      http.get('/api/auth/csrf/', () => {
        intentos += 1
        return intentos === 1 ? caido() : new HttpResponse(null, { status: 204 })
      }),
      http.post('/api/prueba/', () => HttpResponse.json({ ok: true })),
    )
    resetCsrf()
    await expect(api.post('/prueba/', {})).rejects.toMatchObject({ status: 500 })
    await expect(api.post('/prueba/', {})).resolves.toBeTruthy()
    expect(intentos).toBe(2)
  })
})

describe('backend caído o con errores', () => {
  test('si /auth/me/ falla al abrir la app, se muestra el login y no una pantalla en blanco', async () => {
    server.use(http.get('/api/auth/me/', caido))
    renderApp('/usuarios', null)
    expect(await screen.findByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument()
  })

  test('el login con el servidor caído muestra el mensaje general, no "credenciales incorrectas"', async () => {
    server.use(http.post('/api/auth/login/', caido))
    renderApp('/login', null)
    await userEvent.type(await screen.findByLabelText('Correo electrónico'), 'rmartinez@cens.com.co')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'Admin12345')
    await userEvent.click(boton('Iniciar sesión'))
    expect(await screen.findByRole('alert')).toHaveTextContent(MSG_500)
  })

  test('sin conexión el login lo dice', async () => {
    server.use(http.post('/api/auth/login/', () => HttpResponse.error()))
    renderApp('/login', null)
    await userEvent.type(await screen.findByLabelText('Correo electrónico'), 'rmartinez@cens.com.co')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'Admin12345')
    await userEvent.click(boton('Iniciar sesión'))
    expect(await screen.findByRole('alert')).toHaveTextContent(/no se pudo conectar/i)
  })

  test('recuperar contraseña: un fallo del servidor se avisa y permite reintentar', async () => {
    server.use(http.post('/api/auth/password-reset/', caido))
    renderApp('/recuperar', null)
    await userEvent.type(await screen.findByLabelText('Correo electrónico corporativo'), 'a@cens.com.co')
    await userEvent.click(boton('Enviar enlace de recuperación'))
    expect(await screen.findByRole('alert')).toHaveTextContent(MSG_500)
    expect(boton('Enviar enlace de recuperación')).toBeEnabled()
  })

  test('cambio de contraseña: un fallo del servidor se avisa', async () => {
    server.use(http.post('/api/auth/change-password/', caido))
    await renderConSesion('/panel', 'mgomez@cens.com.co', 'Temporal123')
    await screen.findByRole('heading', { name: 'Debes cambiar tu contraseña' })
    await escribir('Contraseña temporal', 'Temporal123')
    await escribir('Nueva contraseña', 'Nueva12345')
    await escribir('Confirmar nueva contraseña', 'Nueva12345')
    await userEvent.click(boton('Guardar y continuar'))
    expect(await screen.findByRole('alert')).toHaveTextContent(MSG_500)
  })

  test('restablecer: errores del servidor en el campo y fallos generales', async () => {
    server.use(http.post('/api/auth/password-reset/confirm/', () => HttpResponse.json({ new_password: ['La contraseña es muy común.'] }, { status: 400 })))
    renderApp('/restablecer?token=t', null)
    await escribir('Nueva contraseña', 'Nueva12345')
    await escribir('Confirmar nueva contraseña', 'Nueva12345')
    await userEvent.click(boton('Guardar contraseña'))
    expect(await screen.findByText('La contraseña es muy común.')).toBeInTheDocument()
    expect(screen.getByLabelText('Nueva contraseña')).toHaveFocus()

    server.use(http.post('/api/auth/password-reset/confirm/', caido))
    await userEvent.click(boton('Guardar contraseña'))
    expect(await screen.findByRole('alert', {}, { timeout: 4000 })).toHaveTextContent(MSG_500)
  })

  test('crear usuario: un fallo general del servidor aparece en el panel', async () => {
    await renderConSesion('/usuarios')
    await screen.findByText('Juan Pérez')
    server.use(http.post('/api/users/', caido))
    await userEvent.click(boton('Crear usuario'))
    const panel = screen.getByRole('dialog', { name: 'Crear nuevo usuario' })
    await userEvent.type(screen.getByLabelText('Nombre completo'), 'Laura Díaz')
    await userEvent.type(screen.getByLabelText('Correo corporativo'), 'ldiaz@cens.com.co')
    await userEvent.click(panel.querySelector('button[type=submit]'))
    expect(await screen.findByRole('alert')).toHaveTextContent(MSG_500)
  })

  test('activar o desactivar con el servidor caído avisa con un toast y deja el estado igual', async () => {
    await renderConSesion('/usuarios')
    await screen.findByText('Juan Pérez')
    server.use(http.patch('/api/users/:id/', caido))
    await userEvent.click(screen.getByRole('switch', { name: 'Usuario Ana Lucía Vargas activo' }))
    expect(await screen.findByText(MSG_500)).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Usuario Ana Lucía Vargas activo' })).toHaveAttribute('aria-checked', 'false')
  })
})

describe('contraseña temporal devuelta por el backend (respaldo)', () => {
  // El backend real la envía por correo; estas pruebas simulan que algún día la devolviera.
  const devolverClave = () =>
    server.use(
      http.post('/api/users/', () =>
        HttpResponse.json(
          { user: { id: 99, nombre: 'Laura Díaz', email: 'ldiaz@cens.com.co', rol: 'ANALISTA_CARTERA', is_active: true, last_login: null, must_change_password: true }, temporary_password: 'Clave-Temp-01' },
          { status: 201 },
        ),
      ),
    )

  async function crearUsuario(usuario) {
    devolverClave()
    await renderConSesion('/usuarios')
    await screen.findByText('Juan Pérez')
    await usuario.click(boton('Crear usuario'))
    await usuario.type(screen.getByLabelText('Nombre completo'), 'Laura Díaz')
    await usuario.type(screen.getByLabelText('Correo corporativo'), 'ldiaz@cens.com.co')
    await usuario.click(screen.getByRole('dialog').querySelector('button[type=submit]'))
    return screen.findByRole('dialog', { name: 'Usuario creado' })
  }

  test('"Copiar contraseña" la copia al portapapeles y avisa', async () => {
    const usuario = userEvent.setup()
    await crearUsuario(usuario)
    await usuario.click(boton('Copiar contraseña'))
    expect(await screen.findByText('Contraseña copiada.')).toBeInTheDocument()
    expect(await navigator.clipboard.readText()).toBe('Clave-Temp-01')
  })

  test('si no se puede copiar lo dice', async () => {
    const usuario = userEvent.setup()
    await crearUsuario(usuario)
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(new Error('sin permiso'))
    await usuario.click(boton('Copiar contraseña'))
    expect(await screen.findByText(/no se pudo copiar/i)).toBeInTheDocument()
  })

  test('si el backend NO devuelve la contraseña (la envía por correo) lo avisa en vez de mostrarla', async () => {
    server.use(
      http.post('/api/users/', () =>
        HttpResponse.json({ user: { id: 99, nombre: 'Laura Díaz', email: 'ldiaz@cens.com.co', rol: 'ANALISTA_CARTERA', is_active: true, last_login: null, must_change_password: true } }, { status: 201 }),
      ),
    )
    await renderConSesion('/usuarios')
    await screen.findByText('Juan Pérez')
    await userEvent.click(boton('Crear usuario'))
    await userEvent.type(screen.getByLabelText('Nombre completo'), 'Laura Díaz')
    await userEvent.type(screen.getByLabelText('Correo corporativo'), 'ldiaz@cens.com.co')
    await userEvent.click(screen.getByRole('dialog').querySelector('button[type=submit]'))
    expect(await screen.findByText(/la contraseña temporal se envió a su correo/i)).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Usuario creado' })).not.toBeInTheDocument()
  })
})

describe('menú de perfil con teclado y ratón', () => {
  test('las flechas, Inicio y Fin mueven el foco dentro del menú', async () => {
    renderApp('/panel')
    await userEvent.click(await screen.findByRole('button', { name: /rosa martínez/i }))
    const item = screen.getByRole('menuitem', { name: /cerrar sesión/i })
    for (const tecla of ['{ArrowDown}', '{ArrowUp}', '{Home}', '{End}']) {
      await userEvent.keyboard(tecla)
      expect(item).toHaveFocus() // con un solo elemento el foco se queda y no se sale del menú
    }
  })

  test('un clic fuera del menú lo cierra', async () => {
    renderApp('/panel')
    await userEvent.click(await screen.findByRole('button', { name: /rosa martínez/i }))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('heading', { name: 'Bienvenido, Rosa' }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})

describe('useAuth', () => {
  test('fuera de <AuthProvider> lanza un error claro', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useAuth())).toThrow(/AuthProvider/)
    spy.mockRestore()
  })
})
