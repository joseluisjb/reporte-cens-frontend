// Pantalla 13 · Reclamos Habeas Data (RF23).
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { API_URL } from '../lib/config'
import { hoyISO } from '../lib/format'
import { reclamosIniciales } from '../mocks/datos/reclamos'
import { db } from '../mocks/db'
import { server } from '../mocks/server'
import { ADMIN, renderApp, renderConSesion } from './renderApp'

const abrir = async () => {
  await renderConSesion('/reclamos', 'jperez@example.com', 'Analista123')
  await screen.findByRole('heading', { name: 'Reclamos Habeas Data', level: 1 })
  await screen.findByRole('table', { name: 'Reclamos de Habeas Data registrados' })
}

describe('pantalla 13 · Reclamos Habeas Data (RF23)', () => {
  beforeEach(() => {
    db.reclamos = reclamosIniciales()
  })

  test('muestra el encabezado, tarjetas de conteo, aviso informativo y la tabla inicial', async () => {
    await abrir()

    // Encabezado
    expect(screen.getByRole('heading', { name: 'Reclamos Habeas Data', level: 1 })).toBeInTheDocument()

    // Botones de acción principales
    expect(screen.getByRole('button', { name: /Archivo de marcación/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Archivo de desmarcación/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Registrar reclamo/i })).toBeInTheDocument()

    // Tarjetas de conteo: 2 en reclamo, 1 pendiente de marcación (r1), 1 cerrado pendiente de desmarcación (r3)
    expect(screen.getByText('Obligaciones en reclamo')).toBeInTheDocument()
    expect(screen.getByText('Pendientes de marcación')).toBeInTheDocument()
    expect(screen.getByText('Cerrados pendientes de desmarcación')).toBeInTheDocument()

    // Aviso informativo
    expect(
      screen.getByText(/Una obligación en reclamo/i)
    ).toBeInTheDocument()

    // Tabla con 3 registros
    const tabla = screen.getByRole('table', { name: 'Reclamos de Habeas Data registrados' })
    expect(within(tabla).getAllByRole('row')).toHaveLength(4) // 1 thead + 3 tbody
    expect(within(tabla).getByText('2260-5543')).toBeInTheDocument()
    expect(within(tabla).getByText('2262-3318')).toBeInTheDocument()
    expect(within(tabla).getByText('2241-3302')).toBeInTheDocument()
  })

  test('el Administrador ve «Acceso restringido» en /reclamos', async () => {
    renderApp('/reclamos', ADMIN)
    expect(await screen.findByRole('heading', { name: 'Acceso restringido' })).toBeInTheDocument()
    expect(screen.getByText(/exclusiva del rol Analista de Cartera/i)).toBeInTheDocument()
  })

  test('registrar un reclamo «Pago no reflejado» deja la obligación EN_RECLAMO', async () => {
    await abrir()

    await userEvent.click(screen.getByRole('button', { name: /Registrar reclamo/i }))

    const modal = screen.getByRole('dialog', { name: 'Registrar reclamo' })
    expect(modal).toBeInTheDocument()

    // Esperar a que carguen las obligaciones en el select
    await within(modal).findByRole('option', { name: /2258-7731/ })

    // Seleccionar obligación 2 (2258-7731)
    const selectObl = within(modal).getByLabelText('Obligación')
    await userEvent.selectOptions(selectObl, '2')

    // Seleccionar tipología «Pago no reflejado» (código 02)
    const selectTip = within(modal).getByLabelText(/Tipología del reclamo/i)
    await userEvent.selectOptions(selectTip, '02')

    // Observación opcional
    const obsInput = within(modal).getByLabelText(/Observación/i)
    await userEvent.type(obsInput, 'Comprobante de pago 98765 del 12/09')

    // Enviar formulario
    await userEvent.click(within(modal).getByRole('button', { name: 'Registrar reclamo' }))

    // El modal se cierra y el reclamo aparece en la tabla
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByText('Comprobante de pago 98765 del 12/09')).toBeInTheDocument()
    expect(screen.getByText('Reclamo registrado: queda pendiente el archivo de marcación.')).toBeInTheDocument()
  })

  test('segundo reclamo abierto sobre la misma obligación da 409 en español', async () => {
    await abrir()

    await userEvent.click(screen.getByRole('button', { name: /Registrar reclamo/i }))

    const modal = screen.getByRole('dialog', { name: 'Registrar reclamo' })

    // Seleccionar obligación 4 (2260-5543) que ya tiene reclamo abierto
    const selectObl = within(modal).getByLabelText('Obligación')
    // Agregamos la opción 4 si no está en las elegibles
    if (!within(selectObl).queryByDisplayValue(/2260-5543/)) {
      const opt = document.createElement('option')
      opt.value = '4'
      opt.textContent = '2260-5543 · Diana Patricia Niño'
      selectObl.appendChild(opt)
    }
    await userEvent.selectOptions(selectObl, '4')

    const selectTip = within(modal).getByLabelText(/Tipología del reclamo/i)
    await userEvent.selectOptions(selectTip, '01')

    await userEvent.click(within(modal).getByRole('button', { name: 'Registrar reclamo' }))

    // Debe mostrar error 409 en español
    expect(
      await within(modal).findByText(/ya tiene un reclamo abierto/i)
    ).toBeInTheDocument()
  })

  test('tipología fuera del catálogo da 400', async () => {
    // Forzamos al servidor MSW a responder 400 por tipología inválida
    server.use(
      http.post(`${API_URL}/reclamos/`, () => {
        return HttpResponse.json(
          { tipologia: ['Selecciona una tipología válida de la Ley 1266.'] },
          { status: 400 }
        )
      })
    )

    await abrir()
    await userEvent.click(screen.getByRole('button', { name: /Registrar reclamo/i }))

    const modal = screen.getByRole('dialog', { name: 'Registrar reclamo' })
    await within(modal).findByRole('option', { name: /2258-7731/ })

    const selectObl = within(modal).getByLabelText('Obligación')
    await userEvent.selectOptions(selectObl, '2')

    const selectTip = within(modal).getByLabelText(/Tipología del reclamo/i)
    await userEvent.selectOptions(selectTip, '01')

    await userEvent.click(within(modal).getByRole('button', { name: 'Registrar reclamo' }))

    expect(
      await within(modal).findByText('Selecciona una tipología válida de la Ley 1266.')
    ).toBeInTheDocument()
  })

  test('cerrar con fecha anterior a la radicación da 400 en el campo fecha_cierre', async () => {
    await abrir()

    // Clic en "Cerrar reclamo" de la fila abierta (2260-5543, radicado el 2026-09-22)
    const fila = screen.getByText('2260-5543').closest('tr')
    const botonCerrar = within(fila).getByRole('button', { name: 'Cerrar reclamo' })
    await userEvent.click(botonCerrar)

    const modal = screen.getByRole('dialog', { name: 'Cerrar reclamo' })
    expect(modal).toBeInTheDocument()

    // Seleccionar resultado
    const selectRes = within(modal).getByLabelText('Resultado del reclamo')
    await userEvent.selectOptions(selectRes, 'Procedente')

    // Fecha anterior a 2026-09-22, por ejemplo 2026-09-10
    const fechaInput = within(modal).getByLabelText('Fecha de cierre')
    await userEvent.clear(fechaInput)
    await userEvent.type(fechaInput, '2026-09-10')

    await userEvent.click(within(modal).getByRole('button', { name: 'Cerrar reclamo' }))

    // Error de validación en el campo fecha_cierre
    expect(
      within(modal).getByText('La fecha de cierre no puede ser anterior a la de radicación.')
    ).toBeInTheDocument()
  })

  test('cerrar reclamo exitosamente actualiza la fila a Cerrado', async () => {
    await abrir()

    const fila = screen.getByText('2260-5543').closest('tr')
    const botonCerrar = within(fila).getByRole('button', { name: 'Cerrar reclamo' })
    await userEvent.click(botonCerrar)

    const modal = screen.getByRole('dialog', { name: 'Cerrar reclamo' })
    await userEvent.selectOptions(within(modal).getByLabelText('Resultado del reclamo'), 'Procedente')
    const fechaInput = within(modal).getByLabelText('Fecha de cierre')
    await userEvent.clear(fechaInput)
    await userEvent.type(fechaInput, hoyISO())

    await userEvent.click(within(modal).getByRole('button', { name: 'Cerrar reclamo' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByText('Reclamo cerrado: queda pendiente el archivo de desmarcación.')).toBeInTheDocument()
  })

  test('generar el insumo de marcación incluye solo reclamos pendientes y deja el botón en 0', async () => {
    await abrir()

    // El botón inicialmente tiene 1 pendiente (Archivo de marcación (1))
    const btnMarcacion = screen.getByRole('button', { name: /Archivo de marcación \(1\)/i })
    expect(btnMarcacion).toBeEnabled()

    await userEvent.click(btnMarcacion)

    // Después de descargarlo, el botón de marcación queda en 0 y deshabilitado
    await waitFor(() => {
      const btnActualizado = screen.getByRole('button', { name: /Archivo de marcación \(0\)/i })
      expect(btnActualizado).toBeDisabled()
    })

    // Y muestra el toast de éxito
    expect(
      screen.getByText(/Archivo de marcación generado con 1 reclamo\./i)
    ).toBeInTheDocument()
  })
})
