import { Card, Icon, PageHeader } from '../../components/ui'
import { usePageTitle } from '../../lib/usePageTitle'
import { useAuth } from '../auth/authContext'

// Inicio. La tarjeta "Última extracción" se completa cuando exista la pantalla de extracción (Angel).
export default function HomePage() {
  usePageTitle('Inicio')
  const { user } = useAuth()
  const primerNombre = user.nombre.split(' ')[0]
  return (
    <>
      <PageHeader title={`Bienvenido, ${primerNombre}`} />
      <Card className="flex items-start gap-3 p-6">
        <span className="text-citrico">
          <Icon name="refresh" size={22} />
        </span>
        <div>
          <p className="font-semibold">Última extracción de cartera</p>
          <p className="mt-1 text-muted">Pendiente: se muestra cuando exista la pantalla de extracción.</p>
        </div>
      </Card>
    </>
  )
}
