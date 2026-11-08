// Panel del Analista (pantalla 4, HU-B y HU-C): aviso de entidad con relleno (RF57), «Estado de la
// cartera» (RF19), «Último archivo para TransUnion» (RF20) y tres indicadores (RF23, RF24, RF19).
// El Administrador no lo ve ni lo pide (HomePage lo muestra solo al Analista). Mockup v3: vPanel2.
import { useCallback, useEffect, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Button, buttonClasses, Card, Icon, Spinner } from '../../components/ui'
import { cx } from '../../components/ui/cx'
import { mensajeDeError } from '../../lib/api'
import { formatearCOP, formatearFechaHora, formatearFechaISO, formatearFechaISOLarga, plural } from '../../lib/format'
import EstadoArchivoBadge from '../report/EstadoArchivoBadge'
import { getPanelSummary } from './panelService'

// Color de cada estado en la barra (tokens estado-* de index.css, como la maqueta).
const COLOR_ESTADO = { '01': 'bg-estado-01', '02': 'bg-estado-02', '03': 'bg-estado-03', '06': 'bg-estado-06', '07': 'bg-estado-07' }
const colorEstado = (codigo) => COLOR_ESTADO[codigo] ?? 'bg-estado-otro'

export default function PanelAnalista() {
  const [resumen, setResumen] = useState(null) // null = cargando
  const [error, setError] = useState(null) // { detalle } o null
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let cancelado = false
    getPanelSummary()
      .then((r) => !cancelado && setResumen(r))
      .catch((err) => !cancelado && setError({ detalle: mensajeDeError(err) }))
    return () => {
      cancelado = true
    }
  }, [intento])

  const reintentar = useCallback(() => {
    setError(null)
    setResumen(null)
    setIntento((n) => n + 1)
  }, [])

  if (error) {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Alert>No se pudo cargar el estado de la cartera. {error.detalle}</Alert>
        <Button variant="outline" size="sm" onClick={reintentar}>
          Reintentar
        </Button>
      </div>
    )
  }
  if (!resumen) {
    return (
      <div role="status" aria-label="Cargando el estado de la cartera" className="mt-4 flex justify-center p-8">
        <Spinner className="size-6" />
      </div>
    )
  }
  return (
    <div className="mt-4 space-y-4">
      {resumen.entidadConMarcador && (
        <Alert tone="aviso">
          TransUnion aún no asigna los datos de la entidad: el tipo de entidad, el código de entidad y la sucursal llevan relleno (
          <span className="font-mono">XXX</span>), así que los archivos salen <b>no aptos para envío</b>. El Administrador los cambia en
          «Datos de la Entidad» cuando TransUnion los asigne.
        </Alert>
      )}
      <EstadoCartera resumen={resumen} />
      <UltimoArchivo archivo={resumen.ultimoArchivo} />
      <div className="grid gap-4 md:grid-cols-3">
        <Indicador to="/reclamos" icono="flag" etiqueta="Obligaciones en reclamo" valor={resumen.enReclamo} />
        <Indicador to="/novedades" icono="clock" etiqueta="Novedades urgentes pendientes" valor={resumen.novedadesPendientes} />
        <Indicador to="/obligaciones?cuotas_mora_min=2" icono="warn" etiqueta="Obligaciones con 2 o más cuotas en mora" valor={resumen.conDosOMasCuotas} />
      </div>
    </div>
  )
}

function Encabezado({ id, icono, titulo, children, enlace, textoEnlace }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-bosque-d">
          <Icon name={icono} size={22} />
        </span>
        <div>
          <h2 id={id} className="font-semibold">
            {titulo}
          </h2>
          <div className="text-sm text-muted">{children}</div>
        </div>
      </div>
      <Link to={enlace} className={buttonClasses({ variant: 'outline', size: 'sm' })}>
        {textoEnlace}
      </Link>
    </div>
  )
}

function EstadoCartera({ resumen }) {
  const id = useId()
  const { totalObligaciones: total, distribucion } = resumen
  const descripcion = distribucion.map((d) => `${d.estado.codigo} ${d.estado.descripcion}: ${d.cantidad}`).join(', ')
  return (
    <Card as="section" aria-labelledby={id} className="p-6">
      <Encabezado id={id} icono="layers" titulo="Estado de la cartera" enlace="/obligaciones" textoEnlace="Ir a Obligaciones y Estados">
        {plural(total, 'obligación', 'obligaciones')} (una por financiación) · Última actualización mensual:{' '}
        {resumen.fechaUltimoCiclo ? formatearFechaISO(resumen.fechaUltimoCiclo) : 'aún no se ha ejecutado'}
      </Encabezado>
      {total > 0 ? (
        <>
          <div
            role="img"
            aria-label={`Distribución de obligaciones por estado: ${descripcion}`}
            className="mt-4 mb-3 flex h-3.5 divide-x-2 divide-white overflow-hidden rounded-full bg-line"
          >
            {distribucion
              .filter((d) => d.cantidad > 0)
              .map((d) => (
                <i key={d.estado.codigo} className={cx('block h-full', colorEstado(d.estado.codigo))} style={{ width: `${(d.cantidad / total) * 100}%` }} />
              ))}
          </div>
          <ul className="flex flex-wrap gap-x-4.5 gap-y-1.5 text-sm" aria-label="Obligaciones por estado">
            {distribucion.map((d) => (
              <li key={d.estado.codigo} className="flex items-center">
                <i aria-hidden="true" className={cx('mr-1.5 inline-block size-2.5 rounded-sm', colorEstado(d.estado.codigo))} />
                {d.estado.descripcion} <b className="ml-1">{d.cantidad}</b>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-3 text-sm text-muted">Aún no hay obligaciones: se cargan con la primera actualización mensual.</p>
      )}
    </Card>
  )
}

function Dato({ etiqueta, valor, nota }) {
  return (
    <div>
      <dt className="text-xs text-muted">{etiqueta}</dt>
      <dd className="font-semibold">{valor}</dd>
      {nota && <dd className="text-xs text-muted">{nota}</dd>}
    </div>
  )
}

function UltimoArchivo({ archivo }) {
  const id = useId()
  return (
    <Card as="section" aria-labelledby={id} className="p-6">
      <Encabezado id={id} icono="file" titulo="Último archivo para TransUnion" enlace="/reporte" textoEnlace="Ir a Reporte a TransUnion">
        {archivo ? (
          <span className="inline-flex flex-wrap items-center gap-x-1.5">
            Generado por {archivo.generadoPor ?? '—'} · <span className="font-mono">{archivo.nombre}</span> · <EstadoArchivoBadge archivo={archivo} />
          </span>
        ) : (
          'Aún no se ha generado ningún archivo.'
        )}
      </Encabezado>
      {archivo && (
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Dato etiqueta="Fecha y hora" valor={formatearFechaHora(archivo.fechaGeneracion)} />
          <Dato etiqueta="Fecha de corte" valor={formatearFechaISOLarga(archivo.fechaCorte)} />
          <Dato etiqueta="Obligaciones reportadas" valor={archivo.nRegistros} nota={archivo.tipoReporte === '01' ? 'Reporte total (01)' : `Tipo ${archivo.tipoReporte}`} />
          <Dato etiqueta="Saldo del archivo" valor={formatearCOP(archivo.saldoTotal)} />
        </dl>
      )}
    </Card>
  )
}

function Indicador({ to, icono, etiqueta, valor }) {
  return (
    <Link to={to} className="block rounded-card border border-line bg-white p-5 hover:border-gris-d focus-visible:outline-bosque">
      <span className="text-bosque-d">
        <Icon name={icono} size={22} />
      </span>
      <span className="mt-2 block text-sm text-muted">{etiqueta}</span>
      <span className="block font-hd text-3xl font-bold">{valor}</span>
    </Link>
  )
}
