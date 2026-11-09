// Pruebas independientes de la pantalla 11 · Refinanciaciones (RF18), del plan maestro de la Iteración 2
// (casos CP-B-33 a CP-B-37). Cubren lo que no prueban refinanciacionesPage.test.jsx ni contrato.test.js:
// la segunda reestructuración, el 409 de una eliminada, el 403 del Administrador al registrar, los
// errores de fecha en su campo y que la nueva siga reestructurada después del siguiente ciclo.
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { api } from '../lib/api'
import { db } from '../mocks/db'
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
const idDe = (numero) => db.obligaciones.find((o) => o.numero === numero).id

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
    const obligacion = db.obligaciones.find((o) => o.numero === '2261-8820')
    obligacion.eliminada = true
    const antes = db.refinanciaciones.length
    await entrar(ANALISTA)
    const r = await llamar('post', '/refinanciaciones/', { ...PEDIDO, obligacion_original_id: obligacion.id })
    expect(r.status).toBe(409)
    expectCumpleContrato('post', '/refinanciaciones/', 409, r.data)
    expect(r.data).toEqual({ detail: 'La obligación 2261-8820 está eliminada en TransUnion: no se puede refinanciar.', code: 'obligacion_eliminada' })
    expect(db.refinanciaciones).toHaveLength(antes)
  })

  test('rol: el Administrador no puede registrar una refinanciación (403) y sin sesión es 401', async () => {
    expect((await llamar('post', '/refinanciaciones/', { ...PEDIDO, obligacion_original_id: 2 })).status).toBe(401)
    await entrar(ADMIN)
    const r = await llamar('post', '/refinanciaciones/', { ...PEDIDO, obligacion_original_id: 2 })
    expect(r.status).toBe(403)
    expectCumpleContrato('post', '/refinanciaciones/', 403, r.data)
    expect(db.obligaciones.find((o) => o.id === 2).estado).toBe('01')
  })

  // DF-01 (mock, abierto): el ciclo simulado reemplaza db.obligaciones por la foto del mockup, que reutiliza
  // los ids 13 a 15. Una refinanciación registrada a mano se pierde y su id pasa a otra obligación
  // (13 → 2265-2208). `test.fails` mantiene el CI en verde y avisa cuando el mock se corrija: entonces
  // se cambia por `test`. En el backend real este caso lo prueba Dilan (CP-B-37).
  test.fails('CP-B-37: después del siguiente ciclo la nueva obligación sigue reestructurada (Manual, p. 17) · DF-01', async () => {
    corteDeOctubreEnBorrador()
    await entrar(ANALISTA)
    const r = await llamar('post', '/refinanciaciones/', { ...PEDIDO, obligacion_original_id: idDe('2257-4156') })
    expect(r.status, JSON.stringify(r.data)).toBe(201)
    const { obligacion_id: nuevaId, numero_obligacion: numero } = r.data.obligacion_nueva

    const ciclo = await llamar('post', '/ciclos/', { fecha_corte: '2026-10-31' })
    expect(ciclo.status, JSON.stringify(ciclo.data)).toBe(201)

    const lista = await llamar('get', '/refinanciaciones/')
    expect(lista.data[0].obligacion_nueva.numero_obligacion).toBe(numero)
    const nueva = await llamar('get', `/obligaciones/${nuevaId}/`)
    expect(nueva.status, `la nueva ${numero} ya no existe después del ciclo`).toBe(200)
    expect(nueva.data.numero_obligacion).toBe(numero)
    expect(nueva.data.reestructuracion).toMatchObject({ numero_reestructuraciones: 1 })
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

  test('una fecha futura se rechaza en el cliente, en el campo y sin llamar al servidor', async () => {
    const antes = db.refinanciaciones.length
    const dialogo = await abrirRegistro()
    const campo = await llenar(dialogo, '2999-01-01')
    expect(within(dialogo).getByText('La fecha de la refinanciación no puede ser futura.')).toBeInTheDocument()
    expect(campo).toHaveAttribute('aria-invalid', 'true')
    expect(db.refinanciaciones).toHaveLength(antes)
  })

  test('una fecha anterior al último corte enviado la rechaza el servidor y se ve en el campo fecha', async () => {
    const antes = db.refinanciaciones.length
    const dialogo = await abrirRegistro()
    const campo = await llenar(dialogo, '2026-08-15')
    expect(await within(dialogo).findByText('La fecha de la refinanciación debe ser posterior al último corte enviado (31/08/2026).')).toBeInTheDocument()
    expect(campo).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('dialog', { name: 'Registrar refinanciación' })).toBeInTheDocument()
    expect(db.refinanciaciones).toHaveLength(antes)
  })
})
