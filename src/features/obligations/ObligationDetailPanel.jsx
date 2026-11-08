// Detalle de una obligación (pantalla 9, panel lateral; mockup v3: modalObl). Se abre con
// `?obligacion=<id>` y muestra, en el orden del mockup: los datos (RF49, RF52), qué puede pasar con
// ella (RF12–RF18, RF45–RF47, como `ReglaAplicada`), las cuotas vencidas, los pagos extraídos del SAC
// (RF17) y la línea de tiempo de estados. Aquí no se registran pagos: vienen de la extracción.
import { useCallback, useEffect, useState } from 'react'
import { Alert, Badge, Button, Modal, PorConfirmar, Spinner } from '../../components/ui'
import { cx } from '../../components/ui/cx'
import { formatearCOP, formatearDias, formatearFechaISO } from '../../lib/format'
import { esEstadoDeCierre, TABLA_9 } from '../transunion/catalogosTU'
import CandadoCerrada from '../transunion/CandadoCerrada'
import CuotasMoraBadge from '../transunion/CuotasMoraBadge'
import EstadoBadge from '../transunion/EstadoBadge'
import RfTag from '../transunion/RfTag'
import { getObligation, getObligationTimeline } from './obligationsService'
import PrimerReporte from './PrimerReporte'

// Solo se muestra el mensaje de un ApiError (ya en español); cualquier otro error, uno genérico.
const mensajeDeError = (err) => (err?.status && err.message ? err.message : 'Intenta de nuevo en unos minutos.')
const codigoYDescripcion = (item) => (item ? [item.codigo, item.descripcion].filter(Boolean).join(' · ') : '—')

export default function ObligationDetailPanel({ obligacionId, onCerrar, onAbrir }) {
  const [carga, setCarga] = useState({ id: null, detalle: null, eventos: null, error: null })
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    if (obligacionId == null) return undefined
    let cancelado = false
    Promise.all([getObligation(obligacionId), getObligationTimeline(obligacionId)]).then(
      ([detalle, eventos]) => !cancelado && setCarga({ id: obligacionId, detalle, eventos, error: null }),
      (err) => !cancelado && setCarga({ id: obligacionId, detalle: null, eventos: null, error: mensajeDeError(err) }),
    )
    return () => {
      cancelado = true
    }
  }, [obligacionId, intento])

  const reintentar = useCallback(() => {
    setCarga({ id: null, detalle: null, eventos: null, error: null })
    setIntento((n) => n + 1)
  }, [])

  // Lo cargado es de otra obligación (se abrió otra desde un enlace): se muestra la carga.
  const vigente = carga.id === obligacionId
  const o = vigente ? carga.detalle : null
  return (
    <Modal
      open={obligacionId != null}
      onClose={onCerrar}
      side
      wide
      title={o ? `Obligación ${o.numeroObligacion}` : 'Detalle de la obligación'}
      subtitle={o && <Subtitulo o={o} />}
      footer={
        <Button variant="ghost" onClick={onCerrar}>
          Cerrar
        </Button>
      }
    >
      {vigente && carga.error && (
        <div className="flex flex-wrap items-center gap-3">
          <Alert>No se pudo cargar la obligación. {carga.error}</Alert>
          <Button variant="outline" size="sm" onClick={reintentar}>
            Reintentar
          </Button>
        </div>
      )}
      {!o && !(vigente && carga.error) && (
        <div role="status" aria-label="Cargando el detalle de la obligación" className="flex justify-center p-12">
          <Spinner className="size-6" />
        </div>
      )}
      {o && <Detalle o={o} eventos={carga.eventos} onAbrir={onAbrir} />}
    </Modal>
  )
}

function Subtitulo({ o }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {o.nombreTitular} · <EstadoBadge codigo={o.estado?.codigo} descripcion={o.estado?.descripcion} />
      {o.cerrada && <CandadoCerrada />}
      {o.primerReporte && <PrimerReporte />}
      {o.enReclamo && <Badge tone="aviso">En reclamo Habeas Data</Badge>}
      {o.eliminada && <Badge tone="error">Eliminada en TransUnion</Badge>}
    </span>
  )
}

function Detalle({ o, eventos, onAbrir }) {
  return (
    <>
      <Avisos o={o} />
      <DatosObligacion o={o} onAbrir={onAbrir} />
      <Seccion titulo="Qué puede pasar con esta obligación">
        <ul className="flex flex-col gap-2 text-[13px]">
          {o.posiblesTransiciones.map((r) => (
            <li key={`${r.rf}-${r.texto}`}>
              {r.texto}
              <RfTag>{r.rf}</RfTag>
              {r.porConfirmar && <PorConfirmar />}
            </li>
          ))}
        </ul>
      </Seccion>
      <Seccion titulo="Cuotas vencidas sin pagar">
        {o.cuotasVencidas.length ? (
          <TablaSimple caption="Cuotas vencidas sin pagar" columnas={['Vencimiento', 'Pendiente', 'Días']} numericas={[1, 2]}>
            {o.cuotasVencidas.map((c) => (
              <tr key={c.fechaVencimiento}>
                <td>{formatearFechaISO(c.fechaVencimiento)}</td>
                <td className="text-right">{formatearCOP(c.valorPendiente)}</td>
                <td className="text-right">{c.dias}</td>
              </tr>
            ))}
          </TablaSimple>
        ) : (
          <p className="text-[13px] text-muted">No tiene cuotas vencidas sin pagar.</p>
        )}
        <h4 className="mt-4 mb-2 font-semibold">Pagos extraídos del sistema comercial</h4>
        {o.pagos.length ? (
          <TablaSimple caption="Pagos extraídos del sistema comercial" columnas={['Corte', 'Valor', 'Se aplicó a']} numericas={[1]}>
            {o.pagos.map((p, i) => (
              <tr key={`${p.fechaCorte}-${i}`}>
                <td>{formatearFechaISO(p.fechaCorte)}</td>
                <td className="text-right">{formatearCOP(p.valor)}</td>
                <td>
                  {p.aplicadoA}
                  {p.nota && <div className="text-xs text-muted">{p.nota}</div>}
                </td>
              </tr>
            ))}
          </TablaSimple>
        ) : (
          <p className="text-[13px] text-muted">La última extracción no trajo pagos de esta obligación.</p>
        )}
        {/* Regla de imputación pendiente de CENS (C-29): nota fija de la pantalla, como en el plan. */}
        <p className="mt-2 text-[13px] text-muted">
          Los pagos vienen de la extracción del SAC; aquí no se registran a mano. Se aplican de la cuota más antigua a la más reciente{' '}
          <PorConfirmar /> y los días de mora se cuentan desde la cuota más antigua que siga sin pagar completa.
        </p>
      </Seccion>
      <Seccion titulo="Línea de tiempo de estados">
        <LineaTiempo eventos={eventos} />
      </Seccion>
    </>
  )
}

function Avisos({ o }) {
  if (!o.requiereRevision && !o.movimientoPosteriorCierre && !o.advertencias.length) return null
  return (
    <div className="mb-4 space-y-2">
      {o.requiereRevision && (
        <Alert tone="aviso">
          <b>Revisar:</b> {o.motivoRevision || 'la obligación quedó marcada para revisión del Analista.'}
        </Alert>
      )}
      {o.movimientoPosteriorCierre && (
        <Alert tone="aviso">
          El sistema comercial muestra movimiento después del cierre: la obligación no se vuelve a reportar y solo se corrige por rectificación
          (RF13, RF16, RF55).
        </Alert>
      )}
      {o.advertencias.map((a) => (
        <Alert key={a.regla} tone="aviso">
          {a.mensaje}
        </Alert>
      ))}
    </div>
  )
}

function DatosObligacion({ o, onAbrir }) {
  const edad = o.edadMora?.codigo
  return (
    <dl className="grid grid-cols-1 gap-x-4.5 gap-y-3 sm:grid-cols-2">
      <Dato etiqueta="Concepto de la cuota">{o.concepto.descripcion ? `${o.concepto.codigo} · ${o.concepto.descripcion}` : o.concepto.codigo}</Dato>
      <Dato etiqueta="Saldo">{formatearCOP(o.valorSaldo)}</Dato>
      <Dato etiqueta="Valor en mora">{formatearCOP(o.valorMora)}</Dato>
      <Dato etiqueta="Días de mora">{formatearDias(o.diasMora)}</Dato>
      <Dato etiqueta="Edad de mora (Tabla 9)" nota={o.aniosMora != null && `Años en mora: ${o.aniosMora} (RF49)`}>
        {!edad ? '—' : Object.hasOwn(TABLA_9, edad) ? `${edad} - ${TABLA_9[edad].descripcion}` : edad}
      </Dato>
      <Dato etiqueta="Fecha de exigibilidad" nota={o.fechaExigibilidad && 'Cuota más antigua sin pagar (RF49)'}>
        {o.fechaExigibilidad ? formatearFechaISO(o.fechaExigibilidad) : '—'}
      </Dato>
      <Dato etiqueta="Cuotas en mora">
        <CuotasMoraBadge cuotas={o.cuotasMora} />
      </Dato>
      <Dato
        etiqueta="Valor de la cuota"
        nota={o.cerrada && o.valorCuotaAntesCierre != null && `Antes ${formatearCOP(o.valorCuotaAntesCierre)}: al cerrar se reporta en $0`}
      >
        {formatearCOP(o.valorCuota)}
      </Dato>
      <Dato etiqueta="Valor inicial">{formatearCOP(o.valorInicial)}</Dato>
      <Dato etiqueta="Primer reporte">{o.primerReporte ? 'Sí: aún no se ha incluido en ningún archivo' : 'No'}</Dato>
      <Dato etiqueta="En el SAC" nota={`Caduca a las ${o.atrasosPermitidos} cuotas atrasadas · lleva ${o.cuotasAtrasadas}`}>
        {o.caducado ? 'Crédito caducado' : 'No caducado'}
      </Dato>
      <Dato etiqueta="Ingreso al sistema">{formatearFechaISO(o.fechaIngreso)}</Dato>
      {o.reestructuracion && <DatoReestructuracion r={o.reestructuracion} onAbrir={onAbrir} />}
      {o.refinanciadaEn && (
        <Dato etiqueta="Refinanciada en (RF18)">
          <EnlaceObligacion referencia={o.refinanciadaEn} onAbrir={onAbrir} />
        </Dato>
      )}
      {o.cierre && <DatoCierre cierre={o.cierre} />}
      {o.pagoMora && (
        <Dato
          etiqueta="Pago de la mora (RF47)"
          nota={`Modo ${codigoYDescripcion(o.pagoMora.modoExtincion)} · Tipo de pago ${codigoYDescripcion(o.pagoMora.tipoPago)} · Valor pagado ${formatearCOP(o.pagoMora.valorRealPagado)}`}
        >
          {o.pagoMora.fechaPago ? formatearFechaISO(o.pagoMora.fechaPago) : 'Sin fecha de pago'}
        </Dato>
      )}
    </dl>
  )
}

function DatoReestructuracion({ r, onAbrir }) {
  return (
    <Dato
      etiqueta="Obligación reestructurada"
      nota={
        <>
          Naturaleza {codigoYDescripcion(r.naturaleza)}
          {r.naturaleza.confirmado === false && <PorConfirmar />}
          {r.obligacionAnterior && (
            <>
              {' '}
              · viene de <EnlaceObligacion referencia={r.obligacionAnterior} onAbrir={onAbrir} />
            </>
          )}
        </>
      }
    >
      01 · Sí ({r.numeroReestructuraciones})
    </Dato>
  )
}

function DatoCierre({ cierre }) {
  const nota = `Modo ${codigoYDescripcion(cierre.modoExtincion)} · Tipo de pago ${codigoYDescripcion(cierre.tipoPago)}`
  if (!cierre.fechaPago) {
    return (
      <Dato etiqueta="Cierre" nota={nota}>
        <span className="text-error-d">Falta la fecha de pago: el cierre no se reporta (RF22)</span>
      </Dato>
    )
  }
  return (
    <Dato etiqueta="Cierre" nota={nota}>
      Pagó el {formatearFechaISO(cierre.fechaPago)}
    </Dato>
  )
}

function EnlaceObligacion({ referencia, onAbrir }) {
  return (
    <button
      type="button"
      className="cursor-pointer font-mono font-bold text-bosque-d underline hover:text-bosque-dd"
      aria-label={`Ver el detalle de la obligación ${referencia.numeroObligacion}`}
      onClick={() => onAbrir(referencia.id)}
    >
      {referencia.numeroObligacion}
    </button>
  )
}

function Dato({ etiqueta, nota, children }) {
  return (
    <div>
      <dt className="text-xs text-muted">{etiqueta}</dt>
      <dd className="text-sm font-semibold">{children}</dd>
      {nota && <dd className="text-xs text-muted">{nota}</dd>}
    </div>
  )
}

function Seccion({ titulo, children }) {
  return (
    <section className="mt-5.5 border-t border-slate-100 pt-4.5">
      <h3 className="mb-2 font-semibold">{titulo}</h3>
      {children}
    </section>
  )
}

function TablaSimple({ caption, columnas, numericas = [], children }) {
  return (
    <table className="w-full border-collapse text-[13px] [&_td]:border-b [&_td]:border-line [&_td]:px-2 [&_td]:py-1.5 [&_th]:border-b [&_th]:border-line [&_th]:px-2 [&_th]:py-1.5 [&_th]:font-semibold [&_th]:text-muted">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr>
          {columnas.map((c, i) => (
            <th key={c} scope="col" className={numericas.includes(i) ? 'text-right' : 'text-left'}>
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  )
}

function LineaTiempo({ eventos }) {
  if (!eventos.length) return <p className="text-[13px] text-muted">Aún no hay cambios de estado registrados.</p>
  return (
    <ol aria-label="Línea de tiempo de estados" className="m-0 list-none p-0">
      {eventos.map((e, i) => {
        const cierre = esEstadoDeCierre(e.estado?.codigo)
        return (
          <li key={`${e.fecha}-${i}`} className="relative pb-4 pl-7 last:pb-0">
            {i < eventos.length - 1 && <span aria-hidden="true" className="absolute top-4.5 -bottom-0.5 left-1.75 w-0.5 bg-line" />}
            <span
              aria-hidden="true"
              className={cx('absolute top-0.5 left-0 size-4 rounded-full border-3', cierre ? 'border-estado-02 bg-estado-02' : 'border-bosque bg-white')}
            />
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-muted">
              {formatearFechaISO(e.fecha)} <EstadoBadge codigo={e.estado?.codigo} descripcion={e.estado?.descripcion} />
              {e.edadMora && <span>Edad de mora {e.edadMora.codigo}</span>}
            </div>
            <div className="mt-0.5 text-[13px]">{e.descripcion}</div>
          </li>
        )
      })}
    </ol>
  )
}
