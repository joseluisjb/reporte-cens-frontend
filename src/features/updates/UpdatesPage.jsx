// Novedades Urgentes (pantalla 14, HU-C · RF24, RF50, RF55), solo Analista de Cartera.
// Mockup v3: vNovedades.
import { useCallback, useEffect, useMemo, useState } from 'react'
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
} from '../../components/ui'
import { mensajeDeError } from '../../lib/api'
import { formatearFechaISO } from '../../lib/format'
import { usePageTitle } from '../../lib/usePageTitle'
import ManageNoveltyModal from './ManageNoveltyModal'
import NewNoveltyModal from './NewNoveltyModal'
import ReactivateModal from './ReactivateModal'
import { listEliminations, listNovelties, listRectifications } from './updatesService'

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

// Pestañas del mockup v3 (vNovedades: pill('todas'…), pill('pendientes'…), pill('gestionadas'…)).
const PESTAÑAS = [
  { clave: 'todas', etiqueta: 'Todas', incluye: () => true },
  { clave: 'pendientes', etiqueta: 'Pendientes', incluye: (n) => n.estado === 'Pendiente' },
  { clave: 'gestionadas', etiqueta: 'Gestionadas', incluye: (n) => n.estado === 'Gestionada' },
]

export default function UpdatesPage() {
  usePageTitle('Novedades Urgentes')

  // Novedades y sus rectificaciones (RF24, RF55)
  const [novedades, setNovedades] = useState(null)
  const [rectificaciones, setRectificaciones] = useState([])
  const [error, setError] = useState('')
  const [intento, setIntento] = useState(0)

  // Obligaciones eliminadas (RF50): carga y error propios
  const [eliminaciones, setEliminaciones] = useState(null)
  const [errorEliminaciones, setErrorEliminaciones] = useState('')
  const [intentoEliminaciones, setIntentoEliminaciones] = useState(0)

  const [pestaña, setPestaña] = useState('todas')
  const [modalNuevaAbierto, setModalNuevaAbierto] = useState(false)
  const [novedadGestionar, setNovedadGestionar] = useState(null)
  const [elimReactivar, setElimReactivar] = useState(null)

  const cargando = novedades === null && !error
  const cargandoEliminaciones = eliminaciones === null && !errorEliminaciones

  useEffect(() => {
    let cancelado = false
    Promise.all([listNovelties(), listRectifications()])
      .then(([novs, rects]) => {
        if (cancelado) return
        setNovedades(novs)
        setRectificaciones(rects)
      })
      .catch((err) => {
        if (cancelado) return
        setError(mensajeDeError(err))
      })
    return () => {
      cancelado = true
    }
  }, [intento])

  useEffect(() => {
    let cancelado = false
    listEliminations()
      .then((pagina) => {
        if (!cancelado) setEliminaciones(pagina.items)
      })
      .catch((err) => {
        if (!cancelado) setErrorEliminaciones(mensajeDeError(err))
      })
    return () => {
      cancelado = true
    }
  }, [intentoEliminaciones])

  const recargar = useCallback(() => {
    setError('')
    setNovedades(null)
    setIntento((n) => n + 1)
  }, [])

  const recargarEliminaciones = useCallback(() => {
    setErrorEliminaciones('')
    setEliminaciones(null)
    setIntentoEliminaciones((n) => n + 1)
  }, [])

  // Rectificación de cada novedad de corrección (enlazadas por novedad_id, contrato 0.9.2).
  const rectificacionDe = useMemo(
    () => new Map(rectificaciones.filter((r) => r.novedadId != null).map((r) => [r.novedadId, r])),
    [rectificaciones],
  )

  const lista = novedades ?? []
  const filtro = PESTAÑAS.find((p) => p.clave === pestaña) ?? PESTAÑAS[0]
  const listaFiltrada = lista.filter(filtro.incluye)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Novedades Urgentes">
        <Button variant="outline" onClick={() => setModalNuevaAbierto(true)}>
          <Icon name="plus" size={16} />
          Registrar novedad
        </Button>
      </PageHeader>

      <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
          <Icon name="clock" size={20} />
        </div>
        <p className="text-sm text-slate-700 leading-relaxed">
          Las novedades urgentes no esperan al corte mensual: regístralas de inmediato en el módulo{' '}
          <b>Actualización en Línea</b> de TransUnion. Lo que se gestione aquí se tiene en cuenta en el{' '}
          <b>próximo reporte mensual</b>. Las correcciones de un corte ya enviado se registran
          como «Corrección».
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

      <div className="flex items-center gap-2" role="group" aria-label="Filtrar novedades">
        {PESTAÑAS.map((p) => (
          <button
            key={p.clave}
            type="button"
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              pestaña === p.clave ? 'bg-bosque text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            aria-pressed={pestaña === p.clave}
            onClick={() => setPestaña(p.clave)}
          >
            {p.etiqueta} ({lista.filter(p.incluye).length})
          </button>
        ))}
      </div>

      <Card>
        {cargando ? (
          <div role="status" aria-label="Cargando novedades" className="flex items-center justify-center p-12">
            <Spinner size={32} />
          </div>
        ) : error ? null : listaFiltrada.length === 0 ? (
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
              {listaFiltrada.map((n) => {
                const rect = rectificacionDe.get(n.id)
                return (
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
                      {rect && (
                        <div className="text-xs text-slate-500 mt-0.5">
                          Rectifica el corte {formatearFechaISO(rect.fechaCorte)} · {rect.medio}
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
                      <AccionNovedad novedad={n} onGestionar={() => setNovedadGestionar(n)} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <section className="flex flex-col gap-3 mt-4" aria-labelledby="el-titulo">
        <div>
          <h2 className="text-lg font-bold text-slate-900" id="el-titulo">
            Obligaciones eliminadas en TransUnion
          </h2>
          <p className="text-sm text-slate-600">
            No se vuelven a reportar en los cortes siguientes y su número no se puede reutilizar.
          </p>
        </div>

        {errorEliminaciones && (
          <div className="flex flex-wrap items-center gap-3">
            <Alert tone="error">{errorEliminaciones}</Alert>
            <Button variant="outline" size="sm" onClick={recargarEliminaciones} aria-label="Reintentar eliminaciones">
              Reintentar
            </Button>
          </div>
        )}

        <Card>
          {cargandoEliminaciones ? (
            <div role="status" aria-label="Cargando eliminaciones" className="flex items-center justify-center p-12">
              <Spinner size={32} />
            </div>
          ) : errorEliminaciones ? null : eliminaciones.length === 0 ? (
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
                    <td className="font-mono font-semibold text-slate-900">{e.numeroObligacion}</td>
                    <td className="text-slate-800">{e.motivo?.descripcion || e.motivo?.codigo || '—'}</td>
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
                        <Badge tone="ok">Reactivada ({formatearFechaISO(e.fechaActivacion)})</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </section>

      <NewNoveltyModal
        open={modalNuevaAbierto}
        onClose={() => setModalNuevaAbierto(false)}
        onCreada={(nueva) => setNovedades((prev) => [nueva, ...(prev || [])])}
        onRectificada={(rect) => setRectificaciones((prev) => [rect, ...prev])}
      />

      {/* `key`: cada novedad o eliminación abre el modal limpio (sin el número de la anterior). */}
      <ManageNoveltyModal
        key={`gestion-${novedadGestionar?.id ?? 'ninguna'}`}
        open={Boolean(novedadGestionar)}
        novedad={novedadGestionar}
        onClose={() => setNovedadGestionar(null)}
        onGestionada={(actualizada) => {
          setNovedades((prev) => (prev || []).map((n) => (n.id === actualizada.id ? actualizada : n)))
          if (actualizada.tipo === 'Eliminación') recargarEliminaciones()
        }}
      />

      <ReactivateModal
        key={`reactivar-${elimReactivar?.id ?? 'ninguna'}`}
        open={Boolean(elimReactivar)}
        eliminacion={elimReactivar}
        onClose={() => setElimReactivar(null)}
        onReactivada={(actualizada) => {
          setEliminaciones((prev) => (prev || []).map((e) => (e.id === actualizada.id ? actualizada : e)))
        }}
      />
    </div>
  )
}

// Columna «Acciones»: gestionar la pendiente; confirmación y fecha si se gestionó (mockup v3);
// motivo del rechazo si TransUnion la rechazó (RF24, flujo alterno).
function AccionNovedad({ novedad: n, onGestionar }) {
  if (n.estado === 'Pendiente') {
    return (
      <Button size="sm" variant="outline" aria-label={`Gestionar novedad ${n.referencia}`} onClick={onGestionar}>
        <Icon name="link" size={14} />
        Gestionar en línea
      </Button>
    )
  }
  if (n.estado === 'Rechazada') {
    return <div className="text-xs text-slate-600">{n.motivoRechazo || '—'}</div>
  }
  return (
    <div className="text-xs text-slate-600">
      {n.numeroTransaccionTu ? (
        <>
          <span className="font-mono font-medium">Confirmación {n.numeroTransaccionTu}</span>
          <br />
          {formatearFechaISO(n.fechaGestion)}
        </>
      ) : (
        '—'
      )}
    </div>
  )
}
