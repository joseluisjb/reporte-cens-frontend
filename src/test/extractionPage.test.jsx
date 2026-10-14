// Pruebas de la pantalla de Extracción y Consolidación de Cartera (RF1-RF5, RF7, RF44).
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { forzarErrorCorrectivo } from '../mocks/datos/validaciones'
import { server } from '../mocks/server'
import { renderConSesion } from './renderApp'

const boton = (nombre) => screen.getByRole('button', { name: nombre })

describe('pantalla de extracción y consolidación de cartera (RF1–RF5)', () => {
  test('carga y muestra el corte actual con sus métricas y obligaciones consolidadas', async () => {
    await renderConSesion('/extraccion')

    expect(
      await screen.findByRole('heading', { name: 'Extracción y Consolidación de Cartera' }),
    ).toBeInTheDocument()

    // Resumen del corte (el corte 2 está en BORRADOR)
    expect(await screen.findByText('Corte #2 al 30/09/2026')).toBeInTheDocument()
    expect(screen.getByText('BORRADOR')).toBeInTheDocument()
    expect(screen.getByText('24')).toBeInTheDocument() // 24 obligaciones
    expect(screen.getByRole('button', { name: 'Validar corte' })).toBeInTheDocument()

    // Tabla de obligaciones consolidadas
    expect(await screen.findByText('TITULAR FICTICIO 01')).toBeInTheDocument()
    expect(screen.getByText('******0001')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Saldo neto (COP)' })).toBeInTheDocument()
    expect(screen.getAllByText('01 - Vigente').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('00 Normal').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/No incluye el estado individual de consolidación/)).toBeInTheDocument()
    expect(screen.queryByText('Requiere revisión')).not.toBeInTheDocument()

    // Ninguna identificación completa debe verse (Habeas Data)
    expect(screen.queryByText('1000000001')).not.toBeInTheDocument()
  })

  test('muestra carga y estado vacío cuando la página no tiene obligaciones', async () => {
    let resolverRespuesta
    server.use(
      http.get('/api/extracciones/:id/obligaciones/', () =>
        new Promise((resolve) => {
          resolverRespuesta = () => resolve(HttpResponse.json({ total: 0, resultados: [] }))
        }),
      ),
    )

    await renderConSesion('/extraccion')
    await screen.findByText('Corte #2 al 30/09/2026')
    expect(screen.getByRole('status', { name: 'Cargando obligaciones' })).toBeInTheDocument()

    // El aviso de carga aparece antes de que la petición llegue al mock: en un equipo lento
    // (GitHub Actions) resolverRespuesta aún no existe. Se espera a que el mock la reciba.
    await waitFor(() => expect(resolverRespuesta).toBeTypeOf('function'))
    resolverRespuesta()
    expect(await screen.findByText('No hay obligaciones en este corte.')).toBeInTheDocument()
  })

  test('muestra el error al cargar obligaciones y permite reintentar', async () => {
    let falla = true
    server.use(
      http.get('/api/extracciones/:id/obligaciones/', () =>
        falla
          ? HttpResponse.json({ detail: 'Error temporal' }, { status: 500 })
          : HttpResponse.json({ total: 0, resultados: [] }),
      ),
    )

    await renderConSesion('/extraccion')
    expect(await screen.findByRole('alert')).toHaveTextContent('Ocurrió un error en el servidor')

    falla = false
    await userEvent.click(boton('Reintentar carga de obligaciones'))
    expect(await screen.findByText('No hay obligaciones en este corte.')).toBeInTheDocument()
  })

  test('paginación de obligaciones consolidadas', async () => {
    await renderConSesion('/extraccion')
    await screen.findByText('TITULAR FICTICIO 01')

    // 24 obligaciones en total: 20 en la página 1, 4 en la página 2
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument()
    expect(boton('Anterior')).toBeDisabled()
    expect(boton('Siguiente')).toBeEnabled()

    await userEvent.click(boton('Siguiente'))

    expect(await screen.findByText('Página 2 de 2')).toBeInTheDocument()
    expect(boton('Anterior')).toBeEnabled()
    expect(boton('Siguiente')).toBeDisabled()
    expect(screen.getByText('TITULAR FICTICIO 21')).toBeInTheDocument()
  })

  test('ciclo completo de corte: BORRADOR -> VALIDAR -> ENVIAR', async () => {
    await renderConSesion('/extraccion')
    await screen.findByText('Corte #2 al 30/09/2026')

    // 1. Validar corte en BORRADOR
    await userEvent.click(boton('Validar corte'))

    // Pasa a VALIDADO y muestra advertencia informativa de la factura
    expect(await screen.findByText('VALIDADO')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Registrar envío a TransUnion' })).toBeInTheDocument()
    expect(screen.getByText(/Validado con observaciones informativas/i)).toBeInTheDocument()

    // 2. Registrar envío a TransUnion
    await userEvent.click(boton('Registrar envío a TransUnion'))
    const dialog = within(screen.getByRole('dialog', { name: 'Registrar envío a TransUnion' }))
    expect(dialog.getByLabelText('Fecha de reporte o envío')).toBeInTheDocument()

    await userEvent.click(dialog.getByRole('button', { name: 'Confirmar envío' }))

    // Pasa a ENVIADO
    expect(await screen.findByText('ENVIADO')).toBeInTheDocument()
    expect(screen.getByText('Reporte finalizado y enviado a TransUnion')).toBeInTheDocument()
  })

  test('validación bloqueada con error 409 muestra modal de errores correctivos', async () => {
    forzarErrorCorrectivo(2) // inyecta error de identificación faltante en el corte 2

    await renderConSesion('/extraccion')
    await screen.findByText('Corte #2 al 30/09/2026')

    await userEvent.click(boton('Validar corte'))

    // Debe abrir el modal de inconsistencias y permanecer en BORRADOR
    const dialog = within(
      await screen.findByRole('dialog', { name: 'Inconsistencias detectadas en la validación' }),
    )
    expect(dialog.getByText('SIN_IDENTIFICACION')).toBeInTheDocument()
    expect(dialog.getByText('Falta el tipo o el número de identificación')).toBeInTheDocument()

    // Cerrar modal
    await userEvent.click(dialog.getByRole('button', { name: 'Entendido' }))
    expect(screen.getByText('BORRADOR')).toBeInTheDocument()
  })

  test('formulario valida fecha obligatoria y no futura', async () => {
    await renderConSesion('/extraccion')
    await screen.findByText('Corte #2 al 30/09/2026')

    const inputFecha = screen.getByLabelText('Fecha de corte')
    await userEvent.clear(inputFecha)
    await userEvent.click(boton('Iniciar extracción'))

    expect(await screen.findByText('Selecciona una fecha de corte.')).toBeInTheDocument()

    // Fecha futura
    await userEvent.type(inputFecha, '2099-01-01')
    await userEvent.click(boton('Iniciar extracción'))

    expect(await screen.findByText('La fecha de corte no puede ser futura.')).toBeInTheDocument()
  })

  test('regenerar un borrador de la misma fecha recarga la tabla y ventana de envío formatea la fecha', async () => {
    await renderConSesion('/extraccion')
    await screen.findByText('Corte #2 al 30/09/2026')
    await screen.findByText('TITULAR FICTICIO 01')

    // Regenerar el corte del 30/09/2026
    const inputFecha = screen.getByLabelText('Fecha de corte')
    fireEvent.change(inputFecha, { target: { value: '2026-09-30' } })
    await userEvent.click(boton('Iniciar extracción'))

    // Muestra notificación y recarga
    expect(await screen.findByText(/Corte de cartera generado correctamente/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('TITULAR FICTICIO 01')).toBeInTheDocument()
    })

    // Validar y abrir ventana de envío para comprobar fecha formateada con formatearFechaISO
    await userEvent.click(boton('Validar corte'))
    expect(await screen.findByText('VALIDADO')).toBeInTheDocument()

    await userEvent.click(boton('Registrar envío a TransUnion'))
    const dialog = within(screen.getByRole('dialog', { name: 'Registrar envío a TransUnion' }))
    // Comprueba que dice "30/09/2026" formateado y no "2026-09-30"
    expect(dialog.getByText('30/09/2026')).toBeInTheDocument()
  })

  test('cancela la eliminación de un corte en borrador', async () => {
    await renderConSesion('/extraccion')
    await screen.findByText('Corte #2 al 30/09/2026')

    expect(screen.getByRole('button', { name: 'Eliminar borrador' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar borrador' }))

    const dialog = within(
      await screen.findByRole('alertdialog', { name: 'Eliminar corte en borrador' }),
    )
    expect(
      dialog.getByText(/¿Eliminar permanentemente el corte #2 al 30\/09\/2026\?/),
    ).toBeInTheDocument()

    await userEvent.click(dialog.getByRole('button', { name: 'Cancelar' }))

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Corte #2 al 30/09/2026')).toBeInTheDocument()
    expect(screen.getByText('BORRADOR')).toBeInTheDocument()
  })

  test('elimina un corte en borrador y actualiza al corte anterior', async () => {
    await renderConSesion('/extraccion')
    await screen.findByText('Corte #2 al 30/09/2026')

    await userEvent.click(screen.getByRole('button', { name: 'Eliminar borrador' }))

    const dialog = within(
      await screen.findByRole('alertdialog', { name: 'Eliminar corte en borrador' }),
    )
    await userEvent.click(dialog.getByRole('button', { name: 'Eliminar borrador' }))

    expect(await screen.findByText('Corte #2 en borrador eliminado.')).toBeInTheDocument()

    // Ahora el corte actual es el corte #1 (ENVIADO)
    expect(await screen.findByText('Corte #1 al 31/08/2026')).toBeInTheDocument()
    expect(screen.getByText('ENVIADO')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Eliminar borrador' })).not.toBeInTheDocument()
  })
})

