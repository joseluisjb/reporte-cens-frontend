import { Navigate, Route, Routes } from 'react-router-dom'
import ChangePasswordPage from '../features/auth/ChangePasswordPage'
import LoginPage from '../features/auth/LoginPage'
import RecoverPasswordPage from '../features/auth/RecoverPasswordPage'
import RequireAuth from '../features/auth/RequireAuth'
import ResetPasswordPage from '../features/auth/ResetPasswordPage'
import RequireRole from '../features/auth/RequireRole'
import CatalogPage from './CatalogPage'
import AppLayout from './layout/AppLayout'
import { NAV_ITEMS, RUTA_INICIAL } from './navigation'

// Públicas arriba. Las internas cuelgan de RequireAuth (sin sesión → /login) y salen de NAV_ITEMS.
// Las pantallas con `roles` (navigation.js) solo las abre ese rol, también escribiendo la dirección.
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/recuperar" element={<RecoverPasswordPage />} />
      <Route path="/restablecer" element={<ResetPasswordPage />} />
      <Route path="/catalogo" element={<CatalogPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/cambio-password" element={<ChangePasswordPage />} />
        <Route element={<AppLayout />}>
          {NAV_ITEMS.map(({ path, label, roles, Page }) => (
            <Route
              key={path}
              path={path}
              element={
                roles ? (
                  <RequireRole roles={roles} seccion={label}>
                    <Page />
                  </RequireRole>
                ) : (
                  <Page />
                )
              }
            />
          ))}
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={RUTA_INICIAL} replace />} />
    </Routes>
  )
}
