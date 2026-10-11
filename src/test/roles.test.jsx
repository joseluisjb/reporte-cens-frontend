import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'
import { ADMIN, ANALISTA, renderApp, renderConSesion } from './renderApp'

const menu = () => screen.queryByRole('navigation', { name: 'Navegación principal' })

describe('un Analista no abre las pantallas de administración, ni escribiendo la dirección', () => {
  test.each([
    ['/usuarios', 'Gestión de Usuarios', 'Usuarios del Sistema'],
    ['/auditoria', 'Auditoría', 'Log de Auditoría del Sistema'],
    ['/parametrizacion', 'Parametrización de Conceptos', 'Códigos de Concepto de Energía'],
  ])('%s muestra "Acceso restringido" y no la pantalla', async (ruta, seccion, tituloDePantalla) => {
    renderApp(ruta, ANALISTA)
    expect(await screen.findByRole('heading', { name: 'Acceso restringido' })).toBeInTheDocument()
    expect(screen.getByText(new RegExp(`«${seccion}» es exclusiva del rol Administrador`))).toBeInTheDocument()
    expect(screen.getByText('Analista de Cartera', { selector: 'b' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: tituloDePantalla })).not.toBeInTheDocument()
    expect(document.title).toBe('NexoVolt — Acceso restringido')
  })

  test('la pantalla restringida conserva el menú y permite volver al inicio', async () => {
    renderApp('/usuarios', ANALISTA)
    await screen.findByRole('heading', { name: 'Acceso restringido' })
    expect(within(menu()).queryByRole('link', { name: /usuarios/i })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Volver al inicio' }))
    expect(await screen.findByRole('heading', { name: 'Bienvenido, Juan' })).toBeInTheDocument()
  })

  test('las pantallas permitidas siguen abriendo', async () => {
    await renderConSesion('/extraccion', 'jperez@cens.com.co', 'Analista123')
    expect(await screen.findByRole('heading', { name: 'Extracción y Consolidación de Cartera' })).toBeInTheDocument()
    await screen.findByText('TITULAR FICTICIO 01')
  })

  test('no ofrece "Cambiar de perfil" fuera del modo demostración', async () => {
    renderApp('/usuarios', ANALISTA)
    await screen.findByRole('heading', { name: 'Acceso restringido' })
    expect(screen.queryByRole('button', { name: /cambiar de perfil/i })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /juan pérez/i }))
    expect(screen.queryByRole('menuitem', { name: /cambiar de perfil/i })).not.toBeInTheDocument()
  })
})

describe('el Administrador abre todo', () => {
  test.each([
    ['/usuarios', 'Usuarios del Sistema'],
    ['/auditoria', 'Log de Auditoría del Sistema'],
    ['/parametrizacion', 'Códigos de Concepto de Energía'],
  ])('%s', async (ruta, titulo) => {
    await renderConSesion(ruta)
    expect(await screen.findByRole('heading', { name: titulo })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Acceso restringido' })).not.toBeInTheDocument()
    if (ruta === '/usuarios') await screen.findByText('Juan Pérez') // deja terminar la carga de la lista
    if (ruta === '/parametrizacion') await screen.findByText('CUOTA FINANCIACION ENERGIA')
  })
})

describe('un 403 del backend', () => {
  test('se avisa con un mensaje en español', async () => {
    const { api } = await import('../lib/api')
    renderApp('/panel', ADMIN)
    await screen.findByRole('heading', { name: 'Bienvenido, Rosa' })
    server.use(http.get('/api/algo/', () => HttpResponse.json({ detail: 'You do not have permission to perform this action.' }, { status: 403 })))
    await api.get('/algo/').catch(() => {})
    expect(await screen.findByText('No tienes permiso para realizar esta acción.')).toBeInTheDocument()
  })
})
