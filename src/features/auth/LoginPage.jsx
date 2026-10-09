import { Link } from 'react-router-dom'
import { buttonClasses } from '../../components/ui'
import { usePageTitle } from '../../lib/usePageTitle'
import { RUTA_INICIAL } from '../../app/navigation'

// TEMPORAL (paso 4): el inicio de sesión real se construye en el paso 6 (RF25).
export default function LoginPage() {
  usePageTitle('Iniciar sesión')
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="font-hd text-3xl font-bold text-bosque">
        Nexo<span className="text-citrico">Volt</span>
      </h1>
      <p className="text-muted">Pantalla de inicio de sesión en construcción (RF25).</p>
      <Link to={RUTA_INICIAL} className={buttonClasses()}>
        Volver al inicio
      </Link>
    </main>
  )
}
