import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from '../features/auth/LoginPage'
import CatalogPage from './CatalogPage'
import AppLayout from './layout/AppLayout'
import { NAV_ITEMS, RUTA_INICIAL } from './navigation'

// Rutas públicas arriba; todas las internas cuelgan de AppLayout y salen de NAV_ITEMS.
// Paso 7: aquí se envuelve AppLayout con el guard de sesión y de rol.
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/catalogo" element={<CatalogPage />} />
      <Route element={<AppLayout />}>
        {NAV_ITEMS.map(({ path, Page }) => (
          <Route key={path} path={path} element={<Page />} />
        ))}
      </Route>
      <Route path="*" element={<Navigate to={RUTA_INICIAL} replace />} />
    </Routes>
  )
}
