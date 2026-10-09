// TEMPORAL (paso 9): el formulario de cambio obligatorio de contraseña (RF28) se construye después
// (estructura: Johan, formulario: Omar). RequireAuth ya obliga a llegar aquí en el primer ingreso.
import { Button, Card, Icon } from '../../components/ui'
import { usePageTitle } from '../../lib/usePageTitle'
import { useAuth } from './authContext'

export default function ChangePasswordPage() {
  usePageTitle('Cambio de contraseña')
  const { logout } = useAuth()
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F4F3F7] p-8">
      <Card className="w-full max-w-110 p-10 text-center">
        <span className="mb-4 flex justify-center text-bosque">
          <Icon name="lock" size={40} />
        </span>
        <h1 className="mb-2 font-hd text-2xl font-bold">Debes cambiar tu contraseña</h1>
        <p className="mb-6 text-muted">Formulario de cambio obligatorio en construcción (RF28).</p>
        <Button variant="ghost" onClick={logout}>
          Cerrar sesión
        </Button>
      </Card>
    </main>
  )
}
