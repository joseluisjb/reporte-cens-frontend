import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card, Icon, buttonClasses } from '../../components/ui'
import { RUTA_INICIAL } from '../../app/navigation'
import { DEMO_ACTIVO } from '../../lib/config'
import { usePageTitle } from '../../lib/usePageTitle'
import { useAuth } from './authContext'
import SwitchProfileModal from './SwitchProfileModal'

// Pantalla "Acceso restringido" de la maqueta. Se muestra en el lugar de la sección bloqueada
// (la dirección no cambia) y dentro del layout, para que el usuario pueda seguir navegando.
export default function AccessRestrictedPage({ seccion }) {
  usePageTitle('Acceso restringido')
  const { user } = useAuth()
  const [cambiando, setCambiando] = useState(false)
  return (
    <Card className="mx-auto my-12 max-w-130 p-9 text-center">
      <span className="mb-4 flex justify-center text-bosque">
        <Icon name="lock" size={40} />
      </span>
      <h1 className="mb-2 font-hd text-2xl font-bold">Acceso restringido</h1>
      <p className="mb-6 text-sm text-muted">
        La sección «{seccion}» es exclusiva del rol Administrador. Tu perfil actual es <b>{user.rol}</b>.
      </p>
      <div className="flex flex-wrap justify-center gap-2.5">
        {DEMO_ACTIVO && (
          <>
            <Button onClick={() => setCambiando(true)}>
              <Icon name="swap" size={16} />
              Cambiar de perfil
            </Button>
            <SwitchProfileModal open={cambiando} onClose={() => setCambiando(false)} />
          </>
        )}
        <Link to={RUTA_INICIAL} className={buttonClasses({ variant: DEMO_ACTIVO ? 'ghost' : 'primary' })}>
          Volver al inicio
        </Link>
      </div>
    </Card>
  )
}
