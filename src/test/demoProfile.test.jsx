import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ADMIN, ANALISTA, renderApp, renderConSesion } from './renderApp'

// Activa el atajo de demostración (en el build real DEMO_ACTIVO es false y el código no existe).
vi.mock('../lib/config', async (importOriginal) => ({ ...(await importOriginal()), DEMO_ACTIVO: true }))

describe('Cambiar de perfil (solo demostración)', () => {
  test('alterna de Analista a Administrador y el menú y las rutas cambian', async () => {
    renderApp('/usuarios', ANALISTA)
    await screen.findByRole('heading', { name: 'Bienvenido, Juan' })
    await userEvent.click(screen.getByRole('button', { name: /juan pérez/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: /cambiar de perfil/i }))
    const dialogo = screen.getByRole('dialog', { name: 'Cambiar de perfil' })
    const confirmar = within(dialogo).getByRole('button', { name: 'Cambiar perfil' })
    expect(confirmar).toBeDisabled() // el perfil actual ya está elegido
    await userEvent.click(within(dialogo).getByRole('radio', { name: /rosa martínez/i }))
    await userEvent.click(confirmar)
    await userEvent.click(await screen.findByRole('link', { name: /gestión de usuarios/i }))
    expect(await screen.findByRole('heading', { name: 'Usuarios del Sistema' })).toBeInTheDocument()
    await screen.findByText('Juan Pérez') // deja terminar la carga de la lista
    expect(screen.getByText(/ahora estás usando el perfil: rosa martínez · administrador/i)).toBeInTheDocument()
  })

  // Con sesión real en el mock: al cambiar de perfil, la pantalla 9 pide sus datos como Analista.
  test('en una pantalla del Analista, el Administrador cambia de perfil y la pantalla se abre (Iteración 2)', async () => {
    await renderConSesion('/obligaciones')
    expect(await screen.findByRole('heading', { name: 'Bienvenido, Rosa' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /rosa martínez/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: /cambiar de perfil/i }))
    const dialogo = screen.getByRole('dialog', { name: 'Cambiar de perfil' })
    await userEvent.click(within(dialogo).getByRole('radio', { name: /juan pérez/i }))
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Cambiar perfil' }))
    await userEvent.click(await screen.findByRole('link', { name: /obligaciones y estados/i }))
    expect(await screen.findByRole('heading', { name: 'Obligaciones y Estados' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Ver el detalle de la obligación 2257-4156' })).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('status', { name: /^Cargando/ })).not.toBeInTheDocument())
  })

  test('desde el menú de perfil también está disponible y devuelve el foco al botón del perfil', async () => {
    renderApp('/panel', ADMIN)
    const botonPerfil = await screen.findByRole('button', { name: /rosa martínez/i })
    await userEvent.click(botonPerfil)
    await userEvent.click(screen.getByRole('menuitem', { name: /cambiar de perfil/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(botonPerfil).toHaveFocus()
  })
})
