// Pantalla 13 · Reclamos Habeas Data (RF23). Solo Analista de Cartera.
// Prepara el insumo del proceso «Marcación de obligaciones (Reclamos Batch)» de TransUnion (Manual, p. 57).
// «Marcación generada» = ya salió en un archivo; que TransUnion la aplicó lo dice su archivo de radicación.
import { useEffect, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Icon,
  PageHeader,
  PorConfirmar,
  Spinner,
  Table,
  useToast,
} from '../../components/ui'
import { mensajeDeError } from '../../lib/api'
import { formatearFechaISO, plural } from '../../lib/format'
import { usePageTitle } from '../../lib/usePageTitle'
import { downloadClaimBatch, listClaims } from './claimsService'
import CloseClaimModal from './CloseClaimModal'
import RegisterClaimModal from './RegisterClaimModal'

export default function ClaimsPage() {
  usePageTitle('Reclamos Habeas Data')
  const toast = useToast()

  const [reclamos, setReclamos] = useState(null)
  const [error, setError] = useState('')
  const [intento, setIntento] = useState(0)
  const [descargando, setDescargando] = useState(false)

  const [modalRegistrarAbierto, setModalRegistrarAbierto] = useState(false)
  const [reclamoACerrar, setReclamoACerrar] = useState(null)

  const cargando = reclamos === null && !error

  useEffect(() => {
    let cancelado = false
    listClaims()
      .then((datos) => {
        if (cancelado) return
        setError('')
        setReclamos(datos)
      })
      .catch((err) => {
        if (cancelado) return
        setError(mensajeDeError(err))
      })
    return () => {
      cancelado = true
    }
  }, [intento])

  const lista = reclamos || []
  const enReclamoList = lista.filter((r) => r.estadoCodigo === 'EN_RECLAMO')
  const pendientesMarcacion = enReclamoList.filter((r) => !r.marcacionGenerada).length
  const pendientesDesmarcacion = lista.filter(
    (r) => r.estadoCodigo === 'CERRADO' && !r.desmarcacionGenerada
  ).length

  const handleDescargarInsumo = async (tipo) => {
    try {
      setDescargando(true)
      await downloadClaimBatch(tipo)
      const cantidad = tipo === 'marcacion' ? pendientesMarcacion : pendientesDesmarcacion
      toast.success(
        `Archivo de ${tipo === 'marcacion' ? 'marcación' : 'desmarcación'} generado con ${plural(
          cantidad,
          'reclamo',
          'reclamos'
        )}.`
      )
      const datos = await listClaims()
      setReclamos(datos)
    } catch (err) {
      toast.error(`No se pudo generar el archivo. ${mensajeDeError(err)}`)
    } finally {
      setDescargando(false)
    }
  }

  const handleCreado = (nuevo) => {
    setReclamos((prev) => [nuevo, ...(prev || [])])
    toast.success('Reclamo registrado: queda pendiente el archivo de marcación.')
  }

  const handleCerrado = (actualizado) => {
    setReclamos((prev) => (prev || []).map((r) => (r.id === actualizado.id ? actualizado : r)))
    toast.success('Reclamo cerrado: queda pendiente el archivo de desmarcación.')
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHeader title="Reclamos Habeas Data">
        <Button
          variant="outline"
          disabled={pendientesMarcacion === 0 || descargando}
          onClick={() => handleDescargarInsumo('marcacion')}
        >
          <Icon name="file" size={16} />
          <span>Archivo de marcación ({pendientesMarcacion})</span>
        </Button>
        <Button
          variant="outline"
          disabled={pendientesDesmarcacion === 0 || descargando}
          onClick={() => handleDescargarInsumo('desmarcacion')}
        >
          <Icon name="file" size={16} />
          <span>Archivo de desmarcación ({pendientesDesmarcacion})</span>
        </Button>
        <Button variant="primary" onClick={() => setModalRegistrarAbierto(true)}>
          <Icon name="flag" size={16} />
          <span>Registrar reclamo</span>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-card border border-line bg-white p-5">
          <span className="block font-hd text-3xl font-bold">{enReclamoList.length}</span>
          <span className="mt-1 block text-sm text-muted">Obligaciones en reclamo</span>
        </div>
        <div className="rounded-card border border-line bg-white p-5">
          <span className="block font-hd text-3xl font-bold">{pendientesMarcacion}</span>
          <span className="mt-1 block text-sm text-muted">Pendientes de marcación</span>
        </div>
        <div className="rounded-card border border-line bg-white p-5">
          <span className="block font-hd text-3xl font-bold">{pendientesDesmarcacion}</span>
          <span className="mt-1 block text-sm text-muted">Cerrados pendientes de desmarcación</span>
        </div>
      </div>

      <Alert tone="info">
        Una obligación en reclamo <b>se sigue reportando</b> en el archivo mensual. Aquí solo se
        prepara el insumo de la «Marcación de obligaciones (Reclamos Batch)» de TransUnion, para que la
        marque como «en reclamo» y la desmarque al cerrarlo. Se podrá usar cuando TransUnion habilite
        el perfil de marcación.
      </Alert>

      {cargando && (
        <Card className="flex items-center justify-center p-12">
          <Spinner />
        </Card>
      )}

      {error && (
        <Alert tone="error">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>No se pudieron cargar los reclamos. {error}</span>
            <Button size="sm" variant="ghost" onClick={() => setIntento((i) => i + 1)}>
              Reintentar
            </Button>
          </div>
        </Alert>
      )}

      {!cargando && !error && (
        <Card className="overflow-hidden">
          {lista.length === 0 ? (
            <EmptyState>No hay reclamos registrados.</EmptyState>
          ) : (
            <Table compact caption="Reclamos de Habeas Data registrados">
              <thead>
                <tr>
                  <th scope="col">Obligación</th>
                  <th scope="col">Tipología y observación</th>
                  <th scope="col">Fecha del reclamo</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Archivo</th>
                  <th scope="col" className="text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {lista.map((c) => {
                  const enReclamo = c.estadoCodigo === 'EN_RECLAMO'
                  return (
                    <tr key={c.id}>
                      <td className="whitespace-nowrap">
                        <span className="font-mono font-medium text-ink">
                          {c.numeroObligacion}
                        </span>
                        <div className="text-xs text-muted">{c.nombreTitular}</div>
                      </td>
                      <td className="min-w-[220px]">
                        <div className="font-medium text-ink">
                          {c.tipologiaDescripcion}
                          {c.tipologia?.confirmado === false && <PorConfirmar />}
                        </div>
                        {c.observacion && (
                          <div className="text-xs text-muted">{c.observacion}</div>
                        )}
                      </td>
                      <td className="whitespace-nowrap">{formatearFechaISO(c.fechaRadicacion)}</td>
                      <td className="whitespace-nowrap">
                        <Badge tone={enReclamo ? 'aviso' : 'off'}>{c.estado}</Badge>
                        {!enReclamo && c.resultado && (
                          <div className="mt-0.5 text-xs text-muted">
                            {c.resultado} · {formatearFechaISO(c.fechaCierre)}
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap">
                        {enReclamo ? (
                          c.marcacionGenerada ? (
                            <Badge tone="ok">Marcación generada</Badge>
                          ) : (
                            <Badge tone="aviso">Pendiente de marcación</Badge>
                          )
                        ) : c.desmarcacionGenerada ? (
                          <Badge tone="ok">Desmarcación generada</Badge>
                        ) : (
                          <Badge tone="aviso">Pendiente de desmarcación</Badge>
                        )}
                      </td>
                      <td className="whitespace-nowrap text-right">
                        {enReclamo ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setReclamoACerrar(c)}
                          >
                            Cerrar reclamo
                          </Button>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      <RegisterClaimModal
        open={modalRegistrarAbierto}
        onClose={() => setModalRegistrarAbierto(false)}
        onCreado={handleCreado}
      />

      <CloseClaimModal
        open={Boolean(reclamoACerrar)}
        reclamo={reclamoACerrar}
        onClose={() => setReclamoACerrar(null)}
        onCerrado={handleCerrado}
      />
    </section>
  )
}
