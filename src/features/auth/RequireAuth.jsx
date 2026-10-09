import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Spinner } from '../../components/ui'
import { RUTA_LOGIN } from '../../app/navigation'
import { useAuth } from './authContext'

export const RUTA_CAMBIO_PASSWORD = '/cambio-password'

// Guard de sesión: sin sesión no se abre ninguna pantalla interna (criterio de RF25).
// Un usuario con contraseña temporal solo puede ver la pantalla de cambio (RF28).
// Paso 7: aquí se suma el guard por rol.
export default function RequireAuth() {
  const { user, status, salidaManual } = useAuth()
  const location = useLocation()

  if (status === 'cargando') {
    return (
      <div role="status" aria-label="Cargando" className="flex min-h-screen items-center justify-center">
        <Spinner className="size-7" />
      </div>
    )
  }
  if (!user) {
    return <Navigate to={RUTA_LOGIN} replace state={salidaManual ? null : { from: location }} />
  }
  const enCambio = location.pathname === RUTA_CAMBIO_PASSWORD
  if (user.debeCambiarPassword && !enCambio) return <Navigate to={RUTA_CAMBIO_PASSWORD} replace />
  if (!user.debeCambiarPassword && enCambio) return <Navigate to="/panel" replace />
  return <Outlet />
}
