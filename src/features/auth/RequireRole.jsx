// Guard por rol (RF27). Si el rol del usuario no está permitido, en lugar de la pantalla se muestra
// "Acceso restringido" (la página ni siquiera se carga). Esto es solo experiencia de usuario:
// la seguridad real la aplica el backend, que responde 403 a los endpoints de administración.
import AccessRestrictedPage from './AccessRestrictedPage'
import { useAuth } from './authContext'

export default function RequireRole({ roles, seccion, children }) {
  const { user } = useAuth()
  if (!roles.includes(user.rol)) return <AccessRestrictedPage seccion={seccion} />
  return children
}
