// Registrar una refinanciación a mano (pantalla 11, RF18), como el modalRefi del mockup v3. Es el
// respaldo: normalmente la extracción la detecta en el SAC. Pide la obligación original (solo abiertas
// y no eliminadas), la naturaleza (Tabla 11, de `/catalogos/naturalezas-reestructuracion/`), el número
// de cuotas y la fecha; la nota explica cómo se cierra la original según su estado.
import { useEffect, useState } from 'react'
import { Alert, Button, Input, Modal, PorConfirmar, Select, Spinner } from '../../components/ui'
import { ApiError, mensajeDeError } from '../../lib/api'
import { formatearCOP, hoyISO } from '../../lib/format'
import { useFormulario } from '../../lib/useFormulario'
import { getStateMatrix } from '../cycle/cycleService'
import { getObligation, listObligations } from '../obligations/obligationsService'
import { CATALOGOS, getCatalog } from '../transunion/catalogosService'
import EstadoBadge from '../transunion/EstadoBadge'
import { mapRefinanciacionFieldErrors } from './refinancingMapper'
import { createRefinancing } from './refinancingService'
import { CUOTAS_MAX, CUOTAS_MIN, ESTADOS_QUE_CIERRAN_EN_07, estadoDeCierre, validarRefinanciacion } from './refinancingValidation'

const ORDEN = ['obligacionOriginalId', 'naturaleza', 'numeroCuotas', 'fecha']
// Máximo de obligaciones que acepta la API en una página: alcanza para la cartera simulada. Con la
// cartera real hará falta filtrar las abiertas en el servidor o buscar (docs/PENDIENTES_BACKEND.md).
const LIMITE_OPCIONES = 100
const AVISO_ENLACE = 'La obligación del enlace no se puede refinanciar: está cerrada o eliminada en TransUnion. Elige otra.'
const abierta = (o) => !o.cerrada && !o.eliminada

// Opciones del formulario. La obligación que llega por el enlace (`?obligacion=`) se agrega si no vino en
// la página; si ya no está abierta, `aviso` lo explica y no queda elegida.
async function cargarOpciones(obligacionInicial) {
  const [pagina, naturalezas, matriz] = await Promise.all([
    listObligations({ limite: LIMITE_OPCIONES }),
    getCatalog(CATALOGOS.naturalezasReestructuracion),
    getStateMatrix(),
  ])
  const obligaciones = pagina.items.filter(abierta)
  if (!obligacionInicial || obligaciones.some((o) => o.id === obligacionInicial)) return { obligaciones, naturalezas, matriz, aviso: '' }
  const inicial = await getObligation(obligacionInicial).catch(() => null)
  if (inicial && abierta(inicial)) return { obligaciones: [inicial, ...obligaciones], naturalezas, matriz, aviso: '' }
  return { obligaciones, naturalezas, matriz, aviso: AVISO_ENLACE }
}

export default function RefinancingModal({ open, obligacionInicial, onCerrar, onRegistrada }) {
  if (!open) return null
  return <Formulario obligacionInicial={obligacionInicial} onCerrar={onCerrar} onRegistrada={onRegistrada} />
}

function Formulario({ obligacionInicial, onCerrar, onRegistrada }) {
  const [opciones, setOpciones] = useState(null) // { obligaciones, naturalezas, matriz } | null
  const [errorCarga, setErrorCarga] = useState('')
  const [intento, setIntento] = useState(0)
  const [aviso, setAviso] = useState('') // 409, o la obligación del enlace que ya no se puede refinanciar

  const form = useFormulario({
    valoresIniciales: { obligacionOriginalId: obligacionInicial ? String(obligacionInicial) : '', naturaleza: '', numeroCuotas: '', fecha: hoyISO() },
    orden: ORDEN,
    validar: validarRefinanciacion,
    traducirErrores: mapRefinanciacionFieldErrors,
    onSubmit: async (valores) => {
      setAviso('')
      try {
        onRegistrada(await createRefinancing(valores))
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) setAviso(err.message)
        else throw err
      }
    },
  })

  const { setValor } = form

  useEffect(() => {
    let cancelado = false
    cargarOpciones(obligacionInicial).then(
      ({ aviso: avisoEnlace, ...cargadas }) => {
        if (cancelado) return
        setOpciones(cargadas)
        if (avisoEnlace) {
          setValor('obligacionOriginalId', '')
          setAviso(avisoEnlace)
        }
      },
      (err) => !cancelado && setErrorCarga(mensajeDeError(err)),
    )
    return () => {
      cancelado = true
    }
  }, [intento, obligacionInicial, setValor])

  const elegida = opciones?.obligaciones.find((o) => String(o.id) === form.valores.obligacionOriginalId) ?? null
  // ¿La matriz deja cerrar la elegida? (desde 04, 10, 11 o 12, o desde 03 o 06 sin mora, no: error 713)
  const cierre = elegida ? estadoDeCierre(elegida.estado?.codigo) : null
  const permitida = !elegida || opciones.matriz.permitida(elegida.estado?.codigo, elegida.valorMora > 0, cierre, false)
  const algunaPorConfirmar = opciones?.naturalezas.some((n) => !n.confirmado)
  const campoObligacion = form.campo('obligacionOriginalId')

  return (
    <Modal
      open
      onClose={onCerrar}
      title="Registrar refinanciación"
      subtitle="Respaldo manual: normalmente el sistema la detecta en el SAC al hacer la extracción."
      footer={
        <>
          <Button variant="ghost" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="submit" form="form-refinanciacion" loading={form.enviando} disabled={!opciones || !permitida}>
            Registrar refinanciación
          </Button>
        </>
      }
    >
      {errorCarga && (
        <div className="flex flex-wrap items-center gap-3">
          <Alert>No se pudieron cargar las opciones. {errorCarga}</Alert>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setErrorCarga('')
              setIntento((n) => n + 1)
            }}
          >
            Reintentar
          </Button>
        </div>
      )}
      {!opciones && !errorCarga && (
        <div role="status" aria-label="Cargando las obligaciones y la Tabla 11" className="flex justify-center p-8">
          <Spinner className="size-6" />
        </div>
      )}
      {opciones && (
        <form id="form-refinanciacion" {...form.formProps} aria-label="Registrar refinanciación" className="space-y-4">
          <Select
            label="Obligación original"
            {...campoObligacion}
            onChange={(e) => {
              setAviso('') // el aviso era de la obligación anterior
              campoObligacion.onChange(e)
            }}
          >
            <option value="">Selecciona una obligación…</option>
            {opciones.obligaciones.map((o) => (
              <option key={o.id} value={String(o.id)}>
                {o.numeroObligacion} · {o.nombreTitular} · {o.estado?.descripcion} · {formatearCOP(o.valorSaldo)}
              </option>
            ))}
          </Select>
          <Select
            label={
              <>
                Naturaleza de la reestructuración (Tabla 11){algunaPorConfirmar && <PorConfirmar>código por confirmar con CENS</PorConfirmar>}
              </>
            }
            {...form.campo('naturaleza')}
          >
            <option value="">Selecciona la naturaleza…</option>
            {opciones.naturalezas.map((n) => (
              <option key={n.codigo} value={n.codigo}>
                {n.codigo} · {n.descripcion}
              </option>
            ))}
          </Select>
          <Input
            label="Número de cuotas de la nueva obligación"
            type="number"
            min={CUOTAS_MIN}
            max={CUOTAS_MAX}
            step={1}
            inputMode="numeric"
            placeholder="Ej.: 24"
            {...form.campo('numeroCuotas')}
          />
          <Input label="Fecha de la refinanciación" type="date" max={hoyISO()} {...form.campo('fecha')} />
          <div className="flex justify-between gap-3 rounded-md bg-slate-50 px-3 py-2.5 text-sm">
            <span className="text-muted">Número de la nueva obligación</span>
            <b>Se asigna automáticamente</b>
          </div>
          {permitida ? (
            <Alert tone="info">
              <NotaCierre obligacion={elegida} />
            </Alert>
          ) : (
            <Alert tone="aviso">
              TransUnion no acepta pasar de {elegida.estado?.codigo} · {elegida.estado?.descripcion} a <EstadoBadge codigo={cierre} /> (error 713). Define el
              tratamiento con CENS.
            </Alert>
          )}
          {aviso && <Alert tone="aviso">{aviso}</Alert>}
          {form.errorGeneral && <Alert>{form.errorGeneral}</Alert>}
        </form>
      )}
    </Modal>
  )
}

// Cómo se cierra la original y cómo nace la nueva (cambia con la obligación elegida).
function NotaCierre({ obligacion }) {
  if (!obligacion) return 'Elige la obligación original para ver cómo se cierra.'
  const cierre = estadoDeCierre(obligacion.estado?.codigo)
  return (
    <span>
      La obligación original pasa de <EstadoBadge codigo={obligacion.estado?.codigo} descripcion={obligacion.estado?.descripcion} /> a{' '}
      <EstadoBadge codigo={cierre} />
      {ESTADOS_QUE_CIERRAN_EN_07.includes(obligacion.estado?.codigo) && <PorConfirmar />} con modo de extinción <b>16 · Refinanciación</b> y tipo de pago{' '}
      <b>02 · No voluntario</b>. La nueva entra en <b>primer reporte</b> en Vigente (01), marcada como reestructurada.
    </span>
  )
}
