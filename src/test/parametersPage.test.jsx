// Pruebas de la pantalla de Parametrización de Conceptos de Energía (RF35).
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderConSesion } from './renderApp'

const boton = (nombre) => screen.getByRole('button', { name: nombre })
const withinDialog = () => within(screen.getByRole('dialog'))

describe('pantalla de parametrización (RF35)', () => {
  test('carga y muestra la lista de conceptos con estado y acciones', async () => {
    await renderConSesion('/parametrizacion')

    expect(await screen.findByRole('heading', { name: 'Códigos de Concepto de Energía' })).toBeInTheDocument()
    expect(await screen.findByText('CUOTA FINANCIACION ENERGIA')).toBeInTheDocument()
    expect(screen.getByText('30')).toBeInTheDocument()
    expect(screen.getByText('INTERES FINANCIACION ENERGIA')).toBeInTheDocument()
    expect(screen.getByText('CONCEPTO DE PRUEBA ACTIVO')).toBeInTheDocument()
    expect(screen.getByText('CONCEPTO DE PRUEBA INACTIVO')).toBeInTheDocument()

    // Botón agregar disponible para el Administrador
    expect(boton('Agregar concepto')).toBeInTheDocument()
  })

  test('búsqueda de conceptos en tiempo real por código y descripción', async () => {
    await renderConSesion('/parametrizacion')
    await screen.findByText('CUOTA FINANCIACION ENERGIA')

    const buscar = screen.getByLabelText('Buscar concepto por código o descripción')
    await userEvent.type(buscar, 'INTERES')

    expect(screen.getByText('INTERES FINANCIACION ENERGIA')).toBeInTheDocument()
    expect(screen.queryByText('CUOTA FINANCIACION ENERGIA')).not.toBeInTheDocument()

    await userEvent.clear(buscar)
    await userEvent.type(buscar, '30')
    expect(screen.getByText('CUOTA FINANCIACION ENERGIA')).toBeInTheDocument()
    expect(screen.queryByText('INTERES FINANCIACION ENERGIA')).not.toBeInTheDocument()
  })

  test('filtro por estado activo e inactivo', async () => {
    await renderConSesion('/parametrizacion')
    await screen.findByText('CUOTA FINANCIACION ENERGIA')

    const filtro = screen.getByLabelText('Filtrar por estado')
    await userEvent.selectOptions(filtro, 'inactivos')

    expect(screen.getByText('CONCEPTO DE PRUEBA INACTIVO')).toBeInTheDocument()
    expect(screen.queryByText('CUOTA FINANCIACION ENERGIA')).not.toBeInTheDocument()

    await userEvent.selectOptions(filtro, 'activos')
    expect(screen.getByText('CUOTA FINANCIACION ENERGIA')).toBeInTheDocument()
    expect(screen.queryByText('CONCEPTO DE PRUEBA INACTIVO')).not.toBeInTheDocument()
  })

  test('crear concepto valida campos obligatorios en el cliente', async () => {
    await renderConSesion('/parametrizacion')
    await screen.findByText('CUOTA FINANCIACION ENERGIA')

    await userEvent.click(boton('Agregar concepto'))
    const dialog = withinDialog()

    // Intentar enviar vacío
    await userEvent.click(dialog.getByRole('button', { name: 'Agregar concepto' }))

    expect(await dialog.findByText('Ingresa el código del concepto.')).toBeInTheDocument()
    expect(await dialog.findByText('Ingresa la descripción.')).toBeInTheDocument()
  })

  test('crear concepto con datos válidos lo agrega a la tabla', async () => {
    await renderConSesion('/parametrizacion')
    await screen.findByText('CUOTA FINANCIACION ENERGIA')

    await userEvent.click(boton('Agregar concepto'))
    const dialog = withinDialog()

    await userEvent.type(dialog.getByLabelText('Código de concepto'), '8888')
    await userEvent.type(dialog.getByLabelText('Descripción'), 'CONCEPTO NUEVO TEST')
    await userEvent.type(dialog.getByLabelText('Observación (opcional)'), 'Nota de prueba')

    await userEvent.click(dialog.getByRole('button', { name: 'Agregar concepto' }))

    // Verifica que el diálogo se cerró y el nuevo concepto aparece en la tabla
    expect(await screen.findByText('CONCEPTO NUEVO TEST')).toBeInTheDocument()
    expect(screen.getByText('8888')).toBeInTheDocument()
    expect(screen.getByText('Nota de prueba')).toBeInTheDocument()
  })

  test('un código ya existente muestra el error correspondiente del servidor', async () => {
    await renderConSesion('/parametrizacion')
    await screen.findByText('CUOTA FINANCIACION ENERGIA')

    await userEvent.click(boton('Agregar concepto'))
    const dialog = withinDialog()

    await userEvent.type(dialog.getByLabelText('Código de concepto'), '30')
    await userEvent.type(dialog.getByLabelText('Descripción'), 'CONCEPTO DUPLICADO')

    await userEvent.click(dialog.getByRole('button', { name: 'Agregar concepto' }))

    expect(await dialog.findByText('El código de concepto ya existe.')).toBeInTheDocument()
  })

  test('editar concepto carga datos, no permite cambiar código y guarda cambios', async () => {
    await renderConSesion('/parametrizacion')
    await screen.findByText('CUOTA FINANCIACION ENERGIA')

    await userEvent.click(screen.getByRole('button', { name: 'Editar concepto 94' }))
    const dialog = withinDialog()

    expect(dialog.getByText('94')).toBeInTheDocument()
    expect(dialog.getByText('El código no se puede modificar.')).toBeInTheDocument()

    const descInput = dialog.getByLabelText('Descripción')
    await userEvent.clear(descInput)
    await userEvent.type(descInput, 'INTERES FINANCIACION MODIFICADO')

    await userEvent.click(dialog.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('INTERES FINANCIACION MODIFICADO')).toBeInTheDocument()
  })

  test('desactivar concepto pide confirmación y confirmar cambia su estado', async () => {
    await renderConSesion('/parametrizacion')
    await screen.findByText('CUOTA FINANCIACION ENERGIA')

    // Click en switch para desactivar el concepto 30
    await userEvent.click(screen.getByRole('switch', { name: 'Concepto 30 activo' }))

    const dialog = within(screen.getByRole('alertdialog'))
    expect(dialog.getByRole('heading', { name: 'Desactivar concepto de energía' })).toBeInTheDocument()

    // Cancelar no modifica
    await userEvent.click(dialog.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()

    // Click de nuevo y confirmar
    await userEvent.click(screen.getByRole('switch', { name: 'Concepto 30 activo' }))
    const confirmDialog = within(screen.getByRole('alertdialog'))
    await userEvent.click(confirmDialog.getByRole('button', { name: 'Desactivar' }))

    expect(await screen.findByRole('switch', { name: 'Concepto 30 activo' })).not.toBeChecked()
  })

  test('pestaña de grupos de conceptos muestra los grupos y abre modal de creación', async () => {
    await renderConSesion('/parametrizacion')
    await screen.findByText('CUOTA FINANCIACION ENERGIA')

    const tabConceptos = screen.getByRole('button', { name: /conceptos de energía/i })
    const tabGrupos = screen.getByRole('button', { name: /grupos de conceptos/i })

    expect(tabConceptos).toHaveAttribute('aria-current', 'page')
    expect(tabGrupos).not.toHaveAttribute('aria-current')

    await userEvent.click(tabGrupos)

    expect(tabGrupos).toHaveAttribute('aria-current', 'page')
    expect(tabConceptos).not.toHaveAttribute('aria-current')

    expect(await screen.findByText('Energía financiada')).toBeInTheDocument()
    expect(screen.getByText('Solo cuota de energía')).toBeInTheDocument()

    await userEvent.click(boton('Crear grupo'))
    expect(screen.getByRole('dialog', { name: 'Crear nuevo grupo de conceptos' })).toBeInTheDocument()
  })

  test('la tabla de conceptos incluye columna Fecha de creación con «—» si no tiene', async () => {
    await renderConSesion('/parametrizacion')
    await screen.findByText('CUOTA FINANCIACION ENERGIA')

    expect(screen.getByRole('columnheader', { name: 'Fecha de creación' })).toBeInTheDocument()
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  test('editar un grupo con conceptos inactivos los excluye o advierte para evitar error 400', async () => {
    await renderConSesion('/parametrizacion')
    await screen.findByText('CUOTA FINANCIACION ENERGIA')

    // Desactivamos el concepto 30 primero
    await userEvent.click(screen.getByRole('switch', { name: 'Concepto 30 activo' }))
    const confirmDialog = within(screen.getByRole('alertdialog'))
    await userEvent.click(confirmDialog.getByRole('button', { name: 'Desactivar' }))
    await screen.findByRole('switch', { name: 'Concepto 30 activo' })

    // Pasamos a la pestaña de grupos y editamos "Energía financiada" (que contenía concepto 30)
    await userEvent.click(screen.getByRole('button', { name: /grupos de conceptos/i }))
    expect(await screen.findByText('Energía financiada')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Editar grupo Energía financiada' }))
    const dialog = within(screen.getByRole('dialog'))

    // Guarda cambios sin error 400 porque se filtran/advierten los inactivos
    await userEvent.click(dialog.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByText('Grupo «Energía financiada» actualizado correctamente.')).toBeInTheDocument()
  })
})
