// Panel principal (pantalla 4) con las tarjetas de HU-B y HU-C. «Listo cuando» de la ficha:
//   - el Analista ve «Estado de la cartera», «Último archivo para TransUnion», los tres indicadores y
//     el aviso de entidad con relleno; el Administrador no ve nada de HU-B ni HU-C (y no lo pide);
//   - cada tarjeta tiene estado de carga y de error.
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { login } from '../features/auth/authService'
import { getPanelSummary } from '../features/home/panelService'
import { API_URL } from '../lib/config'
import { db } from '../mocks/db'
import { server } from '../mocks/server'
import { renderConSesion } from './renderApp'

const ANALISTA = ['jperez@example.com', 'Analista123']
const abrirComoAnalista = async () => {
  await renderConSesion('/panel', ...ANALISTA)
  await screen.findByRole('heading', { name: 'Estado de la cartera' })
}

describe('panel del Analista', () => {
  test('muestra el estado de la cartera con su distribución por estado', async () => {
    await abrirComoAnalista()
    const tarjeta = screen.getByRole('region', { name: 'Estado de la cartera' })
    expect(tarjeta).toHaveTextContent('12 obligaciones (una por financiación) · Última actualización mensual: 30/09/2026')
    expect(within(tarjeta).getByRole('img')).toHaveAccessibleName(
      'Distribución de obligaciones por estado: 01 Vigente: 7, 03 Dudoso recaudo: 1, 06 Castigada: 1, 02 Saldada: 2, 07 Castigada recuperada: 1',
    )
    const leyenda = within(tarjeta).getByRole('list', { name: 'Obligaciones por estado' })
    expect(within(leyenda).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Vigente 7',
      'Dudoso recaudo 1',
      'Castigada 1',
      'Saldada 2',
      'Castigada recuperada 1',
    ])
    expect(within(tarjeta).getByRole('link', { name: 'Ir a Obligaciones y Estados' })).toHaveAttribute('href', '/obligaciones')
  })

  test('muestra el último archivo para TransUnion', async () => {
    await abrirComoAnalista()
    const tarjeta = screen.getByRole('region', { name: 'Último archivo para TransUnion' })
    expect(tarjeta).toHaveTextContent('Generado por Juan Pérez · SSRXXXXXX20260930 · No apto para envío')
    expect(tarjeta).toHaveTextContent('30 de septiembre de 2026')
    expect(tarjeta).toHaveTextContent('11')
    expect(tarjeta).toHaveTextContent('Reporte total (01)')
    expect(tarjeta).toHaveTextContent('$21.863.586')
    expect(within(tarjeta).getByRole('link', { name: 'Ir a Reporte a TransUnion' })).toHaveAttribute('href', '/reporte')
  })

  test('muestra los tres indicadores con su enlace', async () => {
    await abrirComoAnalista()
    expect(screen.getByRole('link', { name: /Obligaciones en reclamo\s*2/ })).toHaveAttribute('href', '/reclamos')
    expect(screen.getByRole('link', { name: /Novedades urgentes pendientes\s*2/ })).toHaveAttribute('href', '/novedades')
    expect(screen.getByRole('link', { name: /Obligaciones con 2 o más cuotas en mora\s*5/ })).toHaveAttribute('href', '/obligaciones?cuotas_mora_min=2')
  })

  test('avisa que la entidad tiene relleno; sin marcador no hay aviso', async () => {
    await abrirComoAnalista()
    expect(screen.getByText(/TransUnion aún no asigna los datos de la entidad/)).toHaveTextContent('no aptos para envío')
  })

  test('con los datos de la entidad completos no muestra el aviso', async () => {
    db.entidad = { ...db.entidad, tipo_entidad: '001', codigo_entidad: '123', codigo_sucursal: 'A1B2C3' }
    await abrirComoAnalista()
    expect(screen.queryByText(/TransUnion aún no asigna los datos de la entidad/)).not.toBeInTheDocument()
  })

  test('sin archivos generados lo dice', async () => {
    db.archivos = []
    await abrirComoAnalista()
    expect(screen.getByRole('region', { name: 'Último archivo para TransUnion' })).toHaveTextContent('Aún no se ha generado ningún archivo.')
  })

  test('muestra la carga y, si falla, el error con «Reintentar»', async () => {
    let fallar = true
    server.use(http.get(`${API_URL}/panel/resumen/`, () => (fallar ? HttpResponse.json({ detail: 'Servicio no disponible.' }, { status: 503 }) : undefined)))
    await renderConSesion('/panel', ...ANALISTA)
    expect(await screen.findByRole('status', { name: 'Cargando el estado de la cartera' })).toBeInTheDocument()
    expect(await screen.findByText(/No se pudo cargar el estado de la cartera/)).toBeInTheDocument()
    fallar = false
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('heading', { name: 'Estado de la cartera' })).toBeInTheDocument()
  })
})

describe('panel del Administrador', () => {
  test('no ve nada de HU-B ni de HU-C y no pide /panel/resumen/', async () => {
    let pedidos = 0
    server.use(
      http.get(`${API_URL}/panel/resumen/`, () => {
        pedidos++
        return undefined
      }),
    )
    await renderConSesion('/panel')
    await screen.findByRole('heading', { name: 'Bienvenido, Rosa' })
    await screen.findByText(/Corte al/) // espera a que termine la carga de la última extracción
    expect(screen.queryByRole('heading', { name: 'Estado de la cartera' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Último archivo para TransUnion' })).not.toBeInTheDocument()
    expect(screen.queryByText('Obligaciones en reclamo')).not.toBeInTheDocument()
    expect(pedidos).toBe(0)
  })

  test('si lo pidiera, el backend le respondería 403 en español', async () => {
    await login('rmartinez@example.com', 'Admin12345')
    await expect(getPanelSummary()).rejects.toMatchObject({ status: 403, message: 'No tienes permiso para realizar esta acción.' })
  })
})
