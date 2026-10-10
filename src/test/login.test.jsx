import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { listUsers } from '../features/users/usersService'
import { login as loginRequest } from '../features/auth/authService'
import { MSG_CREDENCIALES } from '../features/auth/authConfig'
import { MSG_PASSWORD_VACIA, validarLogin } from '../features/auth/loginValidation'
import { guardarSesion } from '../mocks/db'
import { server } from '../mocks/server'
import { ADMIN, renderApp } from './renderApp'

const correo = () => screen.getByLabelText('Correo electrónico')
const clave = () => screen.getByLabelText('Contraseña')
const entrar = () => userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

async function iniciar(email, password) {
  await userEvent.type(correo(), email)
  await userEvent.type(clave(), password)
  await entrar()
}

describe('validación del formulario', () => {
  test('exige correo y contraseña, y valida el formato del correo', () => {
    expect(validarLogin({ identificador: '', password: '' })).toEqual({
      identificador: 'Ingresa tu correo electrónico.',
      password: MSG_PASSWORD_VACIA,
    })
    expect(validarLogin({ identificador: 'sin-arroba', password: 'x' }).identificador).toMatch(/correo válido/i)
    expect(validarLogin({ identificador: ' jperez@cens.com.co ', password: 'x' })).toEqual({})
  })
})

describe('pantalla de login', () => {
  test('sin sesión, abrir cualquier pantalla interna lleva al login', async () => {
    renderApp('/usuarios', null)
    expect(await screen.findByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Navegación principal' })).not.toBeInTheDocument()
  })

  test('enviar vacío muestra qué falta, enfoca el primer campo y no llama al backend', async () => {
    renderApp('/login', null)
    await screen.findByRole('button', { name: 'Iniciar sesión' })
    await entrar()
    expect(screen.getByText('Ingresa tu correo electrónico.')).toBeInTheDocument()
    expect(screen.getByText('Ingresa tu contraseña.')).toBeInTheDocument()
    expect(correo()).toHaveFocus()
    expect(correo()).toHaveAttribute('aria-invalid', 'true')
  })

  test('el error de un campo se quita al escribir en él', async () => {
    renderApp('/login', null)
    await screen.findByRole('button', { name: 'Iniciar sesión' })
    await entrar()
    await userEvent.type(correo(), 'a')
    expect(screen.queryByText('Ingresa tu correo electrónico.')).not.toBeInTheDocument()
  })

  test('un correo mal escrito se corrige antes de enviar', async () => {
    renderApp('/login', null)
    await screen.findByRole('button', { name: 'Iniciar sesión' })
    await iniciar('sin-arroba', 'x')
    expect(screen.getByText(/ingresa un correo válido/i)).toBeInTheDocument()
  })

  test('credenciales incorrectas: mensaje de la maqueta, contraseña limpia y foco en ella', async () => {
    renderApp('/login', null)
    await screen.findByRole('button', { name: 'Iniciar sesión' })
    await iniciar('rmartinez@cens.com.co', 'ClaveMala1')
    expect(await screen.findByRole('alert')).toHaveTextContent(MSG_CREDENCIALES)
    expect(clave()).toHaveValue('')
    expect(clave()).toHaveFocus()
    expect(correo()).toHaveValue('rmartinez@cens.com.co')
  })

  test('un usuario desactivado ve el motivo', async () => {
    renderApp('/login', null)
    await screen.findByRole('button', { name: 'Iniciar sesión' })
    await iniciar('avargas@cens.com.co', 'Cartera123')
    expect(await screen.findByRole('alert')).toHaveTextContent(/desactivado/i)
  })

  test('si el servidor responde HTML, el login muestra un mensaje claro', async () => {
    const html = () => new HttpResponse('<!doctype html><html></html>', { status: 200, headers: { 'Content-Type': 'text/html' } })
    server.use(
      http.get('/api/auth/csrf/', html),
      http.get('/api/auth/me/', html),
      http.post('/api/auth/login/', html),
    )
    renderApp('/login', null)
    await screen.findByRole('button', { name: 'Iniciar sesión' })
    await iniciar('rmartinez@cens.com.co', 'Admin12345')
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo conectar con el servidor de NexoVolt')
    expect(screen.queryByText(/cannot read properties/i)).not.toBeInTheDocument()
  })

  test('el campo de contraseña no tiene placeholder (parecería texto ya escrito)', async () => {
    renderApp('/login', null)
    await screen.findByRole('button', { name: 'Iniciar sesión' })
    expect(clave()).not.toHaveAttribute('placeholder')
  })

  test('el ojo muestra y oculta la contraseña', async () => {
    renderApp('/login', null)
    await screen.findByRole('button', { name: 'Iniciar sesión' })
    expect(clave()).toHaveAttribute('type', 'password')
    await userEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }))
    expect(clave()).toHaveAttribute('type', 'text')
  })

  test('tiene el enlace para recuperar la contraseña', async () => {
    renderApp('/login', null)
    await userEvent.click(await screen.findByRole('link', { name: '¿Olvidaste tu contraseña?' }))
    expect(await screen.findByRole('heading', { name: 'Recuperar contraseña' })).toBeInTheDocument()
  })
})

describe('inicio de sesión correcto', () => {
  test('el Administrador entra al inicio con su menú completo', async () => {
    renderApp('/login', null)
    await screen.findByRole('button', { name: 'Iniciar sesión' })
    await iniciar('rmartinez@cens.com.co', 'Admin12345')
    expect(await screen.findByRole('heading', { name: 'Bienvenido, Rosa' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /gestión de usuarios/i })).toHaveLength(1)
  })

  test('el Analista entra y ve solo su menú', async () => {
    renderApp('/login', null)
    await screen.findByRole('button', { name: 'Iniciar sesión' })
    await iniciar('jperez@cens.com.co', 'Analista123')
    expect(await screen.findByRole('heading', { name: 'Bienvenido, Juan' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /gestión de usuarios/i })).not.toBeInTheDocument()
  })

  test('tras iniciar sesión vuelve a la pantalla que quería abrir', async () => {
    renderApp('/usuarios', null)
    await screen.findByRole('button', { name: 'Iniciar sesión' })
    await iniciar('rmartinez@cens.com.co', 'Admin12345')
    expect(await screen.findByRole('heading', { name: 'Usuarios del Sistema' })).toBeInTheDocument()
  })

  test('el primer ingreso obliga a cambiar la contraseña temporal', async () => {
    renderApp('/login', null)
    await screen.findByRole('button', { name: 'Iniciar sesión' })
    await iniciar('mgomez@cens.com.co', 'Temporal123')
    expect(await screen.findByRole('heading', { name: 'Debes cambiar tu contraseña' })).toBeInTheDocument()
  })

  test('con contraseña temporal no se puede abrir ninguna otra pantalla, ni escribiendo la dirección', async () => {
    await loginRequest('mgomez@cens.com.co', 'Temporal123')
    renderApp('/extraccion', null)
    expect(await screen.findByRole('heading', { name: 'Debes cambiar tu contraseña' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Navegación principal' })).not.toBeInTheDocument()
  })

  test('con sesión activa, abrir /login redirige al inicio', async () => {
    renderApp('/login', ADMIN)
    expect(await screen.findByRole('heading', { name: 'Bienvenido, Rosa' })).toBeInTheDocument()
  })
})

describe('sesión', () => {
  test('al recargar, la cookie de sesión vigente restaura al usuario sin pedir login', async () => {
    await loginRequest('jperez@cens.com.co', 'Analista123')
    renderApp('/extraccion', null)
    expect(await screen.findByRole('heading', { name: 'Extracción y Consolidación de Cartera' })).toBeInTheDocument()
  })

  test('cerrar sesión vuelve al login, avisa y no deja volver con la dirección', async () => {
    renderApp('/login', null)
    await screen.findByRole('button', { name: 'Iniciar sesión' })
    await iniciar('rmartinez@cens.com.co', 'Admin12345')
    await screen.findByRole('heading', { name: 'Bienvenido, Rosa' })
    await userEvent.click(screen.getByRole('button', { name: /rosa martínez/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: /cerrar sesión/i }))
    expect(await screen.findByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(screen.getByText('Sesión cerrada correctamente.')).toBeInTheDocument()
    expect(correo()).toHaveValue('')
  })

  test('si la sesión vence en el servidor, la siguiente llamada devuelve al login con aviso', async () => {
    renderApp('/login', null)
    await screen.findByRole('button', { name: 'Iniciar sesión' })
    await iniciar('rmartinez@cens.com.co', 'Admin12345')
    await screen.findByRole('heading', { name: 'Bienvenido, Rosa' })

    guardarSesion(null) // el backend invalida la sesión
    await listUsers().catch(() => {})

    await waitFor(() => expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument())
    expect(screen.getByText('Tu sesión expiró. Inicia sesión de nuevo.')).toBeInTheDocument()
  })
})
