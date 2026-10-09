import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { ROLES } from '../features/auth/roles'
import { mapUserFieldErrors } from '../features/users/userMapper'
import { validarUsuario } from '../features/users/userValidation'
import { formatearCOP, formatearFechaHora, formatearFechaISO, formatearFechaISOLarga, plural } from '../lib/format'
import { server } from '../mocks/server'
import { renderConSesion } from './renderApp'

const fila = (nombre) => within(screen.getByRole('row', { name: new RegExp(nombre) }))
const abrirUsuarios = async () => {
  await renderConSesion('/usuarios')
  await screen.findByText('Juan Pérez')
}

describe('validación y utilidades', () => {
  test('validarUsuario exige nombre, correo con formato y rol', () => {
    expect(validarUsuario({ nombre: ' ', correo: '', rol: '' })).toEqual({
      nombre: 'Ingresa el nombre completo.',
      correo: 'Ingresa el correo corporativo.',
      rol: 'Selecciona un rol.',
    })
    expect(validarUsuario({ nombre: 'Ana', correo: 'ana', rol: ROLES.ANALISTA }).correo).toMatch(/correo válido/i)
    expect(validarUsuario({ nombre: 'Ana', correo: 'ana@cens.com.co', rol: ROLES.ADMIN })).toEqual({})
  })

  test('los errores del servidor sobre `email` se muestran en el campo `correo`', () => {
    expect(mapUserFieldErrors({ email: 'Repetido', nombre: 'Falta' })).toEqual({ correo: 'Repetido', nombre: 'Falta' })
  })

  test('las fechas se muestran como en la maqueta', () => {
    expect(formatearFechaHora(new Date(2026, 8, 30, 8, 14))).toBe('30/09/2026 08:14')
    expect(formatearFechaHora(null)).toBe('—')
  })

  test('pesos, fechas ISO y plurales (para las pantallas de cartera)', () => {
    expect(formatearCOP(1276016)).toBe('$1.276.016')
    expect(formatearCOP(0)).toBe('$0')
    expect(formatearCOP(842300.6)).toBe('$842.301')
    expect(formatearFechaISO('2026-09-30')).toBe('30/09/2026')
    expect(formatearFechaISOLarga('2026-09-30')).toBe('30 de septiembre de 2026')
    expect(plural(1, 'obligación', 'obligaciones')).toBe('1 obligación')
    expect(plural(6, 'obligación', 'obligaciones')).toBe('6 obligaciones')
  })
})

describe('listado de usuarios', () => {
  test('muestra los usuarios con rol, estado y último acceso', async () => {
    await abrirUsuarios()
    expect(screen.getAllByRole('row')).toHaveLength(8) // encabezado + 7
    const juan = fila('Juan Pérez')
    expect(juan.getByText('jperez@cens.com.co')).toBeInTheDocument()
    expect(juan.getByText('Analista de Cartera')).toBeInTheDocument()
    expect(juan.getByText('Activo')).toBeInTheDocument()
    expect(juan.getByText('30/09/2026 08:14')).toBeInTheDocument()
    expect(fila('Ana Lucía Vargas').getByText('Inactivo')).toBeInTheDocument()
    expect(fila('María Gómez').getByText('—')).toBeInTheDocument() // nunca ha ingresado
  })

  test('si la carga falla muestra el error y permite reintentar', async () => {
    let falla = true
    server.use(http.get('/api/users/', () => (falla ? HttpResponse.text('x', { status: 500 }) : HttpResponse.json([]))))
    await renderConSesion('/usuarios')
    expect(await screen.findByRole('alert')).toHaveTextContent('Ocurrió un error en el servidor')
    falla = false
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Aún no hay usuarios registrados.')).toBeInTheDocument()
  })
})

describe('crear usuario', () => {
  const abrirPanel = async () => {
    await abrirUsuarios()
    await userEvent.click(screen.getByRole('button', { name: 'Crear usuario' }))
    return screen.getByRole('dialog', { name: 'Crear nuevo usuario' })
  }

  test('el panel valida los campos y enfoca el primero', async () => {
    const panel = await abrirPanel()
    await userEvent.click(within(panel).getByRole('button', { name: 'Crear usuario' }))
    expect(within(panel).getByText('Ingresa el nombre completo.')).toBeInTheDocument()
    expect(within(panel).getByText('Ingresa el correo corporativo.')).toBeInTheDocument()
    expect(within(panel).getByLabelText('Nombre completo')).toHaveFocus()
  })

  test('un correo repetido se reporta en el campo del correo', async () => {
    const panel = await abrirPanel()
    await userEvent.type(within(panel).getByLabelText('Nombre completo'), 'Otra Persona')
    await userEvent.type(within(panel).getByLabelText('Correo corporativo'), 'jperez@cens.com.co')
    await userEvent.click(within(panel).getByRole('button', { name: 'Crear usuario' }))
    expect(await within(panel).findByText('Ya existe un usuario con ese correo.')).toBeInTheDocument()
    expect(within(panel).getByLabelText('Correo corporativo')).toHaveFocus()
  })

  test('al crear muestra la contraseña temporal una sola vez y agrega la fila', async () => {
    const panel = await abrirPanel()
    await userEvent.type(within(panel).getByLabelText('Nombre completo'), 'Laura Díaz')
    await userEvent.type(within(panel).getByLabelText('Correo corporativo'), 'ldiaz@cens.com.co')
    await userEvent.click(within(panel).getByRole('button', { name: 'Crear usuario' }))

    const dialogo = await screen.findByRole('dialog', { name: 'Usuario creado' })
    expect(within(dialogo).getByLabelText('Contraseña temporal')).toHaveTextContent('Temporal123')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Listo' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(fila('Laura Díaz').getByText('ldiaz@cens.com.co')).toBeInTheDocument()
  })

  test('el panel no se muestra con datos de la vez anterior', async () => {
    const panel = await abrirPanel()
    await userEvent.type(within(panel).getByLabelText('Nombre completo'), 'Texto temporal')
    await userEvent.keyboard('{Escape}')
    await userEvent.click(screen.getByRole('button', { name: 'Crear usuario' }))
    expect(screen.getByLabelText('Nombre completo')).toHaveValue('')
  })
})

describe('editar usuario', () => {
  test('carga los datos, guarda los cambios y actualiza la fila', async () => {
    await abrirUsuarios()
    await userEvent.click(screen.getByRole('button', { name: 'Editar a Carlos Sánchez' }))
    const panel = screen.getByRole('dialog', { name: 'Editar usuario' })
    const nombre = within(panel).getByLabelText('Nombre completo')
    expect(nombre).toHaveValue('Carlos Sánchez')
    await userEvent.clear(nombre)
    await userEvent.type(nombre, 'Carlos A. Sánchez')
    await userEvent.click(within(panel).getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByText('Usuario actualizado correctamente.')).toBeInTheDocument()
    expect(fila('Carlos A. Sánchez').getByText('csanchez@cens.com.co')).toBeInTheDocument()
  })

  test('un administrador no puede cambiarse el rol a sí mismo', async () => {
    await abrirUsuarios()
    await userEvent.click(screen.getByRole('button', { name: 'Editar a Rosa Martínez' }))
    const panel = screen.getByRole('dialog', { name: 'Editar usuario' })
    expect(within(panel).getByLabelText('Rol')).toBeDisabled()
    expect(within(panel).getByText('No puedes cambiar tu propio rol.')).toBeInTheDocument()
  })
})

describe('activar y desactivar', () => {
  test('desactivar pide confirmación (con el foco en Cancelar) y cancelar no cambia nada', async () => {
    await abrirUsuarios()
    await userEvent.click(fila('Carlos Sánchez').getByRole('switch'))
    const dialogo = screen.getByRole('alertdialog', { name: 'Desactivar usuario' })
    expect(within(dialogo).getByRole('button', { name: 'Cancelar' })).toHaveFocus()
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))
    expect(fila('Carlos Sánchez').getByText('Activo')).toBeInTheDocument()
  })

  test('confirmar desactiva al usuario', async () => {
    await abrirUsuarios()
    await userEvent.click(fila('Carlos Sánchez').getByRole('switch'))
    await userEvent.click(screen.getByRole('button', { name: 'Desactivar' }))
    expect(await screen.findByText('Usuario «Carlos Sánchez» desactivado.')).toBeInTheDocument()
    expect(fila('Carlos Sánchez').getByText('Inactivo')).toBeInTheDocument()
  })

  test('activar un usuario desactivado es inmediato', async () => {
    await abrirUsuarios()
    await userEvent.click(fila('Ana Lucía Vargas').getByRole('switch'))
    expect(await screen.findByText('Usuario «Ana Lucía Vargas» activado.')).toBeInTheDocument()
    expect(fila('Ana Lucía Vargas').getByText('Activo')).toBeInTheDocument()
  })

  test('no puedes desactivar tu propio usuario', async () => {
    await abrirUsuarios()
    expect(fila('Rosa Martínez').getByRole('switch')).toBeDisabled()
  })
})
