// Revisión de accesibilidad automática de las pantallas de Johan (login, sesión, contraseñas,
// usuarios, acceso restringido y diálogos). Cada prueba corre axe-core sobre la pantalla real.
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expectAccesible } from './axe'
import { ANALISTA, renderApp, renderConSesion } from './renderApp'

const boton = (nombre) => screen.getByRole('button', { name: nombre })

describe('pantallas públicas', () => {
  test('inicio de sesión', async () => {
    renderApp('/login', null)
    await screen.findByRole('button', { name: 'Iniciar sesión' })
    await expectAccesible()
  })

  test('inicio de sesión con errores de validación y aviso de salida', async () => {
    renderApp('/login', null)
    await userEvent.click(await screen.findByRole('button', { name: 'Iniciar sesión' }))
    await screen.findByText('Ingresa tu correo electrónico.')
    await expectAccesible()
  })

  test('recuperar contraseña y "Enlace enviado"', async () => {
    renderApp('/recuperar', null)
    await screen.findByRole('button', { name: 'Enviar enlace de recuperación' })
    await expectAccesible()
    await userEvent.type(screen.getByLabelText('Correo electrónico corporativo'), 'a@cens.com.co')
    await userEvent.click(boton('Enviar enlace de recuperación'))
    await screen.findByRole('heading', { name: 'Enlace enviado' })
    await expectAccesible()
  })

  test('restablecer contraseña (con token y sin token)', async () => {
    renderApp('/restablecer?token=abc', null)
    await screen.findByRole('button', { name: 'Guardar contraseña' })
    await expectAccesible()
  })

  test('restablecer sin token', async () => {
    renderApp('/restablecer', null)
    await screen.findByRole('heading', { name: 'Enlace no válido' })
    await expectAccesible()
  })
})

describe('pantallas con sesión', () => {
  test('cambio obligatorio de contraseña, también con errores', async () => {
    await renderConSesion('/panel', 'mgomez@cens.com.co', 'Temporal123')
    await screen.findByRole('heading', { name: 'Debes cambiar tu contraseña' })
    await expectAccesible()
    await userEvent.click(boton('Guardar y continuar'))
    await screen.findByText('Ingresa tu contraseña temporal.')
    await expectAccesible()
  })

  test('inicio (Administrador)', async () => {
    renderApp('/panel')
    await screen.findByRole('heading', { name: 'Bienvenido, Rosa' })
    await expectAccesible()
  })

  test('inicio (Administrador) con la tarjeta de usuarios activos cargada', async () => {
    await renderConSesion('/panel')
    const tarjeta = await screen.findByRole('region', { name: 'Usuarios activos' })
    await within(tarjeta).findByText('6')
    await expectAccesible()
  })

  test('gestión de usuarios con datos', async () => {
    await renderConSesion('/usuarios')
    await screen.findByText('Juan Pérez')
    await expectAccesible()
  })

  test('panel lateral "Crear usuario", con errores', async () => {
    await renderConSesion('/usuarios')
    await screen.findByText('Juan Pérez')
    await userEvent.click(boton('Crear usuario'))
    await userEvent.click(within_dialog().getByRole('button', { name: 'Crear usuario' }))
    await screen.findByText('Ingresa el nombre completo.')
    await expectAccesible()
  })

  test('parametrización de conceptos con datos', async () => {
    await renderConSesion('/parametrizacion')
    await screen.findByText('CUOTA FINANCIACION ENERGIA')
    await expectAccesible()
  })

  test('panel lateral "Agregar concepto"', async () => {
    await renderConSesion('/parametrizacion')
    await screen.findByText('CUOTA FINANCIACION ENERGIA')
    await userEvent.click(boton('Agregar concepto'))
    await screen.findByRole('heading', { name: 'Agregar concepto de energía' })
    await expectAccesible()
  })

  test('confirmación de desactivar concepto', async () => {
    await renderConSesion('/parametrizacion')
    await screen.findByText('CUOTA FINANCIACION ENERGIA')
    await userEvent.click(screen.getByRole('switch', { name: 'Concepto 30 activo' }))
    await screen.findByRole('alertdialog', { name: 'Desactivar concepto de energía' })
    await expectAccesible()
  })

  test('acceso restringido (Analista)', async () => {
    renderApp('/usuarios', ANALISTA)
    await screen.findByRole('heading', { name: 'Acceso restringido' })
    await expectAccesible()
  })

  test('menú de perfil abierto', async () => {
    renderApp('/panel')
    await userEvent.click(await screen.findByRole('button', { name: /rosa martínez/i }))
    await screen.findByRole('menu')
    await expectAccesible()
  })

  test('catálogo de componentes', async () => {
    renderApp('/catalogo', null)
    await screen.findByRole('heading', { name: 'Catálogo de componentes' })
    await expectAccesible()
  })
})

import { within } from '@testing-library/react'
const within_dialog = () => within(screen.getByRole('dialog'))
