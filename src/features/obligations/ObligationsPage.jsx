// Obligaciones y Estados (pantalla 9, HU-B), solo Analista de Cartera. Mockup v3: vObligaciones.
// Cubre RF10–RF17, RF19, RF45–RF47, RF49, RF50 y RF52: KPIs por estado que filtran, la tarjeta «Cuotas
// en mora por obligación», la búsqueda, la tabla paginada y el detalle en un panel lateral.
// Los filtros y la obligación abierta viven en la URL (ver obligationsValidation.js), así que el panel
// puede enlazar a `?cuotas_mora_min=2` y la pantalla 12 a `?obligacion=<id>`.
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Alert, Badge, Button, buttonClasses, Card, EmptyState, Icon, PageHeader, Pagination, SearchBox, Spinner } from '../../components/ui'
import { cx } from '../../components/ui/cx'
import { formatearFechaISO, plural } from '../../lib/format'
import { usePageTitle } from '../../lib/usePageTitle'
import { descripcionEstado } from '../transunion/catalogosTU'
import ObligationDetailPanel from './ObligationDetailPanel'
import ObligationsTable from './ObligationsTable'
import { getObligationsSummary, LIMITE_OBLIGACIONES, listObligations } from './obligationsService'
import { aConsulta, FILTRO_ELIMINADAS, LARGO_MAXIMO_BUSQUEDA, leerFiltros } from './obligationsValidation'

const ESPERA_BUSQUEDA_MS = 300
// Solo se muestra el mensaje de un ApiError (ya en español); cualquier otro error, uno genérico.
const mensajeDeError = (err) => (err?.status && err.message ? err.message : 'Intenta de nuevo en unos minutos.')

export default function ObligationsPage() {
  usePageTitle('Obligaciones y Estados')
  const [params, setParams] = useSearchParams()
  const filtros = useMemo(() => leerFiltros(params), [params])
  const { estado, cuotasMoraMin, q, obligacionId } = filtros

  // Cambia parámetros de la URL sin perder los demás. `null` o '' quita el parámetro.
  const cambiarParams = useCallback(
    (cambios, { reemplazar = false } = {}) =>
      setParams(
        (actuales) => {
          const siguientes = new URLSearchParams(actuales)
          Object.entries(cambios).forEach(([clave, valor]) => (valor == null || valor === '' ? siguientes.delete(clave) : siguientes.set(clave, String(valor))))
          return siguientes
        },
        { replace: reemplazar },
      ),
    [setParams],
  )
  const verDetalle = useCallback((id) => cambiarParams({ obligacion: id }), [cambiarParams])
  const cerrarDetalle = useCallback(() => cambiarParams({ obligacion: null }), [cambiarParams])
  const filtrarEstado = useCallback((valor) => cambiarParams({ estado: valor }), [cambiarParams])
  const buscar = useCallback((texto) => cambiarParams({ q: texto }, { reemplazar: true }), [cambiarParams])
  const quitarCuotas = useCallback(() => cambiarParams({ cuotas_mora_min: null }), [cambiarParams])

  return (
    <>
      <PageHeader title="Obligaciones y Estados">
        <Link to="/ciclo" className={buttonClasses()}>
          <Icon name="refresh" size={16} />
          Actualización mensual
        </Link>
      </PageHeader>
      <ResumenCartera estado={estado} onFiltrarEstado={filtrarEstado} />
      <ListaObligaciones
        estado={estado}
        cuotasMoraMin={cuotasMoraMin}
        q={q}
        onBuscar={buscar}
        onQuitarCuotas={quitarCuotas}
        onVerDetalle={verDetalle}
      />
      <p className="mt-3.5 flex items-center gap-2 text-[13px] text-muted">
        <Icon name="lock" size={14} strokeWidth={2.2} />
        Saldada (02) y Castigada recuperada (07) se reportan una sola vez, en el corte en que cierran, y después ya no (RF13, RF16).
      </p>
      <ObligationDetailPanel obligacionId={obligacionId} onCerrar={cerrarDetalle} onAbrir={verDetalle} />
    </>
  )
}

// KPIs por estado (filtran la tabla) y tarjeta «Cuotas en mora por obligación» (RF19).
function ResumenCartera({ estado, onFiltrarEstado }) {
  const [resumen, setResumen] = useState(null)
  const [error, setError] = useState('')
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let cancelado = false
    getObligationsSummary().then(
      (r) => !cancelado && setResumen(r),
      (err) => !cancelado && setError(mensajeDeError(err)),
    )
    return () => {
      cancelado = true
    }
  }, [intento])

  if (error) {
    return (
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Alert>No se pudo cargar el resumen de la cartera. {error}</Alert>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setError('')
            setIntento((n) => n + 1)
          }}
        >
          Reintentar
        </Button>
      </div>
    )
  }
  if (!resumen) {
    return (
      <div role="status" aria-label="Cargando el resumen de la cartera" className="mb-5 flex justify-center p-6">
        <Spinner className="size-6" />
      </div>
    )
  }
  return (
    <>
      <div role="group" aria-label="Filtrar por estado" className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Kpi valor="" activo={estado === ''} etiqueta="Todas" cantidad={resumen.total} onFiltrar={onFiltrarEstado} />
        {resumen.porEstado.map((c) => (
          <Kpi
            key={c.estado.codigo}
            valor={c.estado.codigo}
            activo={estado === c.estado.codigo}
            etiqueta={`${c.estado.codigo} · ${c.estado.descripcion}`}
            cantidad={c.cantidad}
            onFiltrar={onFiltrarEstado}
          />
        ))}
        {resumen.eliminadas > 0 && (
          <Kpi valor={FILTRO_ELIMINADAS} activo={estado === FILTRO_ELIMINADAS} etiqueta="Eliminadas" cantidad={resumen.eliminadas} onFiltrar={onFiltrarEstado} />
        )}
      </div>
      <CuotasEnMora resumen={resumen} />
    </>
  )
}

function Kpi({ valor, activo, etiqueta, cantidad, onFiltrar }) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={() => onFiltrar(valor)}
      className={cx(
        'flex cursor-pointer flex-col gap-0.5 rounded-xl border px-4 py-3.5 text-left text-ink',
        activo ? 'border-bosque bg-green-50 ring-1 ring-bosque' : 'border-line bg-white hover:bg-slate-50',
      )}
    >
      <span className="font-hd text-[26px] leading-tight font-bold">{cantidad}</span>
      <span className="text-xs font-semibold text-muted">{etiqueta}</span>
    </button>
  )
}

function CuotasEnMora({ resumen }) {
  const id = useId()
  const { alDia, una, dosATres, cuatroOMas } = resumen.porCuotasMora
  const grupos = [
    ['Al día', alDia, 'off'],
    ['1 cuota en mora', una, 'aviso'],
    ['2 a 3 cuotas', dosATres, 'error'],
    ['4 o más cuotas', cuatroOMas, 'error'],
  ]
  return (
    <Card as="section" aria-labelledby={id} className="mb-5 p-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-bosque-d">
          <Icon name="clock" size={22} />
        </span>
        <div>
          <h2 id={id} className="font-semibold">
            Cuotas en mora por obligación
          </h2>
          <p className="text-sm text-muted">
            Se calcula en cada actualización mensual, por financiación (RF19) · Último corte:{' '}
            {resumen.fechaUltimoCiclo ? formatearFechaISO(resumen.fechaUltimoCiclo) : 'aún no se ha ejecutado'}
          </p>
        </div>
      </div>
      <ul aria-label="Obligaciones abiertas por cuotas en mora" className="mt-4.5 flex flex-wrap gap-x-7 gap-y-3.5 border-t border-slate-100 pt-4">
        {grupos.map(([etiqueta, cantidad, tono]) => (
          <li key={etiqueta} className="flex items-center gap-2.5 text-[13px]">
            <Badge tone={tono}>{cantidad}</Badge>
            {etiqueta}
          </li>
        ))}
      </ul>
    </Card>
  )
}

// Búsqueda, tabla y paginación. La consulta sale de los filtros de la URL; la paginación es local y
// vuelve a 0 cuando cambia un filtro.
function ListaObligaciones({ estado, cuotasMoraMin, q, onBuscar, onQuitarCuotas, onVerDetalle }) {
  const resumenId = useId()
  const [texto, setTexto] = useState(q)
  const [pagina, setPagina] = useState(null) // { items, total, clave, consulta } | null (primera carga)
  const [desplazamiento, setDesplazamiento] = useState(0)
  const [fallo, setFallo] = useState(null) // { consulta, mensaje } | null
  const [intento, setIntento] = useState(0)
  const ultimoQ = useRef(q)

  // La búsqueda se aplica cuando el usuario deja de escribir; si la URL cambia por fuera (atrás o
  // adelante del navegador), la caja se pone al día.
  useEffect(() => {
    if (q !== ultimoQ.current) {
      ultimoQ.current = q
      setTexto(q)
    }
  }, [q])
  useEffect(() => {
    const limpio = texto.trim()
    if (limpio === ultimoQ.current) return undefined
    const t = setTimeout(() => {
      ultimoQ.current = limpio
      onBuscar(limpio)
    }, ESPERA_BUSQUEDA_MS)
    return () => clearTimeout(t)
  }, [texto, onBuscar])

  const clave = `${estado}|${cuotasMoraMin ?? ''}|${q}`
  const sinFiltros = !estado && cuotasMoraMin == null && !q
  const desplazamientoVigente = pagina?.clave === clave ? desplazamiento : 0
  // Cada consulta (filtros, página e intento) tiene su clave: está cargando mientras no haya llegado
  // ni la página ni el error de esa consulta. Una respuesta de una consulta anterior se descarta.
  const consulta = `${clave}#${desplazamientoVigente}#${intento}`
  const error = fallo?.consulta === consulta ? fallo.mensaje : ''
  const cargando = pagina?.consulta !== consulta && !error

  useEffect(() => {
    let cancelado = false
    listObligations({ ...aConsulta({ estado, cuotasMoraMin, q }), limite: LIMITE_OBLIGACIONES, desplazamiento: desplazamientoVigente }).then(
      (r) => {
        if (cancelado) return
        setPagina({ ...r, clave, consulta })
        setDesplazamiento(desplazamientoVigente)
      },
      (err) => !cancelado && setFallo({ consulta, mensaje: mensajeDeError(err) }),
    )
    return () => {
      cancelado = true
    }
  }, [estado, cuotasMoraMin, q, clave, consulta, desplazamientoVigente])

  return (
    <>
      <div className="mb-3.5 flex flex-wrap items-center gap-3">
        <SearchBox
          label="Buscar por número o deudor"
          placeholder="Buscar por número o deudor"
          maxLength={LARGO_MAXIMO_BUSQUEDA}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        {cuotasMoraMin != null && (
          <span className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-2.5 py-1 text-[13px]">
            Con {plural(cuotasMoraMin, 'cuota', 'cuotas')} o más en mora
            <button
              type="button"
              aria-label="Quitar el filtro de cuotas en mora"
              onClick={onQuitarCuotas}
              className="cursor-pointer rounded text-muted hover:text-ink"
            >
              <Icon name="close" size={14} />
            </button>
          </span>
        )}
        {pagina && (
          <p className="text-[13px] text-muted">
            <span role="status">{plural(pagina.total, 'obligación', 'obligaciones')}</span>
            {estado && estado !== FILTRO_ELIMINADAS && ` en ${estado} · ${descripcionEstado(estado)}`}
            {estado === FILTRO_ELIMINADAS && ' eliminadas en TransUnion'} · Haz clic en el número para ver el detalle
          </p>
        )}
      </div>

      {error && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Alert>No se pudieron cargar las obligaciones. {error}</Alert>
          <Button variant="outline" size="sm" onClick={() => setIntento((n) => n + 1)}>
            Reintentar
          </Button>
        </div>
      )}
      {!pagina && !error && (
        <div role="status" aria-label="Cargando obligaciones" className="flex justify-center p-12">
          <Spinner className="size-6" />
        </div>
      )}
      {pagina && (
        <Card className="overflow-hidden" aria-busy={cargando || undefined} aria-describedby={resumenId}>
          {pagina.items.length === 0 ? (
            <EmptyState>{sinFiltros ? 'Aún no hay obligaciones: se cargan con la primera actualización mensual.' : 'No hay obligaciones que coincidan con el filtro.'}</EmptyState>
          ) : (
            <ObligationsTable obligaciones={pagina.items} onVerDetalle={onVerDetalle} />
          )}
          <p id={resumenId} className="sr-only">
            {pagina.total} obligaciones en total
          </p>
          <Pagination
            total={pagina.total}
            limit={LIMITE_OBLIGACIONES}
            offset={desplazamientoVigente}
            onChange={setDesplazamiento}
            loading={cargando}
            noun="obligaciones"
            nounSingular="obligación"
          />
        </Card>
      )}
    </>
  )
}
