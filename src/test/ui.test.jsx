import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button, IconButton, Input, Modal, PasswordField, SearchBox, Switch, ToastProvider, useToast } from '../components/ui'

describe('Button', () => {
  test('en carga queda deshabilitado y no dispara onClick', async () => {
    const onClick = vi.fn()
    render(<Button loading onClick={onClick}>Guardar</Button>)
    const b = screen.getByRole('button', { name: /guardar/i })
    expect(b).toBeDisabled()
    expect(b).toHaveAttribute('aria-busy', 'true')
    await userEvent.click(b)
    expect(onClick).not.toHaveBeenCalled()
  })
})

describe('Input', () => {
  test('asocia la etiqueta y expone el error de forma accesible', () => {
    render(<Input label="Correo electrónico" error="Ingresa un correo válido." />)
    const input = screen.getByLabelText('Correo electrónico')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Ingresa un correo válido.')
    expect(screen.getByRole('alert')).toHaveTextContent('Ingresa un correo válido.')
  })

  test('sin error no marca el campo como inválido', () => {
    render(<Input label="Nombre" />)
    expect(screen.getByLabelText('Nombre')).not.toHaveAttribute('aria-invalid')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('PasswordField', () => {
  test('alterna entre mostrar y ocultar la contraseña', async () => {
    render(<PasswordField label="Contraseña" />)
    const input = screen.getByLabelText('Contraseña')
    expect(input).toHaveAttribute('type', 'password')
    await userEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }))
    expect(input).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Ocultar contraseña' })).toBeInTheDocument()
  })
})

describe('Switch', () => {
  test('informa su estado y notifica el cambio', async () => {
    const onChange = vi.fn()
    render(<Switch checked={false} onChange={onChange} label="Usuario activo" />)
    const sw = screen.getByRole('switch', { name: 'Usuario activo' })
    expect(sw).toHaveAttribute('aria-checked', 'false')
    await userEvent.click(sw)
    expect(onChange).toHaveBeenCalledWith(true)
  })
})

describe('Modal', () => {
  function Demo() {
    const [open, setOpen] = useState(false)
    return (
      <>
        <button onClick={() => setOpen(true)}>Abrir</button>
        <Modal open={open} onClose={() => setOpen(false)} title="Cambiar datos" footer={<button>Guardar</button>}>
          <input aria-label="Nombre" />
        </Modal>
      </>
    )
  }

  test('es un diálogo con título, enfoca el primer campo y se cierra con Escape devolviendo el foco', async () => {
    render(<Demo />)
    const abrir = screen.getByRole('button', { name: 'Abrir' })
    await userEvent.click(abrir)
    expect(screen.getByRole('dialog', { name: 'Cambiar datos' })).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByLabelText('Nombre')).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(abrir).toHaveFocus()
  })

  test('mantiene el foco dentro del diálogo al tabular', async () => {
    render(<Demo />)
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }))
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Guardar' })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByLabelText('Nombre')).toHaveFocus()
  })
})

describe('Toast', () => {
  function Demo() {
    const toast = useToast()
    return <button onClick={() => toast.success('Sesión cerrada correctamente.')}>Avisar</button>
  }

  test('muestra el mensaje en una región aria-live', async () => {
    render(<ToastProvider><Demo /></ToastProvider>)
    await userEvent.click(screen.getByRole('button', { name: 'Avisar' }))
    expect(screen.getByText('Sesión cerrada correctamente.').closest('[aria-live]')).toHaveAttribute('aria-live', 'polite')
  })

  test('useToast fuera del proveedor lanza un error claro', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Demo />)).toThrow(/ToastProvider/)
    spy.mockRestore()
  })
})

describe('SearchBox e IconButton', () => {
  test('la búsqueda tiene nombre accesible y recibe texto', async () => {
    render(<SearchBox label="Buscar código o descripción" />)
    const caja = screen.getByRole('searchbox', { name: 'Buscar código o descripción' })
    await userEvent.type(caja, 'ENE')
    expect(caja).toHaveValue('ENE')
  })

  test('el botón de icono se identifica por su etiqueta y responde al clic', async () => {
    const onClick = vi.fn()
    render(<IconButton icon="edit" label="Editar" onClick={onClick} />)
    await userEvent.click(screen.getByRole('button', { name: 'Editar' }))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
