// Guardas por rol de las pantallas de la Iteración 2 (base compartida): las pantallas 9 a 14 son del
// Analista de Cartera y las 15 y 16 del Administrador. El otro rol no ve la opción en el menú
// y, escribiendo la dirección, vuelve al inicio.
import { screen, waitFor } from '@testing-library/react'
import { ADMIN, ANALISTA, renderApp, renderConSesion } from './renderApp'

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

describe('pantallas del Analista de Cartera (9 a 14)', () => {
  // Con sesión real en el mock: las pantallas ya construidas (la 9) piden datos al abrir.
  test.each(DEL_ANALISTA)('el Analista abre %s', async (ruta, _seccion, titulo) => {
    await renderConSesion(ruta, 'jperez@example.com', 'Analista123')
    expect(await screen.findByRole('heading', { name: titulo })).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('status', { name: /^Cargando/ })).not.toBeInTheDocument())
  })

  test.each(DEL_ANALISTA)('el Administrador que escribe %s vuelve al inicio', async (ruta, _seccion, titulo) => {
    renderApp(ruta, ADMIN)
    expect(await screen.findByRole('heading', { name: 'Bienvenido, Rosa' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: titulo })).not.toBeInTheDocument()
  })
})

describe('pantallas del Administrador (15 y 16)', () => {
  // Con sesión real en el mock: la pantalla 15 pide los datos de la entidad.
  test.each(DEL_ADMIN)('el Administrador abre %s', async (ruta, _seccion, titulo) => {
    await renderConSesion(ruta)
    expect(await screen.findByRole('heading', { name: titulo })).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('status', { name: /^Cargando/ })).not.toBeInTheDocument())
  })

  test.each(DEL_ADMIN)('el Analista que escribe %s vuelve al inicio', async (ruta, _seccion, titulo) => {
    renderApp(ruta, ANALISTA)
    expect(await screen.findByRole('heading', { name: 'Bienvenido, Juan' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: titulo })).not.toBeInTheDocument()
  })
})
