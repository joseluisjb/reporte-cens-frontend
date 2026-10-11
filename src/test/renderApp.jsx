import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AppRoutes from '../app/AppRoutes'
import { ToastProvider } from '../components/ui'
import AuthProvider from '../features/auth/AuthProvider'
import { login as loginRequest } from '../features/auth/authService'
import { ROLES } from '../features/auth/roles'

export const ADMIN = { nombre: 'Rosa Martínez', correo: 'rmartinez@example.com', rol: ROLES.ADMIN }
export const ANALISTA = { nombre: 'Juan Pérez', correo: 'jperez@example.com', rol: ROLES.ANALISTA }

// Inicia sesión de verdad contra el backend simulado y renderiza. Úsalo cuando la pantalla hace
// llamadas a la API: con `initialUser` el servidor simulado no tiene sesión y respondería 401.
export async function renderConSesion(ruta, email = 'rmartinez@example.com', password = 'Admin12345') {
  await loginRequest(email, password)
  return renderApp(ruta, null)
}

// Renderiza la app completa en una ruta. Con un usuario ya autenticado; con user = null arranca
// sin sesión y el flujo (login, /me) corre contra el backend simulado.
export function renderApp(ruta = '/panel', user = ADMIN) {
  return render(
    <ToastProvider>
      <AuthProvider initialUser={user}>
        <MemoryRouter initialEntries={[ruta]}>
          <AppRoutes />
        </MemoryRouter>
      </AuthProvider>
    </ToastProvider>,
  )
}
