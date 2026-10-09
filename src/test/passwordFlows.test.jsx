import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render } from '@testing-library/react'
import ResetPasswordPage from '../features/auth/ResetPasswordPage'
import { ToastProvider } from '../components/ui'
import { MSG, validarCambioPassword, validarRestablecer } from '../features/auth/passwordValidation'
import { TOKEN_RECUPERACION_VALIDO } from '../mocks/db'
import { renderApp } from './renderApp'

const escribir = (etiqueta, texto) => userEvent.type(screen.getByLabelText(etiqueta), texto)
const boton = (nombre) => screen.getByRole('button', { name: nombre })

describe('validaciones de contraseña', () => {
  test('cambio obligatorio: exige los tres campos y valida reglas, coincidencia y que sea distinta', () => {
    expect(validarCambioPassword({ actual: '', nueva: '', repetir: '' })).toEqual({
      actual: MSG.actualVacia,
      nueva: MSG.nuevaVacia,
      repetir: MSG.repetirVacia,
    })
    expect(validarCambioPassword({ actual: 'Temporal123', nueva: 'corta', repetir: 'corta' }).nueva).toBe(MSG.nuevaDebil)
    expect(validarCambioPassword({ actual: 'Temporal123', nueva: 'Nueva12345', repetir: 'Otra12345' }).repetir).toBe(MSG.noCoinciden)
    expect(validarCambioPassword({ actual: 'Temporal123', nueva: 'Temporal123', repetir: 'Temporal123' }).nueva).toBe(MSG.nuevaIgualActual)
    expect(validarCambioPassword({ actual: 'Temporal123', nueva: 'Nueva12345', repetir: 'Nueva12345' })).toEqual({})
  })

  test('restablecer: no pide contraseña actual', () => {
    expect(validarRestablecer({ nueva: 'Nueva12345', repetir: 'Nueva12345' })).toEqual({})
    expect(validarRestablecer({ nueva: '', repetir: '' })).toEqual({ nueva: MSG.nuevaVacia, repetir: MSG.repetirVacia })
  })
})

describe('cambio obligatorio de la contraseña temporal (primer ingreso)', () => {
  async function entrarConTemporal() {
    renderApp('/login', null)
    await userEvent.type(await screen.findByLabelText('Correo electrónico'), 'mgomez@cens.com.co')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'Temporal123')
    await userEvent.click(boton('Iniciar sesión'))
    await screen.findByRole('heading', { name: 'Debes cambiar tu contraseña' })
  }

  test('enviar vacío dice qué falta y enfoca el primer campo', async () => {
    await entrarConTemporal()
    await userEvent.click(boton('Guardar y continuar'))
    expect(screen.getByText(MSG.actualVacia)).toBeInTheDocument()
    expect(screen.getByText(MSG.nuevaVacia)).toBeInTheDocument()
    expect(screen.getByText(MSG.repetirVacia)).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña temporal')).toHaveFocus()
  })

  test('los requisitos se marcan a medida que se escribe la nueva contraseña', async () => {
    await entrarConTemporal()
    const lista = screen.getByRole('list', { name: 'Requisitos de la contraseña' })
    expect(within(lista).getAllByText(/\(pendiente\)/)).toHaveLength(3)
    await escribir('Nueva contraseña', 'Nueva12345')
    expect(within(lista).getAllByText(/\(cumplido\)/)).toHaveLength(3)
  })

  test('una contraseña nueva que no coincide o no cumple se rechaza antes de enviar', async () => {
    await entrarConTemporal()
    await escribir('Contraseña temporal', 'Temporal123')
    await escribir('Nueva contraseña', 'Nueva12345')
    await escribir('Confirmar nueva contraseña', 'Distinta123')
    await userEvent.click(boton('Guardar y continuar'))
    expect(screen.getByText(MSG.noCoinciden)).toBeInTheDocument()
  })

  test('una contraseña temporal equivocada se reporta en su campo (error del servidor)', async () => {
    await entrarConTemporal()
    await escribir('Contraseña temporal', 'Equivocada1')
    await escribir('Nueva contraseña', 'Nueva12345')
    await escribir('Confirmar nueva contraseña', 'Nueva12345')
    await userEvent.click(boton('Guardar y continuar'))
    expect(await screen.findByText('La contraseña actual no es correcta.')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña temporal')).toHaveFocus()
  })

  test('al cambiarla correctamente entra al sistema', async () => {
    await entrarConTemporal()
    await escribir('Contraseña temporal', 'Temporal123')
    await escribir('Nueva contraseña', 'Nueva12345')
    await escribir('Confirmar nueva contraseña', 'Nueva12345')
    await userEvent.click(boton('Guardar y continuar'))
    expect(await screen.findByRole('heading', { name: 'Bienvenido, María' })).toBeInTheDocument()
    expect(screen.getByText('Contraseña actualizada correctamente.')).toBeInTheDocument()
  })

  test('permite cerrar sesión sin cambiar la contraseña', async () => {
    await entrarConTemporal()
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(await screen.findByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument()
  })
})

describe('recuperar contraseña', () => {
  test('valida el correo antes de enviar', async () => {
    renderApp('/recuperar', null)
    await userEvent.click(await screen.findByRole('button', { name: 'Enviar enlace de recuperación' }))
    expect(screen.getByText('Ingresa tu correo electrónico.')).toBeInTheDocument()
    await escribir('Correo electrónico corporativo', 'sin-arroba')
    await userEvent.click(boton('Enviar enlace de recuperación'))
    expect(screen.getByText(/ingresa un correo válido/i)).toBeInTheDocument()
  })

  test.each(['jperez@cens.com.co', 'no-existe@cens.com.co'])('responde igual con %s (no revela si existe)', async (correo) => {
    renderApp('/recuperar', null)
    await userEvent.type(await screen.findByLabelText('Correo electrónico corporativo'), correo)
    await userEvent.click(boton('Enviar enlace de recuperación'))
    expect(await screen.findByRole('heading', { name: 'Enlace enviado' })).toBeInTheDocument()
    expect(screen.getByText(/si el correo está registrado, recibirás un enlace/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /volver al inicio de sesión/i })).toHaveAttribute('href', '/login')
  })
})

describe('restablecer contraseña con el enlace del correo', () => {
  function renderReset(url) {
    return render(
      <ToastProvider>
        <MemoryRouter initialEntries={[url]}>
          <Routes>
            <Route path="/restablecer" element={<ResetPasswordPage />} />
            <Route path="/login" element={<p>Pantalla de login</p>} />
            <Route path="/recuperar" element={<p>Pantalla de recuperar</p>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>,
    )
  }
  const llenar = async (clave) => {
    await escribir('Nueva contraseña', clave)
    await escribir('Confirmar nueva contraseña', clave)
    await userEvent.click(boton('Guardar contraseña'))
  }

  test('sin token el enlace no es válido y ofrece pedir uno nuevo', () => {
    renderReset('/restablecer')
    expect(screen.getByRole('heading', { name: 'Enlace no válido' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Solicitar un nuevo enlace' })).toHaveAttribute('href', '/recuperar')
  })

  test('un token vencido o usado muestra el aviso del servidor', async () => {
    renderReset('/restablecer?token=viejo')
    await llenar('Nueva12345')
    expect(await screen.findByRole('heading', { name: 'Enlace no válido' })).toBeInTheDocument()
    expect(screen.getByText('El enlace no es válido o ya venció.')).toBeInTheDocument()
  })

  test('valida la contraseña nueva antes de enviar', async () => {
    renderReset(`/restablecer?token=${TOKEN_RECUPERACION_VALIDO}`)
    await llenar('corta')
    expect(screen.getByText(MSG.nuevaDebil)).toBeInTheDocument()
    expect(screen.queryByText('Pantalla de login')).not.toBeInTheDocument() // no se envió
  })

  test('con un token válido restablece y lleva al login con aviso', async () => {
    renderReset(`/restablecer?token=${TOKEN_RECUPERACION_VALIDO}`)
    await llenar('Nueva12345')
    expect(await screen.findByText('Pantalla de login')).toBeInTheDocument()
    expect(screen.getByText(/contraseña restablecida/i)).toBeInTheDocument()
  })
})
