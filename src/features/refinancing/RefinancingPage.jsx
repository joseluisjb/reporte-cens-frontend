// Refinanciaciones (pantalla 11, HU-B · RF18), solo Analista de Cartera. Mockup v3: vRefinanciaciones.
// Explica el flujo en 3 pasos y lista las refinanciaciones detectadas en el SAC o registradas a mano.
// El registro manual se abre con el botón o con `?obligacion=<id>` (desde el detalle de la pantalla 9,
// con la obligación ya elegida).
import { useCallback, useEffect, useId, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Alert, Badge, Button, Card, Chip, EmptyState, Icon, PageHeader, PorConfirmar, Spinner, Table, useToast } from '../../components/ui'
import { mensajeDeError } from '../../lib/api'
import { formatearCOP, formatearFechaHora, formatearFechaISO, plural } from '../../lib/format'
import { usePageTitle } from '../../lib/usePageTitle'
import EstadoBadge from '../transunion/EstadoBadge'
import RefinancingModal from './RefinancingModal'
import { listRefinancings } from './refinancingService'

const PASOS = [
  ['Se detecta en el SAC', 'Cada extracción revisa el campo de refinanciación del proceso. Este registro manual es de respaldo.'],
  [
    'Se cierra la obligación original',
    <>
      En Saldada (02) si estaba Vigente, o en Castigada recuperada (07) si estaba en Dudoso recaudo o Castigada <PorConfirmar />. Modo de extinción 16 «Refinanciación».
    </>,
  ],
  [
    'Nace la nueva obligación',
    'Con número propio, marcada como reestructurada y con su naturaleza (Tabla 11). El vínculo entre las dos queda en NexoVolt: el archivo de TransUnion no tiene un campo para eso.',
  ],
]

export default function RefinancingPage() {
  usePageTitle('Refinanciaciones')
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [lista, setLista] = useState(null)
  const [error, setError] = useState('')
  const [intento, setIntento] = useState(0)
  const [abierto, setAbierto] = useState(false)
  const obligacionDeUrl = /^[1-9]\d{0,9}$/.test(params.get('obligacion') ?? '') ? Number(params.get('obligacion')) : null
  const modalAbierto = abierto || obligacionDeUrl != null

  useEffect(() => {
    let cancelado = false
    listRefinancings().then(
      (r) => {
        if (cancelado) return
        setLista(r)
        setError('')
      },
      (err) => {
        if (cancelado) return
        setError(mensajeDeError(err))
        setLista(null) // no se deja a la vista una lista vieja bajo el error
      },
    )
    return () => {
      cancelado = true
    }
  }, [intento])

  const reintentar = useCallback(() => {
    setError('')
    setIntento((n) => n + 1)
  }, [])

  const cerrar = useCallback(() => {
    setAbierto(false)
    if (params.has('obligacion')) setParams({}, { replace: true })
  }, [params, setParams])

  const registrada = useCallback(
    (r) => {
      cerrar()
      setIntento((n) => n + 1)
      toast.success(`Refinanciación registrada: ${r.original.numeroObligacion} pasa a ${r.original.estadoCierre.codigo} · ${r.original.estadoCierre.descripcion} y nace ${r.nueva.numeroObligacion} en Vigente (01).`)
    },
    [cerrar, toast],
  )

  return (
    <>
      <PageHeader title="Refinanciaciones">
        <Button onClick={() => setAbierto(true)}>
          <Icon name="plus" size={16} />
          Registrar refinanciación
        </Button>
      </PageHeader>

      <ol aria-label="Cómo funciona" className="mb-6 grid gap-3 md:grid-cols-3">
        {PASOS.map(([titulo, texto], i) => (
          <li key={titulo} className="rounded-card border border-line bg-white p-4 text-sm">
            <span className="mr-2 inline-flex size-6 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-bosque-d">{i + 1}</span>
            <b className="block py-1.5">{titulo}</b>
            <span className="text-muted">{texto}</span>
          </li>
        ))}
      </ol>

      <Registradas lista={lista} error={error} onReintentar={reintentar} />
      <RefinancingModal open={modalAbierto} obligacionInicial={obligacionDeUrl} onCerrar={cerrar} onRegistrada={registrada} />
    </>
  )
}

function Registradas({ lista, error, onReintentar }) {
  const id = useId()
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="mb-3 font-hd text-lg font-bold">
        Refinanciaciones registradas
      </h2>
      {error && (
        <div className="flex flex-wrap items-center gap-3">
          <Alert>No se pudieron cargar las refinanciaciones. {error}</Alert>
          <Button variant="outline" size="sm" onClick={onReintentar}>
            Reintentar
          </Button>
        </div>
      )}
      {!lista && !error && (
        <div role="status" aria-label="Cargando refinanciaciones" className="flex justify-center p-12">
          <Spinner className="size-6" />
        </div>
      )}
      {lista && (
        <Card className="overflow-hidden">
          {lista.length === 0 ? (
            <EmptyState>Aún no hay refinanciaciones registradas.</EmptyState>
          ) : (
            <Table compact caption="Refinanciaciones registradas">
              <thead>
                <tr>
                  <th scope="col">Fecha y registrada por</th>
                  <th scope="col">Obligación original y cierre</th>
                  <th scope="col" className="text-right!">
                    Saldo refinanciado
                  </th>
                  <th scope="col">Nueva obligación</th>
                  <th scope="col">Naturaleza (Tabla 11)</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap">
                      <span className="font-mono">{formatearFechaHora(r.fechaRegistro)}</span>
                      <div className="text-xs text-muted">{r.origen === 'SAC' ? 'Detectada en el SAC' : (r.registradaPor ?? '—')}</div>
                      <div className="text-xs text-muted">Refinanciada el {formatearFechaISO(r.fecha)}</div>
                    </td>
                    <td className="whitespace-nowrap">
                      <span className="font-mono">{r.original.numeroObligacion}</span>
                      <div className="text-xs text-muted">{r.original.nombreTitular}</div>
                      <div className="mt-1 flex flex-col items-start gap-1">
                        <EstadoBadge codigo={r.original.estadoCierre.codigo} descripcion={r.original.estadoCierre.descripcion} />
                        <span className="text-xs text-muted">
                          modo de extinción {r.original.modoExtincion.codigo} · {r.original.modoExtincion.descripcion}
                        </span>
                      </div>
                    </td>
                    <td className="text-right whitespace-nowrap">{formatearCOP(r.saldoRefinanciado)}</td>
                    <td className="whitespace-nowrap">
                      <span className="font-mono">{r.nueva.numeroObligacion}</span>
                      <div className="mt-1 flex flex-col items-start gap-1">
                        <EstadoBadge codigo={r.nueva.estado?.codigo} descripcion={r.nueva.estado?.descripcion} />
                        <Badge tone="info">Reestructurada ({r.nueva.numeroReestructuraciones})</Badge>
                      </div>
                    </td>
                    <td className="whitespace-nowrap">
                      <Chip>
                        {r.naturaleza.codigo} · {r.naturaleza.descripcion}
                      </Chip>
                      {!r.naturaleza.confirmado && <PorConfirmar />}
                      <div className="text-xs text-muted">{plural(r.numeroCuotas, 'cuota', 'cuotas')}</div>
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
