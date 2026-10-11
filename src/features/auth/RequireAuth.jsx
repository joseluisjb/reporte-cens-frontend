import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Spinner } from '../../components/ui'
import { RUTA_LOGIN } from '../../app/navigation'
import { useAuth } from './authContext'
import InactivityGuard from './InactivityGuard'

export const RUTA_CAMBIO_PASSWORD = '/cambio-password'

// Pasado este tiempo cargando se avisa del arranque en frío del servidor (Render lo duerme si no se usa).
export const AVISO_LENTO_MS = 5000

function Cargando() {
  const [lento, setLento] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setLento(true), AVISO_LENTO_MS)
    return () => clearTimeout(id)
  }, [])
  return (
    <div role="status" aria-label="Cargando" className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <Spinner className="size-7" />
      {lento && (
        <p className="text-sm text-muted">
          Conectando con el servidor… la primera conexión del día puede tardar hasta un minuto.
        </p>
      )}
    </div>
  )
}

// Guard de sesión: sin sesión no se abre ninguna pantalla interna (criterio de RF25).
// Un usuario con contraseña temporal solo puede ver la pantalla de cambio (RF28).
// Vigila la inactividad de toda sesión abierta (RF26).
export default function RequireAuth() {
  const { user, status, motivoSalida } = useAuth()
  const location = useLocation()

  if (status === 'cargando') return <Cargando />
  if (!user) {
    return <Navigate to={RUTA_LOGIN} replace state={motivoSalida === 'manual' ? null : { from: location }} />
  }
  const enCambio = location.pathname === RUTA_CAMBIO_PASSWORD
  if (user.debeCambiarPassword && !enCambio) return <Navigate to={RUTA_CAMBIO_PASSWORD} replace />
  if (!user.debeCambiarPassword && enCambio) return <Navigate to="/panel" replace />
  return (
    <>
      <InactivityGuard />
      <Outlet />
    </>
  )
}
