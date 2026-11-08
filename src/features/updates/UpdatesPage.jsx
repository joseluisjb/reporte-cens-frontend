// Novedades Urgentes (pantalla 14, HU-C · RF24, RF50, RF55), solo Analista de Cartera.
// Mockup v3: vNovedades.
import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Icon,
  PageHeader,
  Spinner,
  Table,
  useToast,
} from '../../components/ui'
import { mensajeDeError } from '../../lib/api'
import { formatearFechaISO } from '../../lib/format'
import { usePageTitle } from '../../lib/usePageTitle'
import ManageNoveltyModal from './ManageNoveltyModal'
import NewNoveltyModal from './NewNoveltyModal'
import ReactivateModal from './ReactivateModal'
import { listEliminations, listNovelties } from './updatesService'

const BADGE_TIPO = {
  Inclusión: 'ok',
  Actualización: 'info',
  Corrección: 'aviso',
  Eliminación: 'error',
}

const BADGE_ESTADO = {
  Pendiente: 'aviso',
  Gestionada: 'ok',
  Rechazada: 'off',
}

export default function UpdatesPage() {
  usePageTitle('Novedades Urgentes')
  const toast = useToast()

  const [novedades, setNovedades] = useState(null)
  const [eliminaciones, setEliminaciones] = useState([])
  const [error, setError] = useState('')
  const [pestaña, setPestaña] = useState('todas')
  const [intento, setIntento] = useState(0)

  const [modalNuevaAbierto, setModalNuevaAbierto] = useState(false)
  const [novedadGestionar, setNovedadGestionar] = useState(null)
  const [elimReactivar, setElimReactivar] = useState(null)

  const cargando = novedades === null && !error

  useEffect(() => {
    let cancelado = false

    Promise.all([listNovelties(), listEliminations()])
      .then(([novs, elims]) => {
        if (cancelado) return
        setNovedades(novs)
        setEliminaciones(elims)
        setError('')
      })
      .catch((err) => {
        if (cancelado) return
        setError(mensajeDeError(err))
        setNovedades([])
        setEliminaciones([])
      })

    return () => {
      cancelado = true
    }
  }, [intento])

  const recargar = useCallback(() => {
    setError('')
    setNovedades(null)
    setIntento((n) => n + 1)
  }, [])

  const abrirActualizacionEnLinea = () => {
    toast.info('Se abriría el módulo web Actualización en Línea de TransUnion en una pestaña nueva.')
  }

  const novedadesSeguras = novedades ?? []
  const contadores = {
    todas: novedadesSeguras.length,
    pendientes: novedadesSeguras.filter((n) => n.estado === 'Pendiente').length,
    gestionadas: novedadesSeguras.filter((n) => n.estado === 'Gestionada').length,
  }

  const listaFiltrada = novedadesSeguras.filter((n) => {
    if (pestaña === 'pendientes') return n.estado === 'Pendiente'
    if (pestaña === 'gestionadas') return n.estado === 'Gestionada'
    return true
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Novedades Urgentes">
        <Button variant="outline" onClick={() => setModalNuevaAbierto(true)}>
          <Icon name="plus" size={16} />
          Registrar novedad
        </Button>
        <Button variant="primary" onClick={abrirActualizacionEnLinea}>
          <Icon name="link" size={16} />
          Abrir Actualización en Línea
        </Button>
      </PageHeader>

      <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
          <Icon name="clock" size={20} />
        </div>
        <p className="text-sm text-slate-700 leading-relaxed">
          Las novedades urgentes no esperan al corte mensual: se hacen de inmediato en el módulo web{' '}
          <b>Actualización en Línea</b> de TransUnion. Lo que se gestione aquí se tiene en cuenta en el{' '}
          <b>próximo reporte mensual</b> (RF24). Las correcciones de un corte ya enviado se registran
          como «Corrección» (RF55).
        </p>
      </div>

      {error && (
        <div className="flex flex-wrap items-center gap-3">
          <Alert tone="error">{error}</Alert>
          <Button variant="outline" size="sm" onClick={recargar}>
            Reintentar
          </Button>
        </div>
      )}

      {/* Selector de pestañas */}
      <div className="flex items-center gap-2" role="group" aria-label="Filtrar novedades">
        <button
          type="button"
          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
            pestaña === 'todas'
              ? 'bg-bosque text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
          aria-pressed={pestaña === 'todas'}
          onClick={() => setPestaña('todas')}
        >
          Todas ({contadores.todas})
        </button>
        <button
          type="button"
          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
            pestaña === 'pendientes'
              ? 'bg-bosque text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
          aria-pressed={pestaña === 'pendientes'}
          onClick={() => setPestaña('pendientes')}
        >
          Pendientes ({contadores.pendientes})
        </button>
        <button
          type="button"
          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
            pestaña === 'gestionadas'
              ? 'bg-bosque text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
          aria-pressed={pestaña === 'gestionadas'}
          onClick={() => setPestaña('gestionadas')}
        >
          Gestionadas ({contadores.gestionadas})
        </button>
      </div>

      {/* Tabla de novedades */}
      <Card>
        {cargando ? (
          <div role="status" aria-label="Cargando novedades" className="flex items-center justify-center p-12">
            <Spinner size={32} />
          </div>
        ) : listaFiltrada.length === 0 ? (
          <EmptyState
            title="No hay novedades en esta vista"
            description="Las novedades registradas aparecerán clasificadas según su estado."
          />
        ) : (
          <Table aria-label="Novedades registradas">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Referencia</th>
                <th>Motivo</th>
                <th>Detectada y origen</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {listaFiltrada.map((n) => (
                <tr key={n.id}>
                  <td>
                    <Badge tone={BADGE_TIPO[n.tipo] || 'info'}>{n.tipo}</Badge>
                  </td>
                  <td>
                    <span className="font-mono font-medium text-slate-900">{n.referencia}</span>
                    <div className="text-xs text-slate-500">{n.sujeto}</div>
                  </td>
                  <td className="min-w-[240px]">
                    <div className="text-slate-800">{n.motivo}</div>
                    {n.corteId && (
                      <div className="text-xs text-slate-500 mt-0.5">
                        Rectifica el corte {formatearFechaISO(n.fechaCorte)} · {n.medio} (RF55)
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="text-slate-800">{formatearFechaISO(n.fechaDeteccion)}</div>
                    <div className="text-xs text-slate-500">{n.origen}</div>
                  </td>
                  <td>
                    <Badge tone={BADGE_ESTADO[n.estado] || 'off'}>{n.estado}</Badge>
                  </td>
                  <td>
                    {n.estado === 'Pendiente' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        aria-label={`Gestionar novedad ${n.referencia}`}
                        onClick={() => setNovedadGestionar(n)}
                      >
                        <Icon name="link" size={14} />
                        Gestionar en línea
                      </Button>
                    ) : (
                      <div className="text-xs text-slate-600">
                        {n.numeroTransaccionTu ? (
                          <>
                            <span className="font-mono font-medium">
                              Confirmación {n.numeroTransaccionTu}
                            </span>
                            <br />
                            {formatearFechaISO(n.fechaGestion)}
                          </>
                        ) : (
                          'Gestionada'
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Sección inferior: Obligaciones eliminadas en TransUnion (RF50) */}
      <section className="flex flex-col gap-3 mt-4" aria-labelledby="el-titulo">
        <div>
          <h2 className="text-lg font-bold text-slate-900" id="el-titulo">
            Obligaciones eliminadas en TransUnion (RF50)
          </h2>
          <p className="text-sm text-slate-600">
            No se vuelven a reportar en los cortes siguientes y su número no se puede reutilizar.
          </p>
        </div>

        <Card>
          {eliminaciones.length === 0 ? (
            <EmptyState
              title="No hay obligaciones eliminadas"
              description="Las obligaciones eliminadas ante TransUnion se registrarán aquí."
            />
          ) : (
            <Table aria-label="Obligaciones eliminadas">
              <thead>
                <tr>
                  <th>Obligación</th>
                  <th>Motivo</th>
                  <th>Fecha</th>
                  <th>Confirmación</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {eliminaciones.map((e) => (
                  <tr key={e.id}>
                    <td className="font-mono font-semibold text-slate-900">
                      {e.numeroObligacion}
                    </td>
                    <td className="text-slate-800">
                      {e.motivo?.descripcion || e.motivo?.codigo || e.motivo || '—'}
                    </td>
                    <td className="text-slate-700">{formatearFechaISO(e.fecha)}</td>
                    <td className="font-mono text-slate-700">{e.numeroTransaccionTu || '—'}</td>
                    <td>
                      {e.bloqueada ? (
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label={`Reactivar obligación ${e.numeroObligacion}`}
                          onClick={() => setElimReactivar(e)}
                        >
                          Reactivar
                        </Button>
                      ) : (
                        <Badge tone="ok">
                          Reactivada ({formatearFechaISO(e.fechaActivacion)})
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </section>

      {/* Modales */}
      <NewNoveltyModal
        open={modalNuevaAbierto}
        onClose={() => setModalNuevaAbierto(false)}
        onCreada={(nueva) => {
          setNovedades((prev) => [nueva, ...(prev || [])])
        }}
      />

      <ManageNoveltyModal
        open={Boolean(novedadGestionar)}
        novedad={novedadGestionar}
        onClose={() => setNovedadGestionar(null)}
        onGestionada={(actualizada) => {
          setNovedades((prev) =>
            (prev || []).map((n) => (n.id === actualizada.id ? actualizada : n)),
          )
          if (actualizada.tipo === 'Eliminación') {
            listEliminations().then(setEliminaciones)
          }
        }}
      />

      <ReactivateModal
        open={Boolean(elimReactivar)}
        eliminacion={elimReactivar}
        onClose={() => setElimReactivar(null)}
        onReactivada={(actualizada) => {
          setEliminaciones((prev) =>
            prev.map((e) => (e.id === actualizada.id ? actualizada : e)),
          )
        }}
      />
    </div>
  )
}
