// TEMPORAL (paso 9): recuperación de contraseña (RF29).
import { Card, Icon, TextLink } from '../../components/ui'
import { usePageTitle } from '../../lib/usePageTitle'

export default function RecoverPasswordPage() {
  usePageTitle('Recuperar contraseña')
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F4F3F7] p-8">
      <Card className="w-full max-w-105 p-10 text-center">
        <span className="mb-4 flex justify-center text-bosque">
          <Icon name="mail" size={40} />
        </span>
        <h1 className="mb-2 font-hd text-2xl font-bold">Recuperar contraseña</h1>
        <p className="text-muted">Pantalla en construcción (RF29).</p>
        <TextLink to="/login" block>
          ← Volver al inicio de sesión
        </TextLink>
      </Card>
    </main>
  )
}
