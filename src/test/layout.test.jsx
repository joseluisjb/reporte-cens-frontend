import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ANALISTA, renderApp } from './renderApp'

const menuPrincipal = () => screen.getByRole('navigation', { name: 'Navegación principal' })

describe('menú lateral por rol', () => {
  test('el Administrador ve las 5 opciones, las de administración con etiqueta ADMIN', async () => {
    renderApp('/panel')
    await screen.findByRole('heading', { name: /bienvenido/i })
    const nav = within(menuPrincipal())
    expect(nav.getAllByRole('link')).toHaveLength(5)
    expect(nav.getByRole('link', { name: /gestión de usuarios/i })).toHaveTextContent('ADMIN')
    expect(nav.getByRole('link', { name: /auditoría/i })).toHaveTextContent('ADMIN')
    expect(nav.getByRole('link', { name: /parametrización/i })).toHaveTextContent('ADMIN')
    expect(nav.getByRole('link', { name: /inicio/i })).not.toHaveTextContent('ADMIN')
  })

  test('el Analista de Cartera solo ve Inicio y Extracción', async () => {
    renderApp('/panel', ANALISTA)
    await screen.findByRole('heading', { name: /bienvenido, juan/i })
    const nav = within(menuPrincipal())
    expect(nav.getAllByRole('link').map((a) => a.textContent)).toEqual(['Inicio', 'Extracción de Cartera'])
    expect(nav.queryByRole('link', { name: /usuarios/i })).not.toBeInTheDocument()
  })

  test('marca la página actual con aria-current', async () => {
    renderApp('/extraccion')
    await screen.findByRole('heading', { name: /extracción y consolidación/i })
    expect(within(menuPrincipal()).getByRole('link', { name: /extracción de cartera/i })).toHaveAttribute('aria-current', 'page')
  })

  test('navegar por el menú cambia la pantalla y el título de la pestaña', async () => {
    renderApp('/panel')
    await userEvent.click(within(menuPrincipal()).getByRole('link', { name: /gestión de usuarios/i }))
    expect(await screen.findByRole('heading', { name: 'Usuarios del Sistema' })).toBeInTheDocument()
    expect(document.title).toBe('NexoVolt — Usuarios del Sistema')
  })
})

describe('menú de perfil', () => {
  test('muestra nombre, correo y rol, y se cierra con Escape devolviendo el foco', async () => {
    renderApp('/panel')
    const boton = await screen.findByRole('button', { name: /rosa martínez/i })
    expect(boton).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(boton)
    const menu = screen.getByRole('menu', { name: 'Menú de perfil' })
    expect(within(menu).getByText('rmartinez@cens.com.co')).toBeInTheDocument()
    expect(within(menu).getByRole('menuitem', { name: /cerrar sesión/i })).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(boton).toHaveFocus()
  })

  test('cerrar sesión lleva a la pantalla de inicio de sesión', async () => {
    renderApp('/panel')
    await userEvent.click(await screen.findByRole('button', { name: /rosa martínez/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: /cerrar sesión/i }))
    expect(await screen.findByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(screen.getByText('Sesión cerrada correctamente.')).toBeInTheDocument()
  })

  test('el botón Cerrar sesión de la barra lateral también cierra', async () => {
    renderApp('/panel')
    await screen.findByRole('heading', { name: /bienvenido/i })
    await userEvent.click(within(screen.getByRole('complementary')).getByRole('button', { name: /cerrar sesión/i }))
    expect(await screen.findByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument()
  })
})

describe('menú en pantallas angostas', () => {
  test('el botón hamburguesa abre y cierra el menú lateral', async () => {
    renderApp('/panel')
    await screen.findByRole('heading', { name: /bienvenido/i })
    const hamburguesa = screen.getByRole('button', { name: 'Abrir menú' })
    expect(hamburguesa).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(hamburguesa)
    expect(screen.getByRole('button', { name: 'Cerrar menú' })).toHaveAttribute('aria-expanded', 'true')
    await userEvent.keyboard('{Escape}')
    expect(screen.getByRole('button', { name: 'Abrir menú' })).toBeInTheDocument()
  })
})
