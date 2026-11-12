// Actualización Mensual de Estados (pantalla 10, HU-B), solo Analista de Cartera. Mockup v3: vCiclo.
// Cubre RF10–RF17, RF19 y RF45–RF49: se elige el corte (último día del mes), se ejecuta el ciclo sobre
// el BORRADOR que dejó la extracción y se muestra qué pasó con cada obligación, los cambios rechazados
// (713 y 881), el historial y la matriz de cambios de estado.
//
// El ciclo es síncrono: mientras la petición está pendiente se muestran los 8 pasos como guía (sin
// temporizadores ni avance simulado). El cálculo lo hace el backend; aquí no se copia el applyCycle.
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Badge, Button, Card, Chip, EmptyState, Icon, Input, PageHeader, Spinner, Table, TextLink, useToast } from '../../components/ui'
import { ApiError, mensajeDeError } from '../../lib/api'
import { formatearFechaHora, formatearFechaISO, formatearFechaISOLarga, plural } from '../../lib/format'
import { useFormulario } from '../../lib/useFormulario'
import { usePageTitle } from '../../lib/usePageTitle'
import { getObligationsSummary } from '../obligations/obligationsService'
import PrimerReporte from '../obligations/PrimerReporte'
import EstadoBadge from '../transunion/EstadoBadge'
import { mapCicloFieldErrors } from './cycleMapper'
import { getCycle, getStateMatrix, listCycles, runCycle } from './cycleService'
import { corteSiguiente, validarCiclo } from './cycleValidation'
import MatrixTable from './MatrixTable'

// Los pasos del ciclo en el orden de la ficha (§4.6).
const PASOS = [
  <>Primer reporte: las obligaciones nuevas entran con su estado y su mora reales</>,
  <>Aplicación de los pagos extraídos del sistema comercial, de la cuota más antigua a la más reciente</>,
  <>Días de mora desde la cuota vencida más antigua sin pagar y edad de mora según la Tabla 9</>,
  <>Crédito caducado en el SAC → Dudoso recaudo (03); castigo contable → Castigada (06)</>,
  <>Pago de la mora sin cancelar el saldo: vuelve a Vigente y se reportan fecha, modo y tipo de pago</>,
  <>Pago total: Saldada (02) o Castigada recuperada (07), con fecha de pago, modo de extinción y tipo de pago</>,
  <>Validación de cada cambio contra la matriz de TransUnion y las reglas de primer reporte</>,
  <>Cuotas en mora por obligación</>,
]

export default function CyclePage() {
  usePageTitle('Actualización Mensual de Estados')
  const toast = useToast()
  const [historial, setHistorial] = useState(null) // CicloResumen[] | null (cargando)
  const [errorHistorial, setErrorHistorial] = useState('')
  const [intentoHistorial, setIntentoHistorial] = useState(0)
  const [intentoNuevas, setIntentoNuevas] = useState(0)
  const [resultado, setResultado] = useState(null) // { ciclo, recienEjecutado } | null
  const [sinBorrador, setSinBorrador] = useState('')
  // Número de la última petición de resultado (ejecutar o «Ver resultado»): una respuesta de una
  // petición anterior se descarta y no reemplaza la más reciente.
  const ultimaConsulta = useRef(0)

  const form = useFormulario({
    valoresIniciales: { fechaCorte: '' },
    validar: validarCiclo,
    traducirErrores: mapCicloFieldErrors,
    onSubmit: async ({ fechaCorte }) => {
      setSinBorrador('')
      setResultado(null)
      const numero = ++ultimaConsulta.current
      try {
        const ciclo = await runCycle(fechaCorte)
        if (numero === ultimaConsulta.current) setResultado({ ciclo, recienEjecutado: true })
        setIntentoHistorial((n) => n + 1)
        setIntentoNuevas((n) => n + 1)
        toast.success(`Actualización mensual completada: ${plural(ciclo.transiciones.length, 'obligación actualizada', 'obligaciones actualizadas')} en el corte ${formatearFechaISO(ciclo.fechaCorte)}.`)
      } catch (err) {
        // 409: no hay extracción en BORRADOR de ese corte. Se explica con el camino para generarla.
        if (err instanceof ApiError && err.status === 409) setSinBorrador(err.message)
        else throw err
      }
    },
  })
  const { setValor } = form
  const fechaPropuesta = useRef(false)
  const fechaEscrita = useRef('')
  useEffect(() => {
    fechaEscrita.current = form.valores.fechaCorte
  })

  // Historial. La primera vez que llega, propone el corte del mes siguiente al último ejecutado.
  useEffect(() => {
    let cancelado = false
    listCycles().then(
      (lista) => {
        if (cancelado) return
        setHistorial(lista)
        setErrorHistorial('')
        // Solo si el usuario no ha escrito una fecha mientras cargaba.
        if (!fechaPropuesta.current && lista.length && !fechaEscrita.current) setValor('fechaCorte', corteSiguiente(lista[0].fechaCorte))
        fechaPropuesta.current = true
      },
      (err) => !cancelado && setErrorHistorial(mensajeDeError(err)),
    )
    return () => {
      cancelado = true
    }
  }, [intentoHistorial, setValor])

  const ultimo = historial?.[0] ?? null

  const verResultado = useCallback(async (corteId) => {
    const numero = ++ultimaConsulta.current
    setResultado({ cargando: corteId })
    try {
      const ciclo = await getCycle(corteId)
      if (numero === ultimaConsulta.current) setResultado({ ciclo, recienEjecutado: false })
    } catch (err) {
      if (numero === ultimaConsulta.current) setResultado({ error: mensajeDeError(err), corteId })
    }
  }, [])
  const campoFecha = form.campo('fechaCorte')

  return (
    <>
      <PageHeader title="Actualización Mensual de Estados" />

      <Card as="section" aria-label="Parámetros de la actualización" className="mb-5 p-6">
        <form {...form.formProps} aria-label="Ejecutar la actualización mensual">
          <div className="flex flex-wrap items-end gap-5">
            <Input
              label="Fecha de corte"
              type="date"
              className="w-56"
              disabled={form.enviando}
              describedBy="ciclo-ayuda"
              {...campoFecha}
              onChange={(e) => {
                setSinBorrador('') // el aviso de «sin borrador» era de la fecha anterior
                campoFecha.onChange(e)
              }}
            />
            <div className="min-w-48 flex-1 pb-1">
              <div className="text-xs text-muted">Última actualización</div>
              {ultimo ? (
                <>
                  <b>{formatearFechaISOLarga(ultimo.fechaCorte)}</b>
                  <div className="text-sm text-muted">{ultimo.ejecutadaPor ? `Ejecutada por ${ultimo.ejecutadaPor}` : 'Ejecutada por el proceso programado'}</div>
                </>
              ) : (
                <b>{historial ? 'Aún no se ha ejecutado' : '—'}</b>
              )}
            </div>
            <Button type="submit" loading={form.enviando}>
              {!form.enviando && <Icon name="refresh" size={16} />}
              {form.enviando ? 'Actualizando…' : 'Ejecutar actualización mensual'}
            </Button>
          </div>
          <div id="ciclo-ayuda" className="mt-3 text-sm text-muted">
            El corte es siempre el <b>último día del mes</b> y se ejecuta sobre la extracción en borrador de esa fecha.{' '}
            <FinanciacionesNuevas key={intentoNuevas} /> Los pagos vienen de la extracción del sistema comercial.
          </div>
          {form.errorGeneral && (
            <div className="mt-4">
              <Alert>{form.errorGeneral}</Alert>
            </div>
          )}
          {sinBorrador && (
            <div className="mt-4">
              <Alert tone="aviso">
                {sinBorrador} El ciclo trabaja sobre el corte en borrador que crea la extracción. <TextLink to="/extraccion">Ir a Extracción de Cartera</TextLink>
              </Alert>
            </div>
          )}
        </form>
      </Card>

      {(form.enviando || resultado?.recienEjecutado) && <Progreso enCurso={form.enviando} />}
      {resultado && <Resultado resultado={resultado} onReintentar={verResultado} />}

      <Historial
        historial={historial}
        error={errorHistorial}
        onReintentar={() => {
          setErrorHistorial('')
          setIntentoHistorial((n) => n + 1)
        }}
        onVerResultado={verResultado}
      />
      <Matriz />
    </>
  )
}

// Chips de las financiaciones que entrarán en primer reporte (RF10). Si no se pueden cargar, se dice y
// no bloquea la pantalla.
function FinanciacionesNuevas() {
  const [nuevas, setNuevas] = useState(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    let cancelado = false
    getObligationsSummary().then(
      (r) => !cancelado && setNuevas(r.financiacionesNuevas),
      () => !cancelado && setError(true),
    )
    return () => {
      cancelado = true
    }
  }, [])
  if (error) return <span>No se pudieron consultar las financiaciones nuevas.</span>
  if (!nuevas) return null
  if (!nuevas.length) return <span>No hay financiaciones nuevas por ingresar.</span>
  return (
    <span>
      Financiaciones nuevas en el SAC:{' '}
      {nuevas.map((n) => (
        <span key={n.numeroObligacion} className="mr-1">
          <Chip title={n.nombreTitular}>{n.numeroObligacion}</Chip>
        </span>
      ))}
      entrarán en <b>primer reporte</b> con su estado y su mora reales.
    </span>
  )
}

function Progreso({ enCurso }) {
  const titulo = enCurso ? 'Actualizando los estados de las obligaciones…' : 'Actualización mensual completada'
  return (
    <Card as="section" aria-label={titulo} aria-busy={enCurso || undefined} className="mb-5 p-6">
      <div className="mb-3 flex items-center gap-2 font-semibold">
        {enCurso ? <Spinner className="size-4" /> : <Icon name="checkCircle" size={18} className="text-bosque-d" />}
        <span role="status">{titulo}</span>
      </div>
      <ol className="space-y-1.5 text-sm">
        {PASOS.map((paso, i) => (
          <li key={i} className="flex items-start gap-2">
            <span aria-hidden="true" className={enCurso ? 'text-muted' : 'text-bosque-d'}>
              <Icon name={enCurso ? 'clock' : 'check'} size={16} />
            </span>
            <span className={enCurso ? 'text-muted' : undefined}>{paso}</span>
          </li>
        ))}
      </ol>
    </Card>
  )
}

function Resultado({ resultado, onReintentar }) {
  if (resultado.cargando) {
    return (
      <div role="status" aria-label="Cargando el resultado de la actualización" className="mb-5 flex justify-center p-8">
        <Spinner className="size-6" />
      </div>
    )
  }
  if (resultado.error) {
    return (
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Alert>No se pudo cargar el resultado. {resultado.error}</Alert>
        <Button variant="outline" size="sm" onClick={() => onReintentar(resultado.corteId)}>
          Reintentar
        </Button>
      </div>
    )
  }
  const { ciclo } = resultado
  const kpis = [
    [ciclo.primerReporte, 'En primer reporte'],
    [ciclo.conPagos, 'Con pagos aplicados'],
    [ciclo.cierres, 'Cierres (02 o 07)'],
    [ciclo.aDudoso + ciclo.aCastigada, 'A Dudoso o Castigada'],
    [ciclo.normalizadas, 'Pagaron la mora'],
    [ciclo.rechazos.length, 'Cambios rechazados'],
  ]
  return (
    <>
      <ul aria-label={`Resultado de la actualización del corte ${formatearFechaISO(ciclo.fechaCorte)}`} className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {kpis.map(([valor, etiqueta]) => (
          <li key={etiqueta} className="flex flex-col gap-0.5 rounded-xl border border-line bg-white px-4 py-3.5">
            <span className="font-hd text-[26px] leading-tight font-bold">{valor}</span>
            <span className="text-xs font-semibold text-muted">{etiqueta}</span>
          </li>
        ))}
      </ul>
      <CambiosAplicados ciclo={ciclo} />
      <CambiosRechazados rechazos={ciclo.rechazos} />
    </>
  )
}

const enlaceObligacion = (id) => `/obligaciones?obligacion=${id}`

function CambiosAplicados({ ciclo }) {
  const id = useId()
  return (
    <Card as="section" aria-labelledby={id} className="mb-5 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <h2 id={id} className="font-normal">
          <b>{plural(ciclo.transiciones.length, 'obligación actualizada', 'obligaciones actualizadas')}</b> en el corte <b>{formatearFechaISO(ciclo.fechaCorte)}</b>
        </h2>
        <TextLink to="/obligaciones">Ver obligaciones</TextLink>
      </div>
      {ciclo.transiciones.length === 0 ? (
        <EmptyState>Ninguna obligación cambió en este corte.</EmptyState>
      ) : (
        <Table compact caption="Cambios aplicados">
          <thead>
            <tr>
              <th scope="col">Número de Obligación</th>
              <th scope="col">Deudor</th>
              <th scope="col">Estado</th>
              <th scope="col">Edad de mora</th>
              <th scope="col">Qué pasó</th>
            </tr>
          </thead>
          <tbody>
            {ciclo.transiciones.map((t) => (
              <tr key={t.obligacionId}>
                <td className="whitespace-nowrap">
                  <Link to={enlaceObligacion(t.obligacionId)} className="font-mono font-bold text-bosque-d underline hover:text-bosque-dd">
                    {t.numeroObligacion}
                  </Link>
                </td>
                <td>{t.nombreTitular}</td>
                <td className="whitespace-nowrap">
                  <CambioEstado anterior={t.estadoAnterior} nuevo={t.estadoNuevo} />
                </td>
                <td className="font-mono whitespace-nowrap">{t.primerReporte ? t.edadNueva : `${t.edadAnterior ?? '—'} → ${t.edadNueva}`}</td>
                <td>
                  {t.requiereRevision && <Badge tone="aviso">Revisar</Badge>}
                  <ul className="space-y-1">
                    {t.reglas.map((r) => (
                      <li key={`${r.rf}-${r.texto}`}>
                        {r.texto}
                      </li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  )
}

// «Primer reporte → 01», «01 → 02» o solo el estado si no cambió.
function CambioEstado({ anterior, nuevo }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {anterior ? <EstadoBadge codigo={anterior.codigo} descripcion={anterior.descripcion} /> : <PrimerReporte />}
      {anterior?.codigo !== nuevo.codigo && (
        <>
          <Icon name="arrow" size={14} aria-hidden="true" />
          <span className="sr-only">pasa a</span>
          <EstadoBadge codigo={nuevo.codigo} descripcion={nuevo.descripcion} />
        </>
      )}
    </span>
  )
}

function CambiosRechazados({ rechazos }) {
  const id = useId()
  if (!rechazos.length) {
    return (
      <div className="mb-5">
        <Alert tone="info">Todos los cambios de estado cumplen la matriz de TransUnion y las reglas de primer reporte.</Alert>
      </div>
    )
  }
  return (
    <Card as="section" aria-labelledby={id} className="mb-5 overflow-hidden">
      <div className="px-5 py-4">
        <h2 id={id} className="font-normal">
          <b>{plural(rechazos.length, 'cambio rechazado', 'cambios rechazados')}</b>: bloquean la validación del corte
        </h2>
        <p className="text-sm text-muted">
          La obligación conserva su estado anterior. Se corrige el dato en el sistema comercial, se regenera la extracción y se vuelve a ejecutar la
          actualización.
        </p>
      </div>
      <Table compact caption="Cambios rechazados">
        <thead>
          <tr>
            <th scope="col">Número de Obligación</th>
            <th scope="col">Deudor</th>
            <th scope="col">Cambio calculado</th>
            <th scope="col">Motivo</th>
          </tr>
        </thead>
        <tbody>
          {rechazos.map((r) => (
            <tr key={r.obligacionId}>
              <td className="font-mono whitespace-nowrap">{r.numeroObligacion}</td>
              <td>{r.nombreTitular}</td>
              <td className="whitespace-nowrap">
                <CambioEstado anterior={r.estadoAnterior} nuevo={r.estadoCalculado} />
              </td>
              <td>
                {/* El motivo ya empieza por «Error 713:» o «Error 881:». */}
                <span className="font-semibold text-error-d">{r.motivo}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  )
}

function Historial({ historial, error, onReintentar, onVerResultado }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="mb-6">
      <h2 id={id} className="font-hd text-lg font-bold">
        Actualizaciones mensuales anteriores
      </h2>
      <p className="mb-3 text-sm text-muted">Cada ejecución queda registrada con sus resultados.</p>
      {error && (
        <div className="flex flex-wrap items-center gap-3">
          <Alert>No se pudo cargar el historial. {error}</Alert>
          <Button variant="outline" size="sm" onClick={onReintentar}>
            Reintentar
          </Button>
        </div>
      )}
      {!historial && !error && (
        <div role="status" aria-label="Cargando el historial" className="flex justify-center p-8">
          <Spinner className="size-6" />
        </div>
      )}
      {historial && (
        <Card className="overflow-hidden">
          {historial.length === 0 ? (
            <EmptyState>Aún no se ha ejecutado ninguna actualización mensual.</EmptyState>
          ) : (
            <Table compact caption="Actualizaciones mensuales anteriores">
              <thead>
                <tr>
                  <th scope="col">Fecha y hora</th>
                  <th scope="col">Usuario</th>
                  <th scope="col">Fecha de corte</th>
                  <th scope="col" className="text-right!">
                    Primer reporte
                  </th>
                  <th scope="col" className="text-right!">
                    Cambios de estado
                  </th>
                  <th scope="col" className="text-right!">
                    Cierres
                  </th>
                  <th scope="col" className="text-right!">
                    Rechazados
                  </th>
                  <th scope="col">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {historial.map((c) => (
                  <tr key={c.corteId}>
                    <td className="whitespace-nowrap">{formatearFechaHora(c.fechaEjecucion)}</td>
                    <td className="whitespace-nowrap">{c.ejecutadaPor ?? 'Proceso programado'}</td>
                    <td className="whitespace-nowrap">{formatearFechaISO(c.fechaCorte)}</td>
                    <td className="text-right">{c.primerReporte}</td>
                    <td className="text-right">{c.cambiosEstado}</td>
                    <td className="text-right">{c.cierres}</td>
                    <td className="text-right">{c.rechazados > 0 ? <Badge tone="error">{c.rechazados}</Badge> : 0}</td>
                    <td className="text-right">
                      <Button variant="outline" size="sm" onClick={() => onVerResultado(c.corteId)} aria-label={`Ver el resultado del corte ${formatearFechaISO(c.fechaCorte)}`}>
                        Ver resultado
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}
    </section>
  )
}

function Matriz() {
  const id = useId()
  const [matriz, setMatriz] = useState(null)
  const [error, setError] = useState('')
  const [intento, setIntento] = useState(0)
  useEffect(() => {
    let cancelado = false
    getStateMatrix().then(
      (m) => !cancelado && setMatriz(m),
      (err) => !cancelado && setError(mensajeDeError(err)),
    )
    return () => {
      cancelado = true
    }
  }, [intento])
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="font-hd text-lg font-bold">
        Matriz de cambios de estado (Sector Real Servicios)
      </h2>
      <p className="mb-3 text-sm text-muted">
        Fila: estado del corte anterior. Columna: estado nuevo. <b>n</b> = sin mora, <b>m</b> = con mora. <b>S</b> = TransUnion lo acepta, <b>N</b> = lo
        rechaza (error 713). Se muestran los 5 estados que usa CENS; el sistema valida contra la matriz completa de 10 estados (Manual, p. 40).
      </p>
      {error && (
        <div className="flex flex-wrap items-center gap-3">
          <Alert>No se pudo cargar la matriz. {error}</Alert>
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
      )}
      {!matriz && !error && (
        <div role="status" aria-label="Cargando la matriz de cambios de estado" className="flex justify-center p-8">
          <Spinner className="size-6" />
        </div>
      )}
      {matriz && (
        <Card className="p-4">
          <MatrixTable matriz={matriz} />
        </Card>
      )}
      <p className="mt-2.5 text-sm text-muted">
        Primer reporte (p. 38-39): nunca se acepta Castigada recuperada; Dudoso recaudo solo con mora; Castigada solo con mora y edad 01 o mayor (error
        881).
      </p>
    </section>
  )
}
