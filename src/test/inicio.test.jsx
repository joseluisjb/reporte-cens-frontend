// Inicio (RF27): la tarjeta "Usuarios activos" es solo del Administrador.
import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { login } from '../features/auth/authService'
import { setUserActive } from '../features/users/usersService'
import { API_URL } from '../lib/config'
import { ENDPOINTS } from '../lib/api/endpoints'
import { server } from '../mocks/server'
import { ADMIN, renderApp, renderConSesion } from './renderApp'

const bienvenida = (nombre) => screen.findByRole('heading', { name: `Bienvenido, ${nombre}` })
const tarjeta = () => screen.queryByRole('region', { name: 'Usuarios activos' })

describe('tarjeta "Usuarios activos"', () => {
  test('el Administrador ve los usuarios activos', async () => {
    await renderConSesion('/panel')
    const region = await screen.findByRole('region', { name: 'Usuarios activos' })
    expect(await within(region).findByText('6')).toBeInTheDocument() // 7 usuarios, 1 inactivo
    expect(within(region).getByRole('link', { name: 'Ver usuarios' })).toHaveAttribute('href', '/usuarios')
  })

  test('baja cuando se desactiva un usuario', async () => {
    await login('rmartinez@example.com', 'Admin12345')
    await setUserActive(6, false)
    renderApp('/panel', null)
    const region = await screen.findByRole('region', { name: 'Usuarios activos' })
    expect(await within(region).findByText('5')).toBeInTheDocument()
  })

  test('el Analista no ve la tarjeta ni pide /users/', async () => {
    const rutas = []
    server.events.on('request:start', ({ request }) => rutas.push(new URL(request.url).pathname))
    try {
      await renderConSesion('/panel', 'jperez@example.com', 'Analista123')
      await bienvenida('Juan')
      await new Promise((r) => setTimeout(r, 50)) // margen para una petición que no debería salir
      expect(tarjeta()).not.toBeInTheDocument()
      expect(rutas).toContain(`${API_URL}${ENDPOINTS.login}`) // control: el escucha sí registra peticiones
      expect(rutas).not.toContain(`${API_URL}${ENDPOINTS.users}`)
    } finally {
      server.events.removeAllListeners('request:start')
    }
  })

  test('si falla muestra «No disponible» y no cierra la sesión', async () => {
    server.use(http.get(`${API_URL}${ENDPOINTS.users}`, () => HttpResponse.json({ detail: 'x' }, { status: 500 })))
    await renderConSesion('/panel')
    expect(await screen.findByText('No disponible')).toBeInTheDocument()
    expect(await bienvenida('Rosa')).toBeInTheDocument()
  })

  test('con un usuario inicial sin sesión en el servidor no expulsa al Administrador', async () => {
    renderApp('/panel', ADMIN) // el servidor simulado no tiene sesión: /users/ responde 401
    expect(await screen.findByText('No disponible')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Bienvenido, Rosa' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Iniciar sesión' })).not.toBeInTheDocument()
  })
})

describe('tarjeta "Última extracción de cartera"', () => {
  test('muestra la información del último corte y enlace a la extracción', async () => {
    await renderConSesion('/panel')
    const region = await screen.findByRole('region', { name: 'Última extracción de cartera' })
    expect(region).toBeInTheDocument()
    expect(await within(region).findByText('BORRADOR')).toBeInTheDocument()
    expect(within(region).getByText(/24 obligaciones/i)).toBeInTheDocument()
    expect(within(region).getByRole('link', { name: 'Ver extracción' })).toHaveAttribute('href', '/extraccion')
  })

  test('el Analista también ve la tarjeta de última extracción', async () => {
    await renderConSesion('/panel', 'jperez@example.com', 'Analista123')
    const region = await screen.findByRole('region', { name: 'Última extracción de cartera' })
    expect(region).toBeInTheDocument()
    expect(await within(region).findByText('BORRADOR')).toBeInTheDocument()
  })

  test('si no hay cortes registrados muestra mensaje explicativo', async () => {
    server.use(http.get(`${API_URL}${ENDPOINTS.extraccionUltima}`, () => new HttpResponse(null, { status: 204 })))
    await renderConSesion('/panel')
    const region = await screen.findByRole('region', { name: 'Última extracción de cartera' })
    expect(await within(region).findByText('Aún no se ha realizado ninguna extracción.')).toBeInTheDocument()
  })
})

