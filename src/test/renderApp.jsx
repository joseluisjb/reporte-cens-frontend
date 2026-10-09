import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AppRoutes from '../app/AppRoutes'
import { ToastProvider } from '../components/ui'
import AuthProvider from '../features/auth/AuthProvider'
import { ROLES } from '../features/auth/roles'

export const ADMIN = { nombre: 'Rosa Martínez', correo: 'rmartinez@cens.com.co', rol: ROLES.ADMIN }
export const ANALISTA = { nombre: 'Juan Pérez', correo: 'jperez@cens.com.co', rol: ROLES.ANALISTA }

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
