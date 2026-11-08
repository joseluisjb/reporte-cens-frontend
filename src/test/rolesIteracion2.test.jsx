// Guardas por rol de las pantallas de la Iteración 2 (base compartida): las pantallas 9 a 14 son del
// Analista de Cartera y las 15 y 16 del Administrador. El otro rol ve «Acceso restringido», también
// escribiendo la dirección o entrando por la opción bloqueada del menú.
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ADMIN, ANALISTA, renderApp } from './renderApp'

const DEL_ANALISTA = [
  ['/obligaciones', 'Obligaciones y Estados', 'Obligaciones y Estados'],
  ['/ciclo', 'Actualización Mensual', 'Actualización Mensual de Estados'],
  ['/refinanciaciones', 'Refinanciaciones', 'Refinanciaciones'],
  ['/reporte', 'Generar Reporte', 'Reporte a TransUnion'],
  ['/reclamos', 'Reclamos Habeas Data', 'Reclamos Habeas Data'],
  ['/novedades', 'Novedades Urgentes', 'Novedades Urgentes'],
]
const DEL_ADMIN = [
  ['/entidad', 'Datos de la Entidad', 'Datos de la Entidad ante TransUnion'],
  ['/homologacion-estados', 'Homologación de Estados', 'Homologación de Estados'],
]

const menu = () => within(screen.getByRole('navigation', { name: 'Navegación principal' }))

describe('pantallas del Analista de Cartera (9 a 14)', () => {
  test.each(DEL_ANALISTA)('el Analista abre %s', async (ruta, _seccion, titulo) => {
    renderApp(ruta, ANALISTA)
    expect(await screen.findByRole('heading', { name: titulo })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Acceso restringido' })).not.toBeInTheDocument()
  })

  test.each(DEL_ANALISTA)('el Administrador ve «Acceso restringido» en %s', async (ruta, seccion, titulo) => {
    renderApp(ruta, ADMIN)
    expect(await screen.findByRole('heading', { name: 'Acceso restringido' })).toBeInTheDocument()
    expect(screen.getByText(new RegExp(`«${seccion}» es exclusiva del rol Analista de Cartera`))).toBeInTheDocument()
    expect(screen.getByText('Administrador', { selector: 'b' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: titulo })).not.toBeInTheDocument()
  })
})

describe('pantallas del Administrador (15 y 16)', () => {
  test.each(DEL_ADMIN)('el Administrador abre %s', async (ruta, _seccion, titulo) => {
    renderApp(ruta, ADMIN)
    expect(await screen.findByRole('heading', { name: titulo })).toBeInTheDocument()
  })

  test.each(DEL_ADMIN)('el Analista ve «Acceso restringido» en %s', async (ruta, seccion) => {
    renderApp(ruta, ANALISTA)
    expect(await screen.findByRole('heading', { name: 'Acceso restringido' })).toBeInTheDocument()
    expect(screen.getByText(new RegExp(`«${seccion}» es exclusiva del rol Administrador`))).toBeInTheDocument()
  })
})

describe('opciones bloqueadas del menú', () => {
  test('el Administrador entra a una opción bloqueada y ve «Acceso restringido» sin perder el menú', async () => {
    renderApp('/panel', ADMIN)
    await screen.findByRole('heading', { name: 'Bienvenido, Rosa' })
    await userEvent.click(menu().getByRole('link', { name: /obligaciones y estados/i }))
    expect(await screen.findByRole('heading', { name: 'Acceso restringido' })).toBeInTheDocument()
    expect(menu().getByRole('link', { name: /obligaciones y estados/i })).toHaveAttribute('aria-current', 'page')
    await userEvent.click(screen.getByRole('link', { name: 'Volver al inicio' }))
    expect(await screen.findByRole('heading', { name: 'Bienvenido, Rosa' })).toBeInTheDocument()
  })

  test('el Analista entra a Datos de la Entidad desde el menú y ve «Acceso restringido»', async () => {
    renderApp('/panel', ANALISTA)
    await screen.findByRole('heading', { name: 'Bienvenido, Juan' })
    await userEvent.click(menu().getByRole('link', { name: /datos de la entidad/i }))
    expect(await screen.findByText(/«Datos de la Entidad» es exclusiva del rol Administrador/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /cambiar de perfil/i })).not.toBeInTheDocument() // solo en demostración
  })
})
