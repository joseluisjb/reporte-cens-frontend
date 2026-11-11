// Pruebas independientes de la pantalla 11 · Refinanciaciones (RF18), del plan maestro de la Iteración 2
// (backend docs/pruebas/plan-maestro-iteracion2.md, casos CP-B-33 a CP-B-37). Cubren lo que no prueban
// refinanciacionesPage.test.jsx ni contrato.test.js: la segunda reestructuración, el 409 de una
// eliminada, el rol contrario al registrar, los errores de fecha en su campo y el siguiente ciclo.
// CP-B-34 (Dudoso recaudo → 07) ya lo cubre refinanciacionesPage.test.jsx.
//
// A propósito no se comparten helpers con las pruebas del autor de la pantalla (contrato.test.js y
// refinanciacionesPage.test.jsx): son pruebas independientes y no deben heredar sus supuestos.
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { api } from '../lib/api'
import { API_URL } from '../lib/config'
import { db } from '../mocks/db'
import { server } from '../mocks/server'
import { expectCumpleContrato } from './contrato'
import { corteDeOctubreEnBorrador } from './escenarios/ciclo'
import { renderConSesion } from './renderApp'

const ADMIN = ['rmartinez@example.com', 'Admin12345']
const ANALISTA = ['jperez@example.com', 'Analista123']
const PEDIDO = { naturaleza: '06', numero_cuotas: 24, fecha: '2026-10-15' }

const llamar = (metodo, url, data) => api.request({ method: metodo, url, data, validateStatus: () => true })
async function entrar([email, password]) {
  expect((await llamar('post', '/auth/login/', { email, password })).status).toBe(200)
}
function idDe(numero) {
  const obligacion = db.obligaciones.find((o) => o.numero === numero)
  if (!obligacion) throw new Error(`La obligación ${numero} no está en las obligaciones simuladas (db.obligaciones).`)
  return obligacion.id
}

describe('RF18 · API de refinanciaciones (pruebas independientes)', () => {
  test('CP-B-33: refinanciar una obligación ya reestructurada da n = 2 y guarda el vínculo con la anterior', async () => {
    await entrar(ANALISTA)
    const original = idDe('2271-5502') // nació de 2255-7788 (n = 1)
    const r = await llamar('post', '/refinanciaciones/', { ...PEDIDO, obligacion_original_id: original })
    expect(r.status, JSON.stringify(r.data)).toBe(201)
    expectCumpleContrato('post', '/refinanciaciones/', 201, r.data)
    expect(r.data.obligacion_original).toMatchObject({ numero_obligacion: '2271-5502', estado_cierre: '02', modo_extincion: { codigo: '16' } })
    expect(r.data.obligacion_nueva.numero_reestructuraciones).toBe(2)

    const nueva = await llamar('get', `/obligaciones/${r.data.obligacion_nueva.obligacion_id}/`)
    const anterior = await llamar('get', `/obligaciones/${original}/`)
    expect(nueva.data.reestructuracion).toMatchObject({ numero_reestructuraciones: 2, obligacion_anterior: { obligacion_id: original, numero_obligacion: '2271-5502' } })
    // Mismo titular, misma identificación (enmascarada).
    expect(nueva.data.numero_identificacion).toBe(anterior.data.numero_identificacion)
    expect(nueva.data.numero_identificacion).toMatch(/^\*+\d{4}$/)
    expect(anterior.data.refinanciada_en).toMatchObject({ obligacion_id: r.data.obligacion_nueva.obligacion_id })
  })

  test('CP-B-35: una obligación eliminada en TransUnion responde 409 obligacion_eliminada y no crea nada', async () => {
    const obligacion = db.obligaciones.find((o) => o.id === idDe('2261-8820'))
    obligacion.eliminada = true
    const antes = db.refinanciaciones.length
    await entrar(ANALISTA)
    const r = await llamar('post', '/refinanciaciones/', { ...PEDIDO, obligacion_original_id: obligacion.id })
    expect(r.status).toBe(409)
    expectCumpleContrato('post', '/refinanciaciones/', 409, r.data)
    expect(r.data).toEqual({ detail: 'La obligación 2261-8820 está eliminada en TransUnion: no se puede refinanciar.', code: 'obligacion_eliminada' })
    expect(db.refinanciaciones).toHaveLength(antes)
  })

  test('CP-B-33 a CP-B-37 · rol contrario: el Administrador no puede registrar (403) y sin sesión es 401', async () => {
    const obligacionId = idDe('2258-7731')
    expect((await llamar('post', '/refinanciaciones/', { ...PEDIDO, obligacion_original_id: obligacionId })).status).toBe(401)
    await entrar(ADMIN)
    const r = await llamar('post', '/refinanciaciones/', { ...PEDIDO, obligacion_original_id: obligacionId })
    expect(r.status).toBe(403)
    expectCumpleContrato('post', '/refinanciaciones/', 403, r.data)
    expect(db.obligaciones.find((o) => o.id === obligacionId).estado).toBe('01')
  })

  test('CP-B-37: la refinanciación y el ciclo siguiente responden 201 (la nueva se pierde en el mock, ver la guía)', async () => {
    corteDeOctubreEnBorrador()
    await entrar(ANALISTA)
    const r = await llamar('post', '/refinanciaciones/', { ...PEDIDO, obligacion_original_id: idDe('2257-4156') })
    expect(r.status, JSON.stringify(r.data)).toBe(201)
    const { obligacion_id: nuevaId, numero_obligacion: numero } = r.data.obligacion_nueva
    expect(numero).toBe('2272-6101')

    const ciclo = await llamar('post', '/ciclos/', { fecha_corte: '2026-10-31' })
    expect(ciclo.status, JSON.stringify(ciclo.data)).toBe(201)

    // El registro de la refinanciación sí se conserva.
    const lista = await llamar('get', '/refinanciaciones/')
    expect(lista.data[0].obligacion_nueva.numero_obligacion).toBe(numero)

    // Lo que pasa HOY en el mock: el ciclo reemplaza db.obligaciones por la foto fija del 2026-10-31,
    // que reutiliza los ids 13 a 15, y la nueva obligación se pierde (su id pasa a 2265-2208). Es una
    // limitación conocida del mock, registrada en docs/GUIA_EQUIPO.md («Límite del mock del ciclo»);
    // con el backend real no pasa, y allí este caso lo prueba Dilan. Si el mock se corrige, esta
    // aserción falla: entonces se cambia por la esperada (numero_obligacion === numero y
    // reestructuracion.numero_reestructuraciones === 1).
    const nueva = await llamar('get', `/obligaciones/${nuevaId}/`)
    expect(nueva.status).toBe(200)
    expect(nueva.data.numero_obligacion).toBe('2265-2208')
  })
})

describe('RF18 · pantalla 11, errores de fecha en su campo', () => {
  const abrirRegistro = async () => {
    await renderConSesion('/refinanciaciones', ...ANALISTA)
    await userEvent.click(await screen.findByRole('button', { name: 'Registrar refinanciación' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Registrar refinanciación' })
    await within(dialogo).findByLabelText('Obligación original')
    return dialogo
  }
  async function llenar(dialogo, fecha) {
    const opcion = within(dialogo).getByRole('option', { name: /^2257-4156 · / })
    await userEvent.selectOptions(within(dialogo).getByLabelText('Obligación original'), opcion)
    await userEvent.selectOptions(within(dialogo).getByLabelText(/Naturaleza de la reestructuración/), '06')
    await userEvent.type(within(dialogo).getByLabelText('Número de cuotas de la nueva obligación'), '24')
    const campo = within(dialogo).getByLabelText('Fecha de la refinanciación')
    await userEvent.clear(campo)
    await userEvent.type(campo, fecha)
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Registrar refinanciación' }))
    return campo
  }

  test('CP-B-36: una fecha futura se rechaza en el cliente, en el campo y sin llamar al servidor', async () => {
    const pedido = vi.fn(() => HttpResponse.json({ detail: 'No debía llegar al servidor.' }, { status: 500 }))
    server.use(http.post(`${API_URL}/refinanciaciones/`, pedido))
    const dialogo = await abrirRegistro()
    const campo = await llenar(dialogo, '2999-01-01')
    expect(within(dialogo).getByText('La fecha de la refinanciación no puede ser futura.')).toBeInTheDocument()
    expect(campo).toHaveAttribute('aria-invalid', 'true')
    expect(pedido).not.toHaveBeenCalled()
  })

  test('CP-B-36: una fecha anterior al último corte enviado la rechaza el servidor y se ve en el campo fecha', async () => {
    const antes = db.refinanciaciones.length
    const dialogo = await abrirRegistro()
    const campo = await llenar(dialogo, '2026-08-15')
    expect(await within(dialogo).findByText('La fecha de la refinanciación debe ser posterior al último corte enviado (31/08/2026).')).toBeInTheDocument()
    expect(campo).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('dialog', { name: 'Registrar refinanciación' })).toBeInTheDocument()
    expect(db.refinanciaciones).toHaveLength(antes)
  })
})
