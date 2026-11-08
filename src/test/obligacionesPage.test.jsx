// Pantalla 9 · Obligaciones y Estados (RF10–RF17, RF19, RF45–RF47, RF49, RF50, RF52). Cada caso de
// «Listo cuando» de la ficha es una obligación del mock (las 12 del mockup v3, corte 2026-09-30) o un
// cambio en `db.obligaciones` que la pantalla debe mostrar bien.
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { API_URL } from '../lib/config'
import { db } from '../mocks/db'
import { server } from '../mocks/server'
import { renderConSesion } from './renderApp'

const ANALISTA = ['jperez@example.com', 'Analista123']

const abrir = async (ruta = '/obligaciones') => {
  await renderConSesion(ruta, ...ANALISTA)
  await screen.findByRole('heading', { name: 'Obligaciones y Estados', level: 1 })
  await screen.findByRole('table', { name: 'Obligaciones y estados' })
}
const tabla = () => screen.getByRole('table', { name: 'Obligaciones y estados' })
const filaDe = (numero) => within(tabla()).getByRole('button', { name: `Ver el detalle de la obligación ${numero}` }).closest('tr')
const numerosEnTabla = () =>
  within(tabla())
    .getAllByRole('button', { name: /^Ver el detalle/ })
    .map((b) => b.textContent)

// Abre el detalle desde la tabla y espera a que cargue.
const abrirDetalle = async (numero) => {
  await userEvent.click(within(tabla()).getByRole('button', { name: `Ver el detalle de la obligación ${numero}` }))
  return screen.findByRole('dialog', { name: `Obligación ${numero}` })
}
// Valor de un dato del detalle (<dt>etiqueta</dt><dd>valor</dd><dd>nota</dd>).
const dato = (panel, etiqueta) => within(panel).getByText(etiqueta, { selector: 'dt' }).parentElement
const editar = (numero, cambios) => Object.assign(db.obligaciones.find((o) => o.numero === numero), cambios)

describe('pantalla 9 · lista', () => {
  test('KPIs por estado, cuotas en mora por obligación y la nota de cierre (RF13, RF16, RF19)', async () => {
    await abrir()
    const kpis = screen.getByRole('group', { name: 'Filtrar por estado' })
    expect(within(kpis).getAllByRole('button').map((b) => b.textContent)).toEqual([
      '12Todas',
      '701 · Vigente',
      '103 · Dudoso recaudo',
      '106 · Castigada',
      '202 · Saldada',
      '107 · Castigada recuperada',
    ])
    expect(within(kpis).getByRole('button', { name: /Todas/ })).toHaveAttribute('aria-pressed', 'true')

    const cuotas = screen.getByRole('region', { name: 'Cuotas en mora por obligación' })
    expect(cuotas).toHaveTextContent('Se calcula en cada actualización mensual, por financiación (RF19) · Último corte: 30/09/2026')
    expect(within(cuotas).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['2Al día', '21 cuota en mora', '22 a 3 cuotas', '34 o más cuotas'])

    expect(screen.getByText(/Saldada \(02\) y Castigada recuperada \(07\) se reportan una sola vez/)).toHaveTextContent('(RF13, RF16)')
    expect(screen.getByRole('link', { name: 'Actualización mensual' })).toHaveAttribute('href', '/ciclo')
  })

  test('la tabla muestra estado, edad, mora, cuotas y saldo de cada obligación (RF10, RF11, RF19)', async () => {
    await abrir()
    expect(numerosEnTabla()).toHaveLength(12)
    expect(screen.getByText('12 obligaciones')).toBeInTheDocument()

    // RF10: entra en este corte en 01, edad 00, al día y con la etiqueta «Primer reporte».
    const nueva = filaDe('2263-9004')
    expect(nueva).toHaveTextContent('Primer reporte')
    expect(nueva).toHaveTextContent('01 · Vigente')
    expect(nueva).toHaveTextContent('00 - Normal')
    expect(nueva).toHaveTextContent('Al día')

    // RF11 y RF19: 47 días desde la cuota más antigua → edad 01; dos cuotas en mora.
    const dos = filaDe('2258-7731')
    expect(dos).toHaveTextContent('01 - Mora 30')
    expect(dos).toHaveTextContent('47 días de mora')
    expect(dos).toHaveTextContent('$140.000')
    expect(dos).toHaveTextContent('2 cuotas en mora')
    expect(dos).toHaveTextContent('$842.300')
    expect(filaDe('2257-4156')).toHaveTextContent('1 cuota en mora')

    // Cerrada con candado; caducado y en reclamo con su etiqueta.
    expect(within(filaDe('2259-1092')).getByText('Obligación cerrada: se reporta una sola vez')).toBeInTheDocument()
    expect(filaDe('2250-0987')).toHaveTextContent('Caducado en el SAC')
    expect(filaDe('2260-5543')).toHaveTextContent('En reclamo')
    expect(filaDe('2257-4156')).not.toHaveTextContent('Revisar')
  })

  test('marca «Revisar» la obligación que el ciclo dejó para revisión (RF11)', async () => {
    editar('2257-4156', { requiere_revision: true, motivo_revision: 'La edad bajó de 02 a 00 sin un abono en el periodo (RF11).' })
    await abrir()
    expect(filaDe('2257-4156')).toHaveTextContent('Revisar')
    const panel = await abrirDetalle('2257-4156')
    expect(within(panel).getByRole('status')).toHaveTextContent('Revisar: La edad bajó de 02 a 00 sin un abono en el periodo (RF11).')
  })

  test('un KPI filtra la tabla por estado y queda presionado', async () => {
    await abrir()
    await userEvent.click(screen.getByRole('button', { name: /03 · Dudoso recaudo/ }))
    await waitFor(() => expect(numerosEnTabla()).toEqual(['2250-0987']))
    expect(screen.getByRole('button', { name: /03 · Dudoso recaudo/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/en 03 · Dudoso recaudo/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Todas/ }))
    await waitFor(() => expect(numerosEnTabla()).toHaveLength(12))
  })

  test('las eliminadas en TransUnion salen en su propio KPI y no en «Todas» (RF50)', async () => {
    editar('2261-8820', { eliminada: true })
    await abrir()
    expect(numerosEnTabla()).toHaveLength(11)
    await userEvent.click(screen.getByRole('button', { name: /Eliminadas/ }))
    await waitFor(() => expect(numerosEnTabla()).toEqual(['2261-8820']))
    expect(filaDe('2261-8820')).toHaveTextContent('Eliminada en TransUnion')
    const panel = await abrirDetalle('2261-8820')
    expect(panel).toHaveTextContent('Eliminada en TransUnion: no se vuelve a reportar y su número no se reutiliza')
  })

  test('busca por número o por deudor', async () => {
    await abrir()
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar por número o deudor' }), 'pamplona')
    await waitFor(() => expect(numerosEnTabla()).toEqual(['2255-7788', '2271-5502']))
    await userEvent.clear(screen.getByRole('searchbox', { name: 'Buscar por número o deudor' }))
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar por número o deudor' }), 'zzz')
    expect(await screen.findByText('No hay obligaciones que coincidan con el filtro.')).toBeInTheDocument()
  })

  test('lee «?cuotas_mora_min=2» del panel y deja quitar el filtro', async () => {
    await abrir('/obligaciones?cuotas_mora_min=2')
    expect(numerosEnTabla()).toEqual(['2244-6410', '2250-0987', '2258-7731', '2260-5543', '2262-3318'])
    expect(screen.getByText('Con 2 cuotas o más en mora')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Quitar el filtro de cuotas en mora' }))
    await waitFor(() => expect(numerosEnTabla()).toHaveLength(12))
  })

  test('un filtro de la URL que no se entiende se ignora', async () => {
    await abrir('/obligaciones?estado=99&cuotas_mora_min=abc&obligacion=x')
    expect(numerosEnTabla()).toHaveLength(12)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('pagina de 20 en 20', async () => {
    const base = db.obligaciones[0]
    for (let i = 0; i < 15; i++) db.obligaciones.push({ ...base, id: 100 + i, numero: `2299-${String(i).padStart(4, '0')}` })
    await abrir()
    expect(numerosEnTabla()).toHaveLength(20)
    expect(screen.getByText('Mostrando 1–20 de 27 obligaciones · Página 1 de 2')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(numerosEnTabla()).toHaveLength(7))
    expect(screen.getByText('Mostrando 21–27 de 27 obligaciones · Página 2 de 2')).toBeInTheDocument()
  })

  test('sin obligaciones muestra el estado vacío', async () => {
    db.obligaciones = []
    await renderConSesion('/obligaciones', ...ANALISTA)
    expect(await screen.findByText('Aún no hay obligaciones: se cargan con la primera actualización mensual.')).toBeInTheDocument()
  })

  test('muestra la carga y, si falla, el error con «Reintentar»', async () => {
    let fallar = true
    server.use(
      http.get(`${API_URL}/obligaciones/`, () => (fallar ? HttpResponse.json({ detail: 'Servicio no disponible.' }, { status: 503 }) : undefined)),
      http.get(`${API_URL}/obligaciones/resumen/`, () => (fallar ? HttpResponse.json({ detail: 'Servicio no disponible.' }, { status: 503 }) : undefined)),
    )
    await renderConSesion('/obligaciones', ...ANALISTA)
    expect(await screen.findByRole('status', { name: 'Cargando obligaciones' })).toBeInTheDocument()
    expect(await screen.findByText(/^No se pudieron cargar las obligaciones\./)).toBeInTheDocument()
    expect(screen.getByText(/^No se pudo cargar el resumen de la cartera\./)).toBeInTheDocument()
    fallar = false
    for (const boton of screen.getAllByRole('button', { name: 'Reintentar' })) await userEvent.click(boton)
    await screen.findByRole('table', { name: 'Obligaciones y estados' })
    expect(await screen.findByRole('group', { name: 'Filtrar por estado' })).toBeInTheDocument()
  })
})

describe('pantalla 9 · detalle', () => {
  test('primer reporte en Vigente, al día (RF10, RF49)', async () => {
    await abrir()
    const panel = await abrirDetalle('2263-9004')
    expect(panel).toHaveTextContent('Ferretería La Esquina')
    expect(dato(panel, 'Primer reporte')).toHaveTextContent('Sí: aún no se ha incluido en ningún archivo')
    expect(dato(panel, 'Edad de mora (Tabla 9)')).toHaveTextContent('00 - Normal')
    expect(dato(panel, 'Fecha de exigibilidad')).toHaveTextContent('—')
    expect(panel).toHaveTextContent('No tiene cuotas vencidas sin pagar.')
  })

  test('dos cuotas vencidas de $70.000, exigibilidad y la nota de imputación por confirmar (RF17, RF49)', async () => {
    await abrir()
    const panel = await abrirDetalle('2258-7731')
    const cuotas = within(panel).getByRole('table', { name: 'Cuotas vencidas sin pagar' })
    expect(within(cuotas).getAllByRole('row').slice(1).map((r) => r.textContent)).toEqual(['14/08/2026$70.00047', '14/09/2026$70.00016'])
    expect(dato(panel, 'Fecha de exigibilidad')).toHaveTextContent('14/08/2026Cuota más antigua sin pagar (RF49)')
    expect(dato(panel, 'Días de mora')).toHaveTextContent('47 días')
    expect(dato(panel, 'Cuotas en mora')).toHaveTextContent('2 cuotas en mora')
    expect(panel).toHaveTextContent('La última extracción no trajo pagos de esta obligación.')
    expect(within(panel).getByText(/Se aplican de la cuota más antigua a la más reciente/)).toHaveTextContent('por confirmar')
  })

  test('cierre en Saldada: fecha, modo y tipo de pago, candado y cuota en $0 (RF12, RF13, RF52)', async () => {
    await abrir()
    const panel = await abrirDetalle('2259-1092')
    expect(within(panel).getByText('Obligación cerrada: se reporta una sola vez')).toBeInTheDocument()
    expect(dato(panel, 'Cierre')).toHaveTextContent('Pagó el 12/09/2026Modo 01 · Voluntario · Tipo de pago 01 · Voluntario')
    expect(dato(panel, 'Saldo')).toHaveTextContent('$0')
    expect(dato(panel, 'Valor en mora')).toHaveTextContent('$0')
    expect(dato(panel, 'Valor de la cuota')).toHaveTextContent('$0Antes $85.000: al cerrar se reporta en $0')
    expect(panel).toHaveTextContent('Se reporta una sola vez, en el corte en que cerró (30/09/2026), y después ya noRF13')
    const pagos = within(panel).getByRole('table', { name: 'Pagos extraídos del sistema comercial' })
    expect(pagos).toHaveTextContent('30/09/2026$170.000Cuotas del 2026-08-12 y del 2026-09-12 (pago total)')
  })

  test('cierre sin fecha de pago: avisa que no se reporta (RF22)', async () => {
    editar('2259-1092', { cierre: { ...db.obligaciones[2].cierre, fecha_pago: null } })
    await abrir()
    const panel = await abrirDetalle('2259-1092')
    expect(dato(panel, 'Cierre')).toHaveTextContent('Falta la fecha de pago: el cierre no se reporta (RF22)')
  })

  test('movimiento después del cierre: alerta de rectificación (RF13, RF16)', async () => {
    editar('2241-3302', { movimiento_posterior_cierre: true })
    await abrir()
    const panel = await abrirDetalle('2241-3302')
    expect(within(panel).getByRole('status')).toHaveTextContent('El sistema comercial muestra movimiento después del cierre')
    expect(panel).toHaveTextContent('Se reporta una sola vez, en el corte en que cerró (31/08/2026), y después ya noRF16')
  })

  test('crédito caducado en Dudoso recaudo y sus transiciones (RF14, RF15, RF45, RF46)', async () => {
    await abrir()
    const panel = await abrirDetalle('2250-0987')
    expect(dato(panel, 'En el SAC')).toHaveTextContent('Crédito caducadoCaduca a las 4 cuotas atrasadas · lleva 6')
    const reglas = within(panel).getByRole('heading', { name: 'Qué puede pasar con esta obligación' }).nextElementSibling
    expect(within(reglas).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Pago total → 07 · Castigada recuperadaRF15',
      'Paga la mora sin cancelar el saldo → 01 · VigenteRF46por confirmar',
      'Castigo contable de CENS → 06 · CastigadaRF45',
      'Refinanciación → 07 · Castigada recuperada con modo de extinción 16RF18',
    ])
  })

  test('con 3 de 4 atrasos el crédito no ha caducado (RF14)', async () => {
    editar('2261-8820', { vencidas: [{ fecha: '2026-07-15', valor: 41000 }, { fecha: '2026-08-15', valor: 41000 }, { fecha: '2026-09-15', valor: 41000 }] })
    await abrir()
    const panel = await abrirDetalle('2261-8820')
    expect(dato(panel, 'En el SAC')).toHaveTextContent('No caducadoCaduca a las 4 cuotas atrasadas · lleva 3')
  })

  test('en Vigente, la caducidad del crédito lleva «por confirmar» (RF12, RF14, RF45, RF18)', async () => {
    await abrir()
    const panel = await abrirDetalle('2257-4156')
    const reglas = within(panel).getByRole('heading', { name: 'Qué puede pasar con esta obligación' }).nextElementSibling
    expect(within(reglas).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Pago total → 02 · SaldadaRF12',
      'Crédito caducado en el SAC y con mora → 03 · Dudoso recaudoRF14por confirmar',
      'Castigo contable de CENS y con mora → 06 · CastigadaRF45',
      'Refinanciación → 02 · Saldada con modo de extinción 16RF18',
    ])
  })

  test('Castigada sigue así mientras tenga mora; pago total → 07 (RF15, RF45)', async () => {
    await abrir()
    const panel = await abrirDetalle('2244-6410')
    expect(panel).toHaveTextContent('Transportes Catatumbo S.A.S. · 06 · Castigada')
    expect(panel).toHaveTextContent('Sigue en Castigada mientras tenga moraRF45')
    expect(panel).toHaveTextContent('Pago total → 07 · Castigada recuperadaRF15')
    expect(dato(panel, 'Edad de mora (Tabla 9)')).toHaveTextContent('08 - Mora 240')
  })

  test('pago de la mora sin cierre (RF47)', async () => {
    editar('2257-4156', {
      pago_mora: { fecha_pago: '2026-09-20', modo_extincion: { codigo: '01', descripcion: 'Voluntario' }, tipo_pago: { codigo: '01', descripcion: 'Voluntario' }, valor_real_pagado: 98000 },
    })
    await abrir()
    const panel = await abrirDetalle('2257-4156')
    expect(dato(panel, 'Pago de la mora (RF47)')).toHaveTextContent('20/09/2026Modo 01 · Voluntario · Tipo de pago 01 · Voluntario · Valor pagado $98.000')
  })

  test('con edad 14 muestra los años en mora (RF49)', async () => {
    editar('2261-8820', { vencidas: [{ fecha: '2024-07-22', valor: 41000 }] })
    await abrir()
    const panel = await abrirDetalle('2261-8820')
    expect(dato(panel, 'Días de mora')).toHaveTextContent('800 días')
    expect(dato(panel, 'Edad de mora (Tabla 9)')).toHaveTextContent('14 - Mora 730Años en mora: 2 (RF49)')
  })

  test('reestructurada: naturaleza por confirmar y enlace a la obligación anterior (RF18)', async () => {
    await abrir('/obligaciones?obligacion=12')
    const panel = await screen.findByRole('dialog', { name: 'Obligación 2271-5502' })
    expect(dato(panel, 'Obligación reestructurada')).toHaveTextContent('01 · Sí (1)Naturaleza 07 · Otrapor confirmar · viene de 2255-7788')
    await userEvent.click(within(panel).getByRole('button', { name: 'Ver el detalle de la obligación 2255-7788' }))
    const anterior = await screen.findByRole('dialog', { name: 'Obligación 2255-7788' })
    expect(dato(anterior, 'Cierre')).toHaveTextContent('Modo 16 · Refinanciación · Tipo de pago 02 · No voluntario')
    expect(dato(anterior, 'Refinanciada en (RF18)')).toHaveTextContent('2271-5502')
  })

  test('la línea de tiempo va del evento más reciente al más antiguo', async () => {
    await abrir()
    const panel = await abrirDetalle('2258-7731')
    const linea = within(panel).getByRole('list', { name: 'Línea de tiempo de estados' })
    const eventos = within(linea).getAllByRole('listitem').map((li) => li.textContent)
    expect(eventos).toEqual([
      '30/09/2026 01 · VigenteEdad de mora 01Dos cuotas sin pagar: 47 días desde la más antigua, edad 01',
      '31/08/2026 01 · VigenteEdad de mora 00Primera cuota sin pagar: 17 días de mora',
      '28/02/2026 01 · VigenteEdad de mora 00Primer reporte en Vigente (01), al día',
    ])
  })

  test('se cierra con «Cerrar» o Escape, quita «?obligacion» y devuelve el foco al número', async () => {
    await abrir()
    await abrirDetalle('2258-7731')
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(within(tabla()).getByRole('button', { name: 'Ver el detalle de la obligación 2258-7731' })).toHaveFocus()
    await abrirDetalle('2258-7731')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  test('una obligación que no existe muestra el error en el panel', async () => {
    await abrir('/obligaciones?obligacion=999')
    const panel = await screen.findByRole('dialog', { name: 'Detalle de la obligación' })
    expect(await within(panel).findByText('No se pudo cargar la obligación. Obligación no encontrada.')).toBeInTheDocument()
  })
})
