// Pantalla 10 · Actualización Mensual de Estados (RF10–RF17, RF19, RF45–RF49). El resultado del corte
// 2026-10-31 es la foto del mockup (mocks/datos/ciclos.js); los rechazos 713 y 881 y las revisiones
// de RF10 y RF11 salen del escenario `cicloConRechazosYRevisiones`.
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { API_URL } from '../lib/config'
import { server } from '../mocks/server'
import { cicloConRechazosYRevisiones, corteDeOctubreEnBorrador } from './escenarios/ciclo'
import { renderConSesion } from './renderApp'

const ANALISTA = ['jperez@example.com', 'Analista123']

const abrir = async () => {
  await renderConSesion('/ciclo', ...ANALISTA)
  await screen.findByRole('heading', { name: 'Actualización Mensual de Estados', level: 1 })
  await screen.findByRole('table', { name: 'Actualizaciones mensuales anteriores' })
  await screen.findByText(/Financiaciones nuevas en el SAC|No hay financiaciones nuevas/)
}
const fecha = () => screen.getByLabelText('Fecha de corte')
const ejecutar = () => userEvent.click(screen.getByRole('button', { name: 'Ejecutar actualización mensual' }))
const cambiarFecha = (valor) => fireEvent.change(fecha(), { target: { value: valor } })
const filas = (nombreTabla) => within(screen.getByRole('table', { name: nombreTabla })).getAllByRole('row').slice(1)
const filaDe = (nombreTabla, numero) => filas(nombreTabla).find((f) => f.textContent.includes(numero))

describe('pantalla 10 · antes de ejecutar', () => {
  test('propone el corte siguiente y muestra la última actualización y las financiaciones nuevas (RF10)', async () => {
    await abrir()
    expect(fecha()).toHaveValue('2026-10-31')
    const parametros = screen.getByRole('region', { name: 'Parámetros de la actualización' })
    expect(parametros).toHaveTextContent('Última actualización30 de septiembre de 2026Ejecutada por Juan Pérez')
    expect(within(parametros).getByText('2265-2208')).toHaveAttribute('title', 'Panadería La Espiga')
    expect(within(parametros).getByText('2266-7745')).toBeInTheDocument()
    expect(within(parametros).getByText('2267-3361')).toBeInTheDocument()
    expect(parametros).toHaveTextContent('entrarán en primer reporte con su estado y su mora reales')
  })

  test('el historial lista los ciclos y deja ver el resultado de uno anterior', async () => {
    await abrir()
    expect(filas('Actualizaciones mensuales anteriores').map((f) => f.textContent)).toEqual([expect.stringContaining('Juan Pérez30/09/20262220')])
    await userEvent.click(screen.getByRole('button', { name: 'Ver el resultado del corte 30/09/2026' }))
    expect(await screen.findByRole('heading', { name: '6 obligaciones actualizadas en el corte 30/09/2026' })).toBeInTheDocument()
    expect(filaDe('Cambios aplicados', '2259-1092')).toHaveTextContent('01 · Vigentepasa a02 · Saldada')
    // Sin ejecutar, no se muestran los pasos del ciclo.
    expect(screen.queryByRole('region', { name: 'Actualización mensual completada' })).not.toBeInTheDocument()
  })

  test('la matriz muestra los 5 estados de CENS con S y N (Manual, p. 40)', async () => {
    await abrir()
    const matriz = await screen.findByRole('table', { name: /Matriz de cambios de estado/ })
    const [vigenteSinMora, , , , , , saldadaSinMora] = within(matriz).getAllByRole('row').slice(1)
    expect(within(vigenteSinMora).getAllByRole('cell').map((c) => c.textContent).join('')).toBe('SSNSNSSNNN')
    expect(within(saldadaSinMora).getAllByRole('cell').map((c) => c.textContent).join('')).toBe('NNNNNNNNNN')
    expect(screen.getByText(/nunca se acepta Castigada recuperada/)).toHaveTextContent('(error 881)')
  })
})

describe('pantalla 10 · validaciones', () => {
  test('la fecha es obligatoria y debe ser el último día del mes (en el cliente)', async () => {
    const pedido = vi.fn()
    server.use(http.post(`${API_URL}/ciclos/`, () => pedido()))
    await abrir()
    cambiarFecha('')
    await ejecutar()
    expect(await screen.findByText('Selecciona una fecha de corte.')).toBeInTheDocument()
    cambiarFecha('2026-10-15')
    await ejecutar()
    expect(await screen.findByText('El corte es el último día del mes. Para ese mes sería el 31/10/2026.')).toBeInTheDocument()
    expect(fecha()).toHaveFocus()
    expect(pedido).not.toHaveBeenCalled()
  })

  test('el backend rechaza un corte no posterior al último enviado (400 en el campo)', async () => {
    await abrir()
    cambiarFecha('2026-08-31')
    await ejecutar()
    expect(await screen.findByText('La fecha de corte debe ser posterior al último corte enviado (31/08/2026).')).toBeInTheDocument()
  })

  test('sin extracción en borrador de ese corte explica el camino (409)', async () => {
    await abrir()
    await ejecutar()
    expect(await screen.findByText(/Primero genera la extracción de ese corte\./)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir a Extracción de Cartera' })).toHaveAttribute('href', '/extraccion')
    expect(screen.queryByRole('table', { name: 'Cambios aplicados' })).not.toBeInTheDocument()
  })
})

describe('pantalla 10 · ejecución', () => {
  test('muestra los 8 pasos mientras la petición está pendiente', async () => {
    corteDeOctubreEnBorrador()
    let soltar
    server.use(
      http.post(`${API_URL}/ciclos/`, async () => {
        await new Promise((r) => {
          soltar = r
        })
        return undefined // sigue al handler del mock
      }),
    )
    await abrir()
    await ejecutar()
    const progreso = await screen.findByRole('region', { name: 'Actualizando los estados de las obligaciones…' })
    expect(within(progreso).getAllByRole('listitem')).toHaveLength(8)
    expect(progreso).toHaveTextContent('orden por confirmar con CENS')
    expect(screen.getByRole('button', { name: /Actualizando…/ })).toBeDisabled()
    expect(fecha()).toBeDisabled()
    soltar()
    expect(await screen.findByRole('region', { name: 'Actualización mensual completada' })).toBeInTheDocument()
  })

  test('el ciclo del 31/10 muestra KPIs, qué pasó con cada obligación y actualiza historial y financiaciones (RF10–RF47)', async () => {
    corteDeOctubreEnBorrador()
    await abrir()
    await ejecutar()
    expect(await screen.findByText(/Actualización mensual completada: 10 obligaciones actualizadas en el corte 31\/10\/2026\./)).toBeInTheDocument()

    const kpis = screen.getByRole('list', { name: 'Resultado de la actualización del corte 31/10/2026' })
    expect(within(kpis).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      '3En primer reporte',
      '5Con pagos aplicados',
      '1Cierres (02 o 07)',
      '1A Dudoso o Castigada',
      '2Pagaron la mora',
      '0Cambios rechazados',
    ])
    expect(filas('Cambios aplicados')).toHaveLength(10)
    // RF10: entra en primer reporte; la caducada entra en 03 con la regla «por confirmar» (C-53).
    expect(filaDe('Cambios aplicados', '2265-2208')).toHaveTextContent('Primer reportepasa a01 · Vigente00Entra con su estado y su mora realesRF10')
    expect(filaDe('Cambios aplicados', '2267-3361')).toHaveTextContent('Dudoso RecaudoRF14por confirmar')
    // RF11: edad antes → después. RF17: pago aplicado (imputación por confirmar).
    expect(filaDe('Cambios aplicados', '2258-7731')).toHaveTextContent('01 → 02')
    expect(filaDe('Cambios aplicados', '2258-7731')).toHaveTextContent('Pago de $50.000 aplicado a: parte de la cuota del 14/08/2026RF17por confirmar')
    // RF45 y RF46: castigo y pago de la mora sin cancelar el saldo.
    expect(filaDe('Cambios aplicados', '2250-0987')).toHaveTextContent('03 · Dudoso recaudopasa a06 · Castigada')
    expect(filaDe('Cambios aplicados', '2244-6410')).toHaveTextContent('Pagó la mora sin cancelar el saldo: vuelve a VigenteRF46por confirmar')
    expect(filaDe('Cambios aplicados', '2244-6410')).toHaveTextContent('Quedó al día: se reportan fecha de pago, modo de extinción y tipo de pagoRF47')
    // RF12: cierre en Saldada.
    expect(filaDe('Cambios aplicados', '2261-8820')).toHaveTextContent('01 · Vigentepasa a02 · Saldada')
    expect(within(filaDe('Cambios aplicados', '2261-8820')).getByRole('link', { name: '2261-8820' })).toHaveAttribute('href', '/obligaciones?obligacion=5')

    expect(screen.getByText('Todos los cambios de estado cumplen la matriz de TransUnion y las reglas de primer reporte.')).toBeInTheDocument()
    await waitFor(() => expect(filas('Actualizaciones mensuales anteriores')).toHaveLength(2))
    expect(filas('Actualizaciones mensuales anteriores')[0]).toHaveTextContent('31/10/20263310')
    expect(await screen.findByText(/No hay financiaciones nuevas por ingresar\./)).toBeInTheDocument()
  })

  test('muestra los rechazos 713 y 881 y marca «Revisar» (RF10, RF11)', async () => {
    server.use(...cicloConRechazosYRevisiones())
    await abrir()
    await ejecutar()
    const rechazos = await screen.findByRole('table', { name: 'Cambios rechazados' })
    expect(screen.getByRole('heading', { name: '2 cambios rechazados: bloquean la validación del corte' })).toBeInTheDocument()
    expect(within(rechazos).getAllByRole('row').slice(1).map((f) => f.textContent)).toEqual([
      '2267-3361Taller Mecánico Los PinosPrimer reportepasa a07 · Castigada recuperadaError 881 Error 881: estado no permitido en primer reporte',
      '2259-1092Jorge Iván Salcedo02 · Saldadapasa a03 · Dudoso recaudoError 713 Error 713: la matriz no permite pasar de Saldada sin mora a Dudoso Recaudo',
    ])
    // RF10: nueva caducada sin mora → entra en 01 y queda para revisión.
    expect(filaDe('Cambios aplicados', '2268-1100')).toHaveTextContent('RevisarEntra con su estado y su mora realesRF10Crédito caducado en el SAC sin mora')
    // RF11: salto 00 → 03 y baja 02 → 00 sin abono, para revisión.
    expect(filaDe('Cambios aplicados', '2257-4156')).toHaveTextContent('00 → 03Revisar')
    expect(filaDe('Cambios aplicados', '2260-5543')).toHaveTextContent('02 → 00RevisarLa edad bajó de 02 a 00 sin un abono en el periodo')
  })
})

describe('pantalla 10 · estados de carga y error', () => {
  test('si falla el historial lo dice y se puede reintentar', async () => {
    let fallar = true
    server.use(http.get(`${API_URL}/ciclos/`, () => (fallar ? HttpResponse.json({ detail: 'x' }, { status: 503 }) : undefined)))
    await renderConSesion('/ciclo', ...ANALISTA)
    expect(await screen.findByRole('status', { name: 'Cargando el historial' })).toBeInTheDocument()
    expect(await screen.findByText(/^No se pudo cargar el historial\./)).toBeInTheDocument()
    fallar = false
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await screen.findByRole('table', { name: 'Actualizaciones mensuales anteriores' })
    expect(fecha()).toHaveValue('2026-10-31')
  })

  test('sin ciclos ejecutados lo dice y no propone fecha', async () => {
    server.use(http.get(`${API_URL}/ciclos/`, () => HttpResponse.json([])))
    await renderConSesion('/ciclo', ...ANALISTA)
    expect(await screen.findByText('Aún no se ha ejecutado ninguna actualización mensual.')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Parámetros de la actualización' })).toHaveTextContent('Aún no se ha ejecutado')
    expect(fecha()).toHaveValue('')
  })

  test('si fallan la matriz o las financiaciones nuevas, el resto de la pantalla sigue', async () => {
    server.use(
      http.get(`${API_URL}/matriz-estados/`, () => HttpResponse.json({ detail: 'x' }, { status: 503 })),
      http.get(`${API_URL}/obligaciones/resumen/`, async () => {
        await delay(0)
        return HttpResponse.json({ detail: 'x' }, { status: 503 })
      }),
    )
    await renderConSesion('/ciclo', ...ANALISTA)
    expect(await screen.findByText(/^No se pudo cargar la matriz\./)).toBeInTheDocument()
    expect(await screen.findByText('No se pudieron consultar las financiaciones nuevas.')).toBeInTheDocument()
    expect(await screen.findByRole('table', { name: 'Actualizaciones mensuales anteriores' })).toBeInTheDocument()
  })
})
