// Guard por rol (RF27). Si el rol del usuario no está permitido, se redirige al inicio y la página
// ni siquiera se carga. Esto es solo experiencia de usuario: la seguridad real la aplica el backend,
// que responde 403 a los endpoints de otro rol.
import { Navigate } from 'react-router-dom'
import { RUTA_INICIAL } from '../../app/navigation'
import { useAuth } from './authContext'

export default function RequireRole({ roles, children }) {
  const { user } = useAuth()
  if (!roles.includes(user.rol)) return <Navigate to={RUTA_INICIAL} replace />
  return children
}
