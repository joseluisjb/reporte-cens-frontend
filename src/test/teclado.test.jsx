// Teclado y lectores de pantalla en lo que construyó Johan.
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp, renderConSesion } from './renderApp'

describe('inicio de sesión con teclado', () => {
  test('el orden de Tab es correo → contraseña → mostrar → iniciar sesión → olvidé mi contraseña', async () => {
    renderApp('/login', null)
    await screen.findByRole('button', { name: 'Iniciar sesión' })
    await userEvent.tab()
    expect(screen.getByLabelText('Correo electrónico')).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByLabelText('Contraseña')).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Mostrar contraseña' })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('link', { name: '¿Olvidaste tu contraseña?' })).toHaveFocus()
  })

  test('se puede iniciar sesión solo con el teclado (Enter)', async () => {
    renderApp('/login', null)
    await screen.findByRole('button', { name: 'Iniciar sesión' })
    await userEvent.tab()
    await userEvent.keyboard('rmartinez@example.com')
    await userEvent.tab()
    await userEvent.keyboard('Admin12345{Enter}')
    expect(await screen.findByRole('heading', { name: 'Bienvenido, Rosa' })).toBeInTheDocument()
  })

  test('los campos obligatorios se anuncian como requeridos', async () => {
    renderApp('/login', null)
    await screen.findByRole('button', { name: 'Iniciar sesión' })
    expect(screen.getByLabelText('Correo electrónico')).toBeRequired()
    expect(screen.getByLabelText('Contraseña')).toBeRequired()
  })

  test('un campo con error queda descrito por su mensaje', async () => {
    renderApp('/login', null)
    await userEvent.click(await screen.findByRole('button', { name: 'Iniciar sesión' }))
    expect(screen.getByLabelText('Correo electrónico')).toHaveAccessibleDescription('Ingresa tu correo electrónico.')
  })
})

describe('estructura de las pantallas internas', () => {
  test('hay un enlace "Saltar al contenido" que apunta a la zona principal', async () => {
    renderApp('/panel')
    await screen.findByRole('heading', { name: 'Bienvenido, Rosa' })
    const salto = screen.getByRole('link', { name: 'Saltar al contenido' })
    expect(salto).toHaveAttribute('href', '#contenido')
    const principal = screen.getByRole('main')
    expect(principal).toHaveAttribute('id', 'contenido')
    expect(principal).toHaveAttribute('tabindex', '-1')
  })

  test('el salto es lo primero que recibe el foco con Tab', async () => {
    renderApp('/panel')
    await screen.findByRole('heading', { name: 'Bienvenido, Rosa' })
    await userEvent.tab()
    expect(screen.getByRole('link', { name: 'Saltar al contenido' })).toHaveFocus()
  })

  test('cada cambio de pantalla se anuncia a los lectores de pantalla', async () => {
    await renderConSesion('/panel')
    await screen.findByRole('heading', { name: /bienvenido/i })
    const anuncio = screen.getAllByRole('status').find((el) => el.className.includes('sr-only'))
    await userEvent.click(within(screen.getByRole('navigation', { name: 'Navegación principal' })).getByRole('link', { name: /extracción/i }))
    await screen.findByRole('heading', { name: /extracción y consolidación/i })
    await waitFor(() => expect(anuncio).toHaveTextContent('NexoVolt — Extracción y Consolidación de Cartera'))
    await screen.findByText('TITULAR FICTICIO 01') // deja terminar la carga de obligaciones
  })

  test('la navegación y el menú de perfil se pueden recorrer con el teclado', async () => {
    renderApp('/panel')
    await screen.findByRole('heading', { name: 'Bienvenido, Rosa' })
    const perfil = screen.getByRole('button', { name: /rosa martínez/i })
    perfil.focus()
    await userEvent.keyboard('{Enter}')
    expect(screen.getByRole('menuitem', { name: /cerrar sesión/i })).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    expect(perfil).toHaveFocus()
  })
})

describe('usuarios: tabla y diálogos', () => {
  test('la tabla tiene nombre y encabezados de columna', async () => {
    await renderConSesion('/usuarios')
    await screen.findByText('Juan Pérez')
    const tabla = screen.getByRole('table', { name: 'Usuarios del sistema' })
    const columnas = within(tabla).getAllByRole('columnheader')
    expect(columnas).toHaveLength(6)
    columnas.forEach((c) => expect(c).toHaveAttribute('scope', 'col'))
  })

  test('el aviso de desactivar es un alertdialog descrito por su mensaje y devuelve el foco al cancelar', async () => {
    await renderConSesion('/usuarios')
    await screen.findByText('Juan Pérez')
    const interruptor = screen.getByRole('switch', { name: 'Usuario Carlos Sánchez activo' })
    await userEvent.click(interruptor)
    const aviso = screen.getByRole('alertdialog', { name: 'Desactivar usuario' })
    expect(aviso).toHaveAccessibleDescription(/no podrá iniciar sesión/i)
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(interruptor).toHaveFocus()
  })

  test('el panel de crear usuario marca nombre y correo como requeridos y atrapa el foco', async () => {
    await renderConSesion('/usuarios')
    await screen.findByText('Juan Pérez')
    await userEvent.click(screen.getByRole('button', { name: 'Crear usuario' }))
    const panel = screen.getByRole('dialog', { name: 'Crear nuevo usuario' })
    expect(within(panel).getByLabelText('Nombre completo')).toBeRequired()
    expect(within(panel).getByLabelText('Correo corporativo')).toBeRequired()
    expect(within(panel).getByLabelText('Nombre completo')).toHaveFocus()
    await userEvent.tab({ shift: true }) // desde el primero, hacia atrás: sigue dentro del panel
    expect(panel).toContainElement(document.activeElement)
  })
})

describe('contraseñas', () => {
  test('los requisitos describen el campo de la nueva contraseña', async () => {
    await renderConSesion('/panel', 'mgomez@example.com', 'Temporal123')
    await screen.findByRole('heading', { name: 'Debes cambiar tu contraseña' })
    expect(screen.getByLabelText('Nueva contraseña')).toHaveAccessibleDescription(/mínimo 8 caracteres/i)
  })
})
