import { useEffect, useId, useState } from 'react'
import { Card, Icon, PageHeader, Spinner, TextLink } from '../../components/ui'
import { usePageTitle } from '../../lib/usePageTitle'
import { useAuth } from '../auth/authContext'
import { ROLES } from '../auth/roles'
import { countActiveUsers } from '../users/usersService'

// Inicio. La tarjeta "Usuarios activos" (RF27) la ve solo el Administrador: el Analista ni la
// muestra ni pide /users/ (el backend le respondería 403). La tarjeta "Última extracción" se
// completa cuando exista la pantalla de extracción (Angel).
export default function HomePage() {
  usePageTitle('Inicio')
  const { user } = useAuth()
  const esAdmin = user.rol === ROLES.ADMIN
  const primerNombre = user.nombre.split(' ')[0]
  return (
    <>
      <PageHeader title={`Bienvenido, ${primerNombre}`} />
      <div className="grid gap-4 md:grid-cols-2">
        {esAdmin && <TarjetaUsuariosActivos />}
        <Card className="flex items-start gap-3 p-6">
          <span className="text-citrico">
            <Icon name="refresh" size={22} />
          </span>
          <div>
            <p className="font-semibold">Última extracción de cartera</p>
            <p className="mt-1 text-muted">Pendiente: se muestra cuando exista la pantalla de extracción.</p>
          </div>
        </Card>
      </div>
    </>
  )
}

function TarjetaUsuariosActivos() {
  const titleId = useId()
  const [resultado, setResultado] = useState({ estado: 'cargando', total: 0 })

  useEffect(() => {
    let cancelado = false
    countActiveUsers().then(
      (total) => !cancelado && setResultado({ estado: 'listo', total }),
      () => !cancelado && setResultado({ estado: 'error', total: 0 }),
    )
    return () => {
      cancelado = true
    }
  }, [])

  return (
    <Card as="section" aria-labelledby={titleId} className="p-6">
      <div className="flex items-center gap-3">
        <span className="text-bosque-d">
          <Icon name="user" size={22} />
        </span>
        <h2 id={titleId} className="font-semibold">
          Usuarios activos
        </h2>
      </div>
      <div className="mt-3">
        {resultado.estado === 'cargando' && (
          <div role="status" aria-label="Cargando usuarios activos">
            <Spinner className="size-5" />
          </div>
        )}
        {resultado.estado === 'listo' && <p className="font-hd text-3xl font-bold">{resultado.total}</p>}
        {resultado.estado === 'error' && <p className="text-muted">No disponible</p>}
      </div>
      <TextLink to="/usuarios" className="mt-3 inline-block text-sm">
        Ver usuarios
      </TextLink>
    </Card>
  )
}
