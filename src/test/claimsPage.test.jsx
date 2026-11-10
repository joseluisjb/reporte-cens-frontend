// Pantalla 13 · Reclamos Habeas Data (RF23), contrato 0.9.4. Los 3 reclamos iniciales del mock:
// 2260-5543 en reclamo sin marcación generada, 2262-3318 en reclamo con marcación generada y
// 2241-3302 cerrado, pendiente de desmarcación.
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { API_URL } from '../lib/config'
import { db } from '../mocks/db'
import { server } from '../mocks/server'
import { ADMIN, renderApp, renderConSesion } from './renderApp'

const TABLA = 'Reclamos de Habeas Data registrados'

const abrir = async () => {
  await renderConSesion('/reclamos', 'jperez@example.com', 'Analista123')
  await screen.findByRole('heading', { name: 'Reclamos Habeas Data', level: 1 })
  await screen.findByRole('table', { name: TABLA })
}
const filaDe = (numero) => within(screen.getByRole('table', { name: TABLA })).getByText(numero).closest('tr')

const abrirRegistro = async () => {
  await userEvent.click(screen.getByRole('button', { name: 'Registrar reclamo' }))
  const modal = screen.getByRole('dialog', { name: 'Registrar reclamo' })
  await within(modal).findByRole('option', { name: /^2258-7731 · / })
  return modal
}
async function llenarRegistro(modal, { numero = '2258-7731', tipologia = '02', fecha, observacion } = {}) {
  await userEvent.selectOptions(within(modal).getByLabelText('Obligación'), within(modal).getByRole('option', { name: new RegExp(`^${numero} · `) }))
  await userEvent.selectOptions(within(modal).getByLabelText(/Tipología del reclamo/), tipologia)
  if (fecha !== undefined) {
    const campo = within(modal).getByLabelText('Fecha del reclamo')
    await userEvent.clear(campo)
    await userEvent.type(campo, fecha)
  }
  if (observacion) await userEvent.type(within(modal).getByLabelText(/Observación/), observacion)
  await userEvent.click(within(modal).getByRole('button', { name: 'Registrar reclamo' }))
}

describe('pantalla 13 · lista', () => {
  test('tarjetas, botones con su contador, aviso y la tabla con las columnas del mockup', async () => {
    await abrir()
    expect(screen.getByRole('button', { name: 'Archivo de marcación (1)' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Archivo de desmarcación (1)' })).toBeEnabled()
    expect(screen.getByText('Obligaciones en reclamo').previousSibling).toHaveTextContent('2')
    expect(screen.getByText(/Una obligación en reclamo/)).toHaveTextContent('se sigue reportando')
    const tabla = screen.getByRole('table', { name: TABLA })
    expect(within(tabla).getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Obligación', 'Tipología y observación', 'Fecha del reclamo', 'Estado', 'Archivo', 'Acciones'])
    expect(filaDe('2260-5543')).toHaveTextContent('Pendiente de marcación')
    expect(filaDe('2262-3318')).toHaveTextContent('Marcación generada')
    expect(filaDe('2241-3302')).toHaveTextContent('CerradoProcedente · 20/09/2026')
    expect(filaDe('2241-3302')).toHaveTextContent('Pendiente de desmarcación')
  })

  test('la tipología del catálogo sin confirmar lleva «por confirmar»', async () => {
    await abrir()
    expect(filaDe('2260-5543')).toHaveTextContent('Pago no reflejadopor confirmar')
  })

  test('sin reclamos muestra el estado vacío', async () => {
    db.reclamos = []
    await renderConSesion('/reclamos', 'jperez@example.com', 'Analista123')
    expect(await screen.findByText('No hay reclamos registrados.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Archivo de marcación (0)' })).toBeDisabled()
  })

  test('si falla la carga muestra el error y «Reintentar» vuelve a pedirla', async () => {
    let fallar = true
    server.use(http.get(`${API_URL}/reclamos/`, () => (fallar ? HttpResponse.json({ detail: 'Servicio no disponible.' }, { status: 503 }) : undefined)))
    await renderConSesion('/reclamos', 'jperez@example.com', 'Analista123')
    expect(await screen.findByText(/^No se pudieron cargar los reclamos\. /)).toBeInTheDocument()
    fallar = false
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('table', { name: TABLA })).toBeInTheDocument()
  })

  test('el Administrador ve «Acceso restringido» en /reclamos', async () => {
    renderApp('/reclamos', ADMIN)
    expect(await screen.findByRole('heading', { name: 'Acceso restringido' })).toBeInTheDocument()
    expect(screen.getByText(/exclusiva del rol Analista de Cartera/i)).toBeInTheDocument()
  })
})

describe('pantalla 13 · registrar un reclamo', () => {
  test('«Pago no reflejado» sobre 2258-7731: queda en reclamo con su número y titular, y sigue reportándose', async () => {
    await abrir()
    const modal = await abrirRegistro()
    await llenarRegistro(modal, { observacion: 'Comprobante de pago 98765 del 12/09' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    const fila = filaDe('2258-7731')
    expect(fila).toHaveTextContent('María Fernanda Ortiz')
    expect(fila).toHaveTextContent('Pago no reflejado')
    expect(fila).toHaveTextContent('Comprobante de pago 98765 del 12/09')
    expect(fila).toHaveTextContent('En reclamo')
    expect(fila).toHaveTextContent('Pendiente de marcación')
    expect(screen.getByRole('button', { name: 'Archivo de marcación (2)' })).toBeEnabled()
    expect(screen.getByText('Reclamo registrado: queda pendiente el archivo de marcación.')).toBeInTheDocument()
    // La obligación queda marcada en reclamo para las pantallas 9 y 4; no sale del reporte.
    const obligacion = db.obligaciones.find((o) => o.numero === '2258-7731')
    expect(obligacion).toMatchObject({ en_reclamo: true, eliminada: false })
  })

  test('no ofrece obligaciones que ya tienen un reclamo abierto ni eliminadas', async () => {
    await abrir()
    const modal = await abrirRegistro()
    const opciones = within(modal).getAllByRole('option').map((o) => o.textContent)
    expect(opciones.some((t) => t.startsWith('2260-5543'))).toBe(false)
    expect(opciones.some((t) => t.startsWith('2262-3318'))).toBe(false)
  })

  test('si otro usuario la reclamó mientras tanto, muestra el 409 del servidor y no cierra el registro', async () => {
    server.use(http.post(`${API_URL}/reclamos/`, () => HttpResponse.json({ detail: 'La obligación 2258-7731 ya tiene un reclamo abierto.' }, { status: 409 })))
    await abrir()
    const modal = await abrirRegistro()
    await llenarRegistro(modal)
    expect(await within(modal).findByText('La obligación 2258-7731 ya tiene un reclamo abierto.')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Registrar reclamo' })).toBeInTheDocument()
  })

  test('una tipología que el servidor rechaza (400) se muestra en su campo', async () => {
    server.use(http.post(`${API_URL}/reclamos/`, () => HttpResponse.json({ tipologia: ['Selecciona una tipología válida de la Ley 1266.'] }, { status: 400 })))
    await abrir()
    const modal = await abrirRegistro()
    await llenarRegistro(modal, { tipologia: '01' })
    expect(await within(modal).findByText('Selecciona una tipología válida de la Ley 1266.')).toBeInTheDocument()
    expect(within(modal).getByLabelText(/Tipología del reclamo/)).toHaveAttribute('aria-invalid', 'true')
  })

  test('una fecha futura se rechaza en el cliente, sin llamar al servidor', async () => {
    const pedido = vi.fn()
    server.use(http.post(`${API_URL}/reclamos/`, () => pedido()))
    await abrir()
    const modal = await abrirRegistro()
    await llenarRegistro(modal, { fecha: '2999-01-01' })
    expect(within(modal).getByText('La fecha de radicación no puede ser futura.')).toBeInTheDocument()
    expect(pedido).not.toHaveBeenCalled()
  })

  test('la tipología lleva «por confirmar» mientras CENS no apruebe la lista', async () => {
    await abrir()
    const modal = await abrirRegistro()
    expect(within(modal).getByText('Tipología del reclamo').parentElement).toHaveTextContent('por confirmar')
  })

  test('si no cargan las obligaciones lo dice y «Reintentar» las vuelve a pedir', async () => {
    let fallar = true
    server.use(http.get(`${API_URL}/obligaciones/`, () => (fallar ? HttpResponse.json({ detail: 'Servicio no disponible.' }, { status: 503 }) : undefined)))
    await abrir()
    await userEvent.click(screen.getByRole('button', { name: 'Registrar reclamo' }))
    const modal = screen.getByRole('dialog', { name: 'Registrar reclamo' })
    expect(await within(modal).findByText(/No se pudieron cargar las obligaciones y las tipologías/)).toBeInTheDocument()
    expect(within(modal).getByRole('button', { name: 'Registrar reclamo' })).toBeDisabled()
    fallar = false
    await userEvent.click(within(modal).getByRole('button', { name: 'Reintentar' }))
    expect(await within(modal).findByRole('option', { name: /^2258-7731 · María Fernanda Ortiz$/ })).toBeInTheDocument()
  })
})

describe('pantalla 13 · cerrar un reclamo', () => {
  const abrirCierre = async (numero) => {
    await userEvent.click(within(filaDe(numero)).getByRole('button', { name: 'Cerrar reclamo' }))
    return screen.getByRole('dialog', { name: 'Cerrar reclamo' })
  }
  async function llenarCierre(modal, fecha) {
    await userEvent.selectOptions(within(modal).getByLabelText('Resultado del reclamo'), 'Procedente')
    const campo = within(modal).getByLabelText('Fecha de cierre')
    await userEvent.clear(campo)
    await userEvent.type(campo, fecha)
    await userEvent.click(within(modal).getByRole('button', { name: 'Cerrar reclamo' }))
  }

  test('una fecha anterior a la radicación se rechaza en el campo', async () => {
    await abrir()
    const modal = await abrirCierre('2260-5543') // radicado el 22/09/2026
    await llenarCierre(modal, '2026-09-10')
    expect(within(modal).getByText('La fecha de cierre no puede ser anterior a la de radicación.')).toBeInTheDocument()
    expect(within(modal).getByLabelText('Fecha de cierre')).toHaveAttribute('aria-invalid', 'true')
  })

  test('al cerrarlo queda pendiente de desmarcación y la obligación deja de estar en reclamo', async () => {
    await abrir()
    const modal = await abrirCierre('2260-5543')
    await llenarCierre(modal, '2026-10-01')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(filaDe('2260-5543')).toHaveTextContent('CerradoProcedente · 01/10/2026')
    expect(filaDe('2260-5543')).toHaveTextContent('Pendiente de desmarcación')
    expect(screen.getByRole('button', { name: 'Archivo de desmarcación (2)' })).toBeEnabled()
    expect(screen.getByText('Reclamo cerrado: queda pendiente el archivo de desmarcación.')).toBeInTheDocument()
    expect(db.obligaciones.find((o) => o.numero === '2260-5543').en_reclamo).toBe(false)
  })
})

describe('pantalla 13 · insumo del Reclamos Batch (Manual, p. 57)', () => {
  let guardado, click
  beforeEach(() => {
    guardado = vi.fn(() => 'blob:insumo')
    // jsdom no trae createObjectURL: se usa una subclase de URL que sí lo tiene, sin tocar la global.
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL = guardado
      static revokeObjectURL = vi.fn()
    })
    click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  test('marcación: incluye solo los reclamos sin marcación generada y deja el botón en 0', async () => {
    await abrir()
    await userEvent.click(screen.getByRole('button', { name: 'Archivo de marcación (1)' }))
    expect(await screen.findByText('Archivo de marcación generado con 1 reclamo.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Archivo de marcación (0)' })).toBeDisabled()
    expect(filaDe('2260-5543')).toHaveTextContent('Marcación generada')
    expect(click).toHaveBeenCalled()
    const [archivo] = guardado.mock.calls[0]
    expect(await archivo.text()).toBe('2260-5543|02|20260922\r\n')
  })

  test('desmarcación: incluye los cerrados pendientes con su fecha de cierre', async () => {
    await abrir()
    await userEvent.click(screen.getByRole('button', { name: 'Archivo de desmarcación (1)' }))
    expect(await screen.findByText('Archivo de desmarcación generado con 1 reclamo.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Archivo de desmarcación (0)' })).toBeDisabled()
    expect(filaDe('2241-3302')).toHaveTextContent('Desmarcación generada')
    const [archivo] = guardado.mock.calls[0]
    expect(await archivo.text()).toBe('2241-3302|03|20260920\r\n')
  })

  test('si otro usuario cambió los reclamos (409), muestra el mensaje del servidor', async () => {
    server.use(http.get(`${API_URL}/reclamos/insumo/`, () => HttpResponse.json({ detail: 'El insumo cambió mientras se generaba. Intenta de nuevo.' }, { status: 409 })))
    await abrir()
    await userEvent.click(screen.getByRole('button', { name: 'Archivo de marcación (1)' }))
    expect(await screen.findByText('No se pudo generar el archivo. El insumo cambió mientras se generaba. Intenta de nuevo.')).toBeInTheDocument()
    expect(guardado).not.toHaveBeenCalled()
  })
})
