// Pantalla 11 · Refinanciaciones (RF18). Casos de «Listo cuando» de la ficha: la refinanciación inicial
// del mockup (2255-7788 → 2271-5502), el cierre en 07 desde Dudoso recaudo, el 409 de la matriz como
// aviso, el error de cuotas en el campo y el botón del detalle de la pantalla 9.
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { API_URL } from '../lib/config'
import { hoyISO } from '../lib/format'
import { db } from '../mocks/db'
import { server } from '../mocks/server'
import { renderConSesion } from './renderApp'

const ANALISTA = ['jperez@example.com', 'Analista123']
const TABLA = 'Refinanciaciones registradas'

const abrir = async (ruta = '/refinanciaciones') => {
  await renderConSesion(ruta, ...ANALISTA)
  await screen.findByRole('heading', { name: 'Refinanciaciones', level: 1 })
  await screen.findByRole('table', { name: TABLA })
}
const filas = () => within(screen.getByRole('table', { name: TABLA })).getAllByRole('row').slice(1)
const abrirModal = async () => {
  await userEvent.click(screen.getByRole('button', { name: 'Registrar refinanciación' }))
  const dialogo = await screen.findByRole('dialog', { name: 'Registrar refinanciación' })
  await within(dialogo).findByLabelText('Obligación original')
  return dialogo
}
const opcionDe = (dialogo, numero) => within(dialogo).getByRole('option', { name: new RegExp(`^${numero} · `) })
async function llenar(dialogo, { numero, naturaleza = '06', cuotas = '24', fecha }) {
  if (numero) await userEvent.selectOptions(within(dialogo).getByLabelText('Obligación original'), opcionDe(dialogo, numero))
  if (naturaleza) await userEvent.selectOptions(within(dialogo).getByLabelText(/Naturaleza de la reestructuración/), naturaleza)
  const campoCuotas = within(dialogo).getByLabelText('Número de cuotas de la nueva obligación')
  await userEvent.clear(campoCuotas)
  if (cuotas) await userEvent.type(campoCuotas, cuotas)
  if (fecha !== undefined) {
    const campoFecha = within(dialogo).getByLabelText('Fecha de la refinanciación')
    await userEvent.clear(campoFecha)
    if (fecha) await userEvent.type(campoFecha, fecha)
  }
}
const registrar = (dialogo) => userEvent.click(within(dialogo).getByRole('button', { name: 'Registrar refinanciación' }))

describe('pantalla 11 · lista', () => {
  test('explica el flujo en 3 pasos y lista 2255-7788 → 2271-5502 (RF18)', async () => {
    await abrir()
    expect(within(screen.getByRole('list', { name: 'Cómo funciona' })).getAllByRole('listitem').map((li) => li.querySelector('b').textContent)).toEqual([
      'Se detecta en el SAC',
      'Se cierra la obligación original',
      'Nace la nueva obligación',
    ])
    expect(filas()).toHaveLength(1)
    const [fila] = filas()
    expect(fila).toHaveTextContent('28/09/2026 15:20Juan PérezRefinanciada el 28/09/2026')
    expect(fila).toHaveTextContent('2255-7788Inversiones Pamplona S.A.S.02 · Saldadamodo de extinción 16 · Refinanciación')
    expect(fila).toHaveTextContent('$4.380.000')
    expect(fila).toHaveTextContent('2271-550201 · VigenteReestructurada (1)')
    expect(fila).toHaveTextContent('07 · Otrapor confirmar36 cuotas')
  })

  test('sin refinanciaciones muestra el estado vacío', async () => {
    db.refinanciaciones = []
    await renderConSesion('/refinanciaciones', ...ANALISTA)
    expect(await screen.findByText('Aún no hay refinanciaciones registradas.')).toBeInTheDocument()
  })

  test('muestra la carga y, si falla, el error con «Reintentar»', async () => {
    let fallar = true
    server.use(http.get(`${API_URL}/refinanciaciones/`, () => (fallar ? HttpResponse.json({ detail: 'x' }, { status: 503 }) : undefined)))
    await renderConSesion('/refinanciaciones', ...ANALISTA)
    expect(await screen.findByRole('status', { name: 'Cargando refinanciaciones' })).toBeInTheDocument()
    expect(await screen.findByText(/^No se pudieron cargar las refinanciaciones\./)).toBeInTheDocument()
    fallar = false
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('table', { name: TABLA })).toBeInTheDocument()
  })
})

describe('pantalla 11 · registro manual', () => {
  test('solo ofrece obligaciones abiertas y la naturaleza lleva «por confirmar» (Tabla 11)', async () => {
    await abrir()
    const dialogo = await abrirModal()
    const numeros = within(within(dialogo).getByLabelText('Obligación original')).getAllByRole('option').slice(1).map((o) => o.textContent.slice(0, 9))
    expect(numeros).not.toContain('2259-1092') // Saldada
    expect(numeros).not.toContain('2241-3302') // Castigada recuperada
    expect(numeros).toHaveLength(9)
    expect(within(dialogo).getByText(/Naturaleza de la reestructuración \(Tabla 11\)/)).toHaveTextContent('código por confirmar con CENS')
    expect(within(dialogo).getByLabelText('Fecha de la refinanciación')).toHaveValue(hoyISO())
  })

  test('la nota cambia con la obligación: Vigente → 02 y Dudoso recaudo → 07 por confirmar', async () => {
    await abrir()
    const dialogo = await abrirModal()
    expect(dialogo).toHaveTextContent('Elige la obligación original para ver cómo se cierra.')
    await llenar(dialogo, { numero: '2257-4156', naturaleza: '', cuotas: '' })
    expect(dialogo).toHaveTextContent('La obligación original pasa de 01 · Vigente a 02 · Saldada con modo de extinción 16 · Refinanciación')
    await userEvent.selectOptions(within(dialogo).getByLabelText('Obligación original'), opcionDe(dialogo, '2250-0987'))
    expect(dialogo).toHaveTextContent('pasa de 03 · Dudoso recaudo a 07 · Castigada recuperadapor confirmar con modo de extinción 16')
  })

  test('valida en el cliente: campos obligatorios y cuotas entre 1 y 120', async () => {
    const pedido = vi.fn()
    server.use(http.post(`${API_URL}/refinanciaciones/`, () => pedido()))
    await abrir()
    const dialogo = await abrirModal()
    await registrar(dialogo)
    expect(within(dialogo).getByText('Selecciona la obligación original.')).toBeInTheDocument()
    expect(within(dialogo).getByText('Selecciona la naturaleza de la reestructuración.')).toBeInTheDocument()
    expect(within(dialogo).getByText('Ingresa un número de cuotas entre 1 y 120.')).toBeInTheDocument()
    expect(within(dialogo).getByLabelText('Obligación original')).toHaveFocus()
    for (const cuotas of ['0', '121']) {
      await llenar(dialogo, { numero: '2257-4156', cuotas })
      await registrar(dialogo)
      expect(within(dialogo).getByText('Ingresa un número de cuotas entre 1 y 120.')).toBeInTheDocument()
    }
    expect(pedido).not.toHaveBeenCalled()
  })

  test('el error de campo del servidor (400) se muestra en el campo', async () => {
    server.use(http.post(`${API_URL}/refinanciaciones/`, () => HttpResponse.json({ numero_cuotas: ['Ingresa un número de cuotas entre 1 y 120.'] }, { status: 400 })))
    await abrir()
    const dialogo = await abrirModal()
    await llenar(dialogo, { numero: '2257-4156' })
    await registrar(dialogo)
    expect(await within(dialogo).findByText('Ingresa un número de cuotas entre 1 y 120.')).toBeInTheDocument()
    expect(within(dialogo).getByLabelText('Número de cuotas de la nueva obligación')).toHaveAttribute('aria-invalid', 'true')
  })

  test('Dudoso recaudo → 07 con modo 16 y nace la nueva reestructurada (RF18)', async () => {
    await abrir()
    const dialogo = await abrirModal()
    await llenar(dialogo, { numero: '2250-0987', naturaleza: '06', cuotas: '24' })
    await registrar(dialogo)
    expect(await screen.findByText(/Refinanciación registrada: 2250-0987 pasa a 07 · Castigada recuperada y nace 2272-6101 en Vigente \(01\)\./)).toBeInTheDocument()
    await waitFor(() => expect(filas()).toHaveLength(2))
    const [nueva] = filas()
    expect(nueva).toHaveTextContent('2250-0987Hotel Mirador Cúcuta07 · Castigada recuperadamodo de extinción 16 · Refinanciación')
    expect(nueva).toHaveTextContent('$5.420.000')
    expect(nueva).toHaveTextContent('2272-610101 · VigenteReestructurada (1)')
    expect(nueva).toHaveTextContent('06 · Ordinariapor confirmar24 cuotas')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    // La original queda cerrada con su vínculo y la nueva en primer reporte.
    const original = db.obligaciones.find((o) => o.numero === '2250-0987')
    expect(original).toMatchObject({ estado: '07', saldo: 0, refinanciada_en: { numero_obligacion: '2272-6101' } })
    expect(original.cierre).toMatchObject({ modo_extincion: { codigo: '16' }, tipo_pago: { codigo: '02' } })
    expect(db.obligaciones.find((o) => o.numero === '2272-6101')).toMatchObject({ estado: '01', primer_reporte: true, saldo: 5420000, cuota: 226000 })
  })

  test('si la matriz no permite cerrar la original (04), el 409 se muestra como aviso', async () => {
    db.obligaciones.find((o) => o.numero === '2261-8820').estado = '04'
    await abrir()
    const dialogo = await abrirModal()
    await llenar(dialogo, { numero: '2261-8820' })
    await registrar(dialogo)
    expect(await within(dialogo).findByText(/TransUnion no acepta pasar de 04 · Suspendida por la entidad a 02 · Saldada \(error 713\)/)).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Registrar refinanciación' })).toBeInTheDocument()
    // Al elegir otra obligación, el aviso se quita.
    await userEvent.selectOptions(within(dialogo).getByLabelText('Obligación original'), opcionDe(dialogo, '2257-4156'))
    expect(within(dialogo).queryByText(/error 713/)).not.toBeInTheDocument()
  })

  test('si no cargan las opciones lo dice y se puede reintentar', async () => {
    let fallar = true
    server.use(http.get(`${API_URL}/catalogos/naturalezas-reestructuracion/`, () => (fallar ? HttpResponse.json({ detail: 'x' }, { status: 503 }) : undefined)))
    await abrir()
    await userEvent.click(screen.getByRole('button', { name: 'Registrar refinanciación' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Registrar refinanciación' })
    expect(await within(dialogo).findByText(/^No se pudieron cargar las opciones\./)).toBeInTheDocument()
    expect(within(dialogo).getByRole('button', { name: 'Registrar refinanciación' })).toBeDisabled()
    fallar = false
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Reintentar' }))
    expect(await within(dialogo).findByLabelText('Obligación original')).toBeInTheDocument()
  })
})

describe('pantalla 11 · desde el detalle de la pantalla 9', () => {
  test('el botón abre el registro con la obligación ya elegida', async () => {
    await renderConSesion('/obligaciones?obligacion=2', ...ANALISTA)
    const panel = await screen.findByRole('dialog', { name: 'Obligación 2258-7731' })
    await userEvent.click(within(panel).getByRole('link', { name: 'Registrar refinanciación' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Registrar refinanciación' })
    expect(await within(dialogo).findByLabelText('Obligación original')).toHaveValue('2')
    expect(dialogo).toHaveTextContent('La obligación original pasa de 01 · Vigente a 02 · Saldada')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  test('el botón no sale en obligaciones cerradas ni eliminadas', async () => {
    db.obligaciones.find((o) => o.numero === '2261-8820').eliminada = true
    await renderConSesion('/obligaciones?obligacion=3', ...ANALISTA)
    const cerrada = await screen.findByRole('dialog', { name: 'Obligación 2259-1092' })
    expect(within(cerrada).queryByRole('link', { name: 'Registrar refinanciación' })).not.toBeInTheDocument()
    await userEvent.click(within(cerrada).getByRole('button', { name: 'Cerrar' }))
    await userEvent.click(await screen.findByRole('button', { name: /Eliminadas/ }))
    await userEvent.click(await screen.findByRole('button', { name: 'Ver el detalle de la obligación 2261-8820' }))
    const eliminada = await screen.findByRole('dialog', { name: 'Obligación 2261-8820' })
    expect(within(eliminada).queryByRole('link', { name: 'Registrar refinanciación' })).not.toBeInTheDocument()
  })
})
