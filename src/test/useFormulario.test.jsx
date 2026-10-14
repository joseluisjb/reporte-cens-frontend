// Formulario reutilizable de RF31 (lib/useFormulario.js): validación, foco, errores del servidor y envío.
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Alert, Button, Input } from '../components/ui'
import { ApiError } from '../lib/api'
import { useFormulario } from '../lib/useFormulario'

const validar = ({ nombre, correo }) => {
  const e = {}
  if (!nombre.trim()) e.nombre = 'Ingresa el nombre.'
  if (!correo.trim()) e.correo = 'Ingresa el correo.'
  return e
}

function Demo({ onSubmit, traducirErrores }) {
  const form = useFormulario({ valoresIniciales: { nombre: '', correo: '', acepto: false }, orden: ['nombre', 'correo', 'acepto'], validar, onSubmit, traducirErrores })
  return (
    <form {...form.formProps} aria-label="demo">
      <Input label="Nombre" {...form.campo('nombre')} />
      <Input label="Correo" {...form.campo('correo')} />
      <label>
        <input type="checkbox" {...form.campo('acepto')} /> Acepto
      </label>
      {form.errorGeneral && <Alert>{form.errorGeneral}</Alert>}
      <Button type="submit" loading={form.enviando}>
        Guardar
      </Button>
      <Button onClick={form.reiniciar}>Reiniciar</Button>
    </form>
  )
}

const guardar = () => userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
const escribir = (campo, texto) => userEvent.type(screen.getByLabelText(campo), texto)

describe('useFormulario', () => {
  test('con campos inválidos muestra los errores, enfoca el PRIMERO y no envía', async () => {
    const onSubmit = vi.fn()
    render(<Demo onSubmit={onSubmit} />)
    await guardar()
    expect(screen.getByText('Ingresa el nombre.')).toBeInTheDocument()
    expect(screen.getByText('Ingresa el correo.')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre')).toHaveFocus()
    expect(screen.getByLabelText('Nombre')).toHaveAttribute('aria-invalid', 'true')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  test('el error de un campo se quita al escribir en él (y solo ese)', async () => {
    render(<Demo onSubmit={vi.fn()} />)
    await guardar()
    await escribir('Nombre', 'A')
    expect(screen.queryByText('Ingresa el nombre.')).not.toBeInTheDocument()
    expect(screen.getByText('Ingresa el correo.')).toBeInTheDocument()
  })

  test('con todo válido envía los valores (incluido el booleano del checkbox)', async () => {
    const onSubmit = vi.fn().mockResolvedValue()
    render(<Demo onSubmit={onSubmit} />)
    await escribir('Nombre', 'Ana')
    await escribir('Correo', 'ana@example.com')
    await userEvent.click(screen.getByLabelText('Acepto'))
    await guardar()
    expect(onSubmit).toHaveBeenCalledWith({ nombre: 'Ana', correo: 'ana@example.com', acepto: true })
  })

  test('un error del servidor sobre un campo se muestra EN el campo, con foco, y sin aviso general', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new ApiError('x', { status: 400, fieldErrors: { correo: 'Ya existe ese correo.' } }))
    render(<Demo onSubmit={onSubmit} />)
    await escribir('Nombre', 'Ana')
    await escribir('Correo', 'ana@example.com')
    await guardar()
    expect(await screen.findByText('Ya existe ese correo.')).toBeInTheDocument()
    expect(screen.getByLabelText('Correo')).toHaveFocus()
    expect(screen.getAllByRole('alert')).toHaveLength(1) // solo el error del campo: no hay aviso general
  })

  test('traducirErrores renombra los campos del backend; uno sin campo visible va al aviso general', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new ApiError('x', { status: 400, fieldErrors: { email: 'Correo repetido.', token: 'El enlace venció.' } }))
    render(<Demo onSubmit={onSubmit} traducirErrores={({ email, ...resto }) => (email ? { ...resto, correo: email } : resto)} />)
    await escribir('Nombre', 'Ana')
    await escribir('Correo', 'ana@example.com')
    await guardar()
    expect(await screen.findByText('Correo repetido.')).toBeInTheDocument()
    expect(screen.getByText('El enlace venció.')).toBeInTheDocument() // `token` no es un campo: no queda mudo
  })

  test('un error sin campos muestra su mensaje en español como aviso general', async () => {
    render(<Demo onSubmit={vi.fn().mockRejectedValue(new ApiError('No se pudo conectar con el servidor.', { status: 0 }))} />)
    await escribir('Nombre', 'Ana')
    await escribir('Correo', 'ana@example.com')
    await guardar()
    expect(await screen.findByText('No se pudo conectar con el servidor.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled() // se puede reintentar
  })

  test('no permite el doble envío mientras uno está en curso', async () => {
    let resolver
    const onSubmit = vi.fn(() => new Promise((r) => (resolver = r)))
    render(<Demo onSubmit={onSubmit} />)
    await escribir('Nombre', 'Ana')
    await escribir('Correo', 'ana@example.com')
    await guardar()
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Correo'), '{Enter}') // Enter dentro del campo también envía
    expect(onSubmit).toHaveBeenCalledTimes(1)
    await act(async () => resolver())
  })

  test('reiniciar vuelve a los valores iniciales y quita los errores', async () => {
    render(<Demo onSubmit={vi.fn()} />)
    await escribir('Nombre', 'Ana')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' })) // falta el correo
    await screen.findByText('Ingresa el correo.')
    await userEvent.click(screen.getByRole('button', { name: 'Reiniciar' }))
    expect(screen.getByLabelText('Nombre')).toHaveValue('')
    expect(screen.queryByText('Ingresa el correo.')).not.toBeInTheDocument()
  })
})
