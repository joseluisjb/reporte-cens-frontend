// Pantalla 16 · Homologación de Estados (RF48), del Administrador. Datos iniciales: la carga del script de
// la base (A → 01, C → 03, D y B sin homologar, F → cierre; prioridades 1 a 5) y los estados de TransUnion.
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { API_URL } from '../lib/config'
import { db } from '../mocks/db'
import { server } from '../mocks/server'
import { renderConSesion } from './renderApp'

const abrir = async () => {
  await renderConSesion('/homologacion-estados')
  await screen.findByRole('heading', { name: 'Homologación de Estados', level: 1 })
  await screen.findByRole('table', { name: 'Estados del sistema comercial' })
}
const tablaSac = () => screen.getByRole('table', { name: 'Estados del sistema comercial' })
const filaSac = (sac) => within(tablaSac()).getAllByRole('row').find((tr) => tr.firstChild?.textContent === sac)
const editar = async (sac) => {
  await userEvent.click(screen.getByRole('button', { name: `Editar la homologación del estado ${sac}` }))
  return filaSac(sac)
}

describe('pantalla 16 · homologación de estados (RF48)', () => {
  test('lista los estados del sistema comercial por prioridad, avisa de B y D sin equivalencia y muestra los estados de TransUnion', async () => {
    await abrir()
    expect(screen.getByText(/2 estados del sistema comercial sin equivalencia \(D, B\)/).closest('[role="status"]')).toHaveTextContent(
      'se bloquean al validar el corte hasta que tengan equivalencia.',
    )
    const filas = within(tablaSac()).getAllByRole('row').slice(1)
    expect(filas.map((tr) => tr.firstChild.textContent)).toEqual(['A', 'C', 'D', 'B', 'F'])
    expect(filaSac('A')).toHaveTextContent('A1ActivoVigenteNoCarga inicial')
    expect(filaSac('B')).toHaveTextContent('Sin homologar')
    expect(filaSac('F')).toHaveTextContent('CierreSaldada o Castigada recuperada, según el estado anterior')

    const tu = screen.getByRole('table', { name: 'Estados de TransUnion' })
    expect(within(tu).getAllByRole('row')).toHaveLength(11)
    const fila = (codigo) => within(tu).getAllByRole('row').find((tr) => tr.firstChild?.textContent === codigo)
    expect(fila('08')).toHaveTextContent('08InactivoNoNo se usa')
    expect(fila('04')).toHaveTextContent('No')
    expect(fila('12')).toHaveTextContent('Ley 1564 de 2012 Insolvencia PNNC')
    expect(fila('07')).toHaveTextContent('Obligación cerrada: se reporta una sola vez')
  })

  test('A → 01 confirmado se guarda con quién y cuándo', async () => {
    await abrir()
    const fila = await editar('A')
    expect(within(fila).getByLabelText('Cómo se reporta el estado A')).toHaveFocus()
    // Solo estados que no son de cierre; los que CENS no usa salen deshabilitados.
    const opciones = within(within(fila).getByLabelText('Estado de TransUnion para A')).getAllByRole('option')
    expect(opciones.map((o) => o.textContent)).toEqual([
      'Selecciona…',
      'Vigente',
      'Dudoso recaudo',
      'Suspendida por la entidad (no se usa)',
      'Castigada',
      'Inactivo (no se usa)',
      'Ley 550',
      'Ley 1116',
      'Ley 1564 de 2012 Insolvencia PNNC',
    ])
    expect(opciones.find((o) => o.value === '08')).toBeDisabled()
    await userEvent.click(within(fila).getByLabelText('Confirmado por CENS'))
    await userEvent.click(within(fila).getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('Homologación guardada: el estado A se reporta como Vigente.')).toBeInTheDocument()
    await waitFor(() => expect(filaSac('A')).toHaveTextContent('VigenteSí'))
    expect(filaSac('A')).toHaveTextContent('Rosa Martínez')
    expect(db.homologacionEstados.find((h) => h.estado_sac === 'A')).toMatchObject({ confirmado: true, actualizado_por: 'Rosa Martínez' })
    expect(screen.getByRole('button', { name: 'Editar la homologación del estado A' })).toHaveFocus()
  })

  test('homologar B y D quita el aviso; F sigue como cierre', async () => {
    await abrir()
    for (const sac of ['B', 'D']) {
      const fila = await editar(sac)
      await userEvent.selectOptions(within(fila).getByLabelText(`Estado de TransUnion para ${sac}`), '01')
      await userEvent.click(within(fila).getByRole('button', { name: 'Guardar' }))
      await screen.findByText(`Homologación guardada: el estado ${sac} se reporta como Vigente.`)
    }
    expect(await screen.findByText('Todos los estados del sistema comercial tienen su equivalencia.')).toBeInTheDocument()
  })

  test('elegir «Cierre» deshabilita el estado; sin estado pide elegirlo; sin cambios lo dice', async () => {
    await abrir()
    let fila = await editar('B')
    await userEvent.click(within(fila).getByRole('button', { name: 'Guardar' }))
    expect(within(fila).getByRole('alert')).toHaveTextContent('Selecciona el estado de TransUnion.')
    expect(within(fila).getByLabelText('Estado de TransUnion para B')).toHaveAttribute('aria-invalid', 'true')
    await userEvent.selectOptions(within(fila).getByLabelText('Cómo se reporta el estado B'), 'CIERRE')
    expect(within(fila).getByLabelText('Estado de TransUnion para B')).toBeDisabled()
    expect(within(fila).queryByRole('alert')).not.toBeInTheDocument()
    await userEvent.click(within(fila).getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByRole('button', { name: 'Editar la homologación del estado B' })).toHaveFocus()

    fila = await editar('F')
    await userEvent.click(within(fila).getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('Sin cambios en la homologación del estado F.')).toBeInTheDocument()
  })

  test('un 400 del backend se muestra en la fila (estado que CENS no usa)', async () => {
    server.use(
      http.put(`${API_URL}/homologacion-estados/C/`, () =>
        HttpResponse.json({ estado_tu: ['El estado Inactivo no se usa en CENS: elige un estado en uso.'] }, { status: 400 }),
      ),
    )
    await abrir()
    const fila = await editar('C')
    await userEvent.selectOptions(within(fila).getByLabelText('Estado de TransUnion para C'), '06')
    await userEvent.click(within(fila).getByRole('button', { name: 'Guardar' }))
    expect(await within(fila).findByRole('alert')).toHaveTextContent('El estado Inactivo no se usa en CENS: elige un estado en uso.')
    expect(db.homologacionEstados.find((h) => h.estado_sac === 'C').estado_tu).toBe('03')
  })

  test('mientras se edita una fila, las demás no se pueden editar', async () => {
    await abrir()
    await editar('A')
    expect(screen.getByRole('button', { name: 'Editar la homologación del estado C' })).toBeDisabled()
  })

  test('sin estados cargados lo dice y no afirma que todo esté homologado', async () => {
    server.use(
      http.get(`${API_URL}/homologacion-estados/`, () => HttpResponse.json([])),
      http.get(`${API_URL}/estados/`, () => HttpResponse.json([])),
    )
    await renderConSesion('/homologacion-estados')
    expect(await screen.findByText('Todavía no hay estados del sistema comercial. Pide al equipo técnico que los cargue.')).toBeInTheDocument()
    expect(screen.getByText('No hay estados de TransUnion cargados.')).toBeInTheDocument()
    expect(screen.queryByText('Todos los estados del sistema comercial tienen su equivalencia.')).not.toBeInTheDocument()
  })

  test('muestra la carga y, si falla, el error con «Reintentar»', async () => {
    let fallar = true
    server.use(http.get(`${API_URL}/homologacion-estados/`, () => (fallar ? HttpResponse.json({ detail: 'x' }, { status: 503 }) : undefined)))
    await renderConSesion('/homologacion-estados')
    expect(await screen.findByRole('status', { name: 'Cargando la homologación de estados' })).toBeInTheDocument()
    expect(await screen.findByText(/^No se pudo cargar la homologación de estados\./)).toBeInTheDocument()
    fallar = false
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('table', { name: 'Estados del sistema comercial' })).toBeInTheDocument()
  })
})
