import { Card, Icon, PageHeader } from '../components/ui'
import { usePageTitle } from '../lib/usePageTitle'

// Pantalla pendiente. Quien la construya reemplaza el contenido de su página en features/<modulo>/.
export default function PlaceholderPage({ title, responsable, rf, children }) {
  usePageTitle(title)
  return (
    <>
      <PageHeader title={title} />
      <Card className="flex items-start gap-3 p-6">
        <span className="text-citrico">
          <Icon name="layers" size={22} />
        </span>
        <div>
          <p className="font-semibold">Pantalla en construcción</p>
          <p className="mt-1 text-muted">
            Responsable: {responsable} · {rf}
          </p>
          {children}
        </div>
      </Card>
    </>
  )
}
