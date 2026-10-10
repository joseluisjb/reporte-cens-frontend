import { useEffect, useId, useState } from 'react'
import { Badge, Card, Icon, PageHeader, Spinner, TextLink } from '../../components/ui'
import { formatearCOP, formatearFechaISO, plural } from '../../lib/format'
import { usePageTitle } from '../../lib/usePageTitle'
import { useAuth } from '../auth/authContext'
import { ROLES } from '../auth/roles'
import { getLatestCut } from '../extraction/extractionService'
import { countActiveUsers } from '../users/usersService'

// Inicio. La tarjeta "Usuarios activos" (RF27) la ve solo el Administrador: el Analista ni la
// muestra ni pide /users/ (el backend le respondería 403). La tarjeta "Última extracción" (RF1, RF44)
// la ven ambos roles y consulta el corte más reciente con getLatestCut().
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
        <TarjetaUltimaExtraccion />
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

function TarjetaUltimaExtraccion() {
  const titleId = useId()
  const [resultado, setResultado] = useState({ estado: 'cargando', corte: null })

  useEffect(() => {
    let cancelado = false
    getLatestCut({ skipAuthRedirect: true }).then(
      (corte) => !cancelado && setResultado({ estado: 'listo', corte }),
      () => !cancelado && setResultado({ estado: 'error', corte: null }),
    )
    return () => {
      cancelado = true
    }
  }, [])

  return (
    <Card as="section" aria-labelledby={titleId} className="p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-citrico">
            <Icon name="refresh" size={22} />
          </span>
          <h2 id={titleId} className="font-semibold">
            Última extracción de cartera
          </h2>
        </div>
        {resultado.estado === 'listo' && resultado.corte && (
          <Badge tone={resultado.corte.esEnviado ? 'ok' : resultado.corte.esValidado ? 'admin' : 'off'}>
            {resultado.corte.estado}
          </Badge>
        )}
      </div>
      <div className="mt-3">
        {resultado.estado === 'cargando' && (
          <div role="status" aria-label="Cargando última extracción">
            <Spinner className="size-5" />
          </div>
        )}
        {resultado.estado === 'listo' && !resultado.corte && (
          <p className="text-sm text-muted">Aún no se ha realizado ninguna extracción.</p>
        )}
        {resultado.estado === 'listo' && resultado.corte && (
          <div className="space-y-1">
            <p className="font-hd text-2xl font-bold text-bosque-d">
              {formatearCOP(resultado.corte.saldoConsolidado)}
            </p>
            <p className="text-sm text-muted">
              Corte al {formatearFechaISO(resultado.corte.fechaCorte)} · {resultado.corte.totalObligaciones}{' '}
              {plural(resultado.corte.totalObligaciones, 'obligación', 'obligaciones')}
            </p>
          </div>
        )}
        {resultado.estado === 'error' && <p className="text-muted">Extracción no disponible</p>}
      </div>
      <TextLink to="/extraccion" className="mt-3 inline-block text-sm">
        Ver extracción
      </TextLink>
    </Card>
  )
}
