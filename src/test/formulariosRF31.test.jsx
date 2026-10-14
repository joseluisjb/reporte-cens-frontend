// RF31: todos los formularios usan `useFormulario`. Al enviar con errores, el foco va al primer
// campo inválido, y un 409 del servidor queda en el campo que lo causó (no como aviso suelto).
import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp, renderConSesion } from './renderApp'

const boton = (nombre) => screen.getByRole('button', { name: nombre })

describe('formularios con useFormulario (RF31): foco en el primer campo inválido', () => {
  test('recuperar contraseña', async () => {
    renderApp('/recuperar', null)
    await userEvent.click(await screen.findByRole('button', { name: 'Enviar enlace de recuperación' }))
    expect(screen.getByLabelText('Correo electrónico corporativo')).toHaveFocus()
    expect(screen.getByText('Ingresa tu correo electrónico.')).toBeInTheDocument()
  })

  test('restablecer contraseña', async () => {
    renderApp('/restablecer?token=token-de-prueba', null)
    await userEvent.click(await screen.findByRole('button', { name: 'Guardar contraseña' }))
    expect(screen.getByLabelText('Nueva contraseña')).toHaveFocus()
  })

  test('agregar concepto: código, luego descripción; el código repetido queda en su campo', async () => {
    await renderConSesion('/parametrizacion')
    await screen.findByText('CUOTA FINANCIACION ENERGIA')
    await userEvent.click(boton('Agregar concepto'))
    const panel = within(screen.getByRole('dialog'))
    await userEvent.click(panel.getByRole('button', { name: 'Agregar concepto' }))
    expect(panel.getByLabelText('Código de concepto')).toHaveFocus()

    await userEvent.type(panel.getByLabelText('Código de concepto'), '30')
    await userEvent.click(panel.getByRole('button', { name: 'Agregar concepto' }))
    expect(panel.getByLabelText('Descripción')).toHaveFocus()

    await userEvent.type(panel.getByLabelText('Descripción'), 'REPETIDO')
    await userEvent.click(panel.getByRole('button', { name: 'Agregar concepto' }))
    expect(await panel.findByText('El código de concepto ya existe.')).toBeInTheDocument()
    expect(panel.getByLabelText('Código de concepto')).toHaveFocus()
  })

  test('crear grupo: el nombre vacío recibe el foco y un nombre repetido queda en su campo', async () => {
    await renderConSesion('/parametrizacion')
    await screen.findByText('CUOTA FINANCIACION ENERGIA')
    await userEvent.click(screen.getByRole('button', { name: /grupos de conceptos/i }))
    await screen.findByText('Energía financiada')
    await userEvent.click(boton('Crear grupo'))
    const modal = within(screen.getByRole('dialog', { name: 'Crear nuevo grupo de conceptos' }))
    await userEvent.click(modal.getByRole('button', { name: 'Crear grupo' }))
    expect(modal.getByLabelText('Nombre del grupo')).toHaveFocus()

    await userEvent.type(modal.getByLabelText('Nombre del grupo'), 'Energía financiada')
    await userEvent.click(modal.getByRole('checkbox', { name: /^30 —/ }))
    await userEvent.click(modal.getByRole('button', { name: 'Crear grupo' }))
    expect(await modal.findByText('El nombre de grupo ya existe.')).toBeInTheDocument()
    expect(modal.getByLabelText('Nombre del grupo')).toHaveFocus()
  })

  test('iniciar extracción sin fecha de corte', async () => {
    await renderConSesion('/extraccion')
    await screen.findByText('Corte #2 al 30/09/2026')
    fireEvent.change(screen.getByLabelText('Fecha de corte'), { target: { value: '' } })
    await userEvent.click(boton('Iniciar extracción'))
    expect(screen.getByText('Selecciona una fecha de corte.')).toBeInTheDocument()
    expect(screen.getByLabelText('Fecha de corte')).toHaveFocus()
  })

  test('registrar envío con fecha futura', async () => {
    await renderConSesion('/extraccion')
    await screen.findByText('Corte #2 al 30/09/2026')
    await userEvent.click(boton('Validar corte'))
    await screen.findByText('VALIDADO')
    await userEvent.click(boton('Registrar envío a TransUnion'))
    const modal = within(screen.getByRole('dialog', { name: 'Registrar envío a TransUnion' }))
    fireEvent.change(modal.getByLabelText('Fecha de reporte o envío'), { target: { value: '2099-01-01' } })
    await userEvent.click(modal.getByRole('button', { name: 'Confirmar envío' }))
    expect(modal.getByText('La fecha de envío no puede ser futura.')).toBeInTheDocument()
    expect(modal.getByLabelText('Fecha de reporte o envío')).toHaveFocus()
  })
})
