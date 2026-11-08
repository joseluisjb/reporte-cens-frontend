// Pantalla 16 · Homologación de Estados (RF48). Solo Administrador (la guarda está en navigation.js; el
// Analista ve «Acceso restringido»). Mockup v3: vHomologacion.
//  - Estados del SAC: cada uno se reporta como un estado de TransUnion en uso o como un cierre (RF12, RF15);
//    sin homologar, sus obligaciones se bloquean en la validación del corte (RF53). La prioridad viene de
//    la carga inicial y aquí no se edita (contrato 0.9.1).
//  - Estados de TransUnion: los 10 de la Tabla 4b (Manual, p. 64), para consulta.
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Alert, Badge, Button, Card, EmptyState, Icon, PageHeader, PorConfirmar, Spinner, Table, useToast } from '../../components/ui'
import { ApiError, mensajeDeError } from '../../lib/api'
import { formatearFechaHora, plural } from '../../lib/format'
import { usePageTitle } from '../../lib/usePageTitle'
import CandadoCerrada from '../transunion/CandadoCerrada'
import { descripcionEstado } from '../transunion/catalogosTU'
import EstadoBadge from '../transunion/EstadoBadge'
import { mapHomologacionFieldErrors } from './stateMappingMapper'
import { getStateMappings, getTuStates, updateStateMapping } from './stateMappingService'
import { ACCIONES, asignables, validarHomologacion } from './stateMappingValidation'

const TITULO = 'Homologación de Estados'

// Notas del uso de cada estado en CENS (ficha RF48 y mockup v3, `estUso`).
const NOTAS = {
  '02': 'Cierre: se reporta una sola vez',
  '03': 'Crédito caducado con mora (RF14)',
  '04': 'Propuesta: desde 04 no se puede volver a Vigente ni cerrar',
  '06': 'Castigo contable de CENS con mora (RF45)',
  '07': 'Cierre: se reporta una sola vez',
  '08': 'No se usa (Acta 3)',
  '10': 'Solo si el cliente está admitido en el proceso de ley',
  '11': 'Solo si el cliente está admitido en el proceso de ley',
  '12': 'Solo si el cliente está admitido en el proceso de ley',
}

// «01 · Vigente», con el nombre que manda la API (GET /estados/) o, si no lo trae, el del catálogo local.
const textoEstado = (codigo, estados) => `${codigo} · ${estados.find((e) => e.codigo === codigo)?.nombre ?? descripcionEstado(codigo)}`
const comoSeReporta = (accion, estadoTu, estados) => (accion === ACCIONES.CIERRE ? 'cierre' : textoEstado(estadoTu, estados))

export default function StateMappingPage() {
  usePageTitle(TITULO)
  const toast = useToast()
  const [datos, setDatos] = useState(null) // { estados, homologaciones } | null mientras carga
  const [errorCarga, setErrorCarga] = useState('')
  const [intento, setIntento] = useState(0)
  const [editando, setEditando] = useState(null) // estado del SAC en edición
  const botonesEditar = useRef({})
  const [foco, setFoco] = useState(null) // estado del SAC cuyo «Editar» recibe el foco al salir de la edición

  useEffect(() => {
    let cancelado = false
    Promise.all([getTuStates(), getStateMappings()]).then(
      ([estados, homologaciones]) => {
        if (cancelado) return
        setDatos({ estados, homologaciones })
        setErrorCarga('')
      },
      (err) => !cancelado && setErrorCarga(mensajeDeError(err)),
    )
    return () => {
      cancelado = true
    }
  }, [intento])

  useEffect(() => {
    if (foco && !editando) botonesEditar.current[foco]?.focus()
  }, [foco, editando])

  const salir = useCallback((sac) => {
    setEditando(null)
    setFoco(sac)
  }, [])

  const guardada = useCallback(
    (h) => {
      setDatos((d) => ({ ...d, homologaciones: d.homologaciones.map((x) => (x.estadoSac === h.estadoSac ? h : x)) }))
      salir(h.estadoSac)
      toast.success(`Homologación guardada: el estado ${h.estadoSac} se reporta como ${comoSeReporta(h.accion, h.estadoTu, datos.estados)}.`)
    },
    [salir, toast, datos],
  )

  const sinCambios = useCallback(
    (sac) => {
      salir(sac)
      toast.success(`Sin cambios en la homologación del estado ${sac}.`)
    },
    [salir, toast],
  )

  return (
    <>
      <PageHeader title={TITULO} />
      {errorCarga && (
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <Alert>No se pudo cargar la homologación de estados. {errorCarga}</Alert>
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
      {!datos && !errorCarga && (
        <div role="status" aria-label="Cargando la homologación de estados" className="flex justify-center p-12">
          <Spinner className="size-6" />
        </div>
      )}
      {datos && (
        <>
          <AvisoSinHomologar homologaciones={datos.homologaciones} />
          <EstadosSac
            datos={datos}
            editando={editando}
            onEditar={setEditando}
            onCancelar={salir}
            onGuardada={guardada}
            onSinCambios={sinCambios}
            botonesEditar={botonesEditar}
          />
          <EstadosTransUnion estados={datos.estados} />
          <p className="mt-5 text-sm text-muted">Cada cambio queda en la bitácora (módulo Parametrización) y se aplica desde la próxima actualización mensual.</p>
        </>
      )}
    </>
  )
}

function AvisoSinHomologar({ homologaciones }) {
  const sin = homologaciones.filter((h) => !h.accion)
  if (!homologaciones.length) return null // sin estados cargados no hay nada que avisar: lo dice la tabla
  if (!sin.length) {
    return (
      <div className="mb-5">
        <Alert tone="info">Todos los estados del SAC están homologados.</Alert>
      </div>
    )
  }
  return (
    <div className="mb-5">
      <Alert tone="aviso">
        <b>
          {plural(sin.length, 'estado del SAC sin homologar', 'estados del SAC sin homologar')} ({sin.map((h) => h.estadoSac).join(', ')})
        </b>
        : las obligaciones con {sin.length === 1 ? 'ese estado' : 'esos estados'} se bloquean en la validación del corte (RF53) hasta que se homologuen.{' '}
        <PorConfirmar>pendiente de CENS</PorConfirmar>
      </Alert>
    </div>
  )
}

function EstadosSac({ datos, editando, onEditar, onCancelar, onGuardada, onSinCambios, botonesEditar }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="mb-6">
      <h2 id={id} className="font-hd text-lg font-bold">
        Estados del sistema comercial (SAC)
      </h2>
      <p className="text-sm text-muted">
        Cada estado del crédito en el SAC se reporta como un estado de TransUnion o como un cierre. Solo se pueden elegir los estados que CENS usa.
      </p>
      <p className="mb-3 text-sm text-muted">
        Si los créditos de una obligación tienen estados distintos, la obligación toma el de menor número de prioridad (el 1 gana sobre el 5); si alguno está sin
        homologar, se bloquea en la validación del corte (RF53). La prioridad viene de la carga inicial y aquí no se edita. <PorConfirmar />
      </p>
      <Card className="overflow-hidden">
        {datos.homologaciones.length === 0 ? (
          <EmptyState>No hay estados del SAC cargados: se cargan con la carga inicial de la base (script 12).</EmptyState>
        ) : (
        <Table caption="Estados del sistema comercial (SAC)">
          <thead>
            <tr>
              <th scope="col">Estado del SAC</th>
              <th scope="col">Prioridad</th>
              <th scope="col">Descripción</th>
              <th scope="col">Se reporta como</th>
              <th scope="col">Confirmado</th>
              <th scope="col">Última actualización</th>
              <th scope="col">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {datos.homologaciones.map((h) =>
              editando === h.estadoSac ? (
                <FilaEdicion key={h.estadoSac} homologacion={h} estados={datos.estados} onCancelar={onCancelar} onGuardada={onGuardada} onSinCambios={onSinCambios} />
              ) : (
                <tr key={h.estadoSac}>
                  <td className="font-mono font-bold">{h.estadoSac}</td>
                  <td className="font-mono">{h.prioridad}</td>
                  <td className="text-muted">{h.descripcion ?? 'Por confirmar con CENS'}</td>
                  <td>
                    <SeReportaComo homologacion={h} />
                  </td>
                  <td>{h.confirmado ? <Badge tone="ok">Confirmado</Badge> : <PorConfirmar />}</td>
                  <td className="whitespace-nowrap">
                    {h.actualizadoPor ? (
                      <>
                        <span className="font-mono">{formatearFechaHora(h.fechaActualizacion)}</span>
                        <div className="text-xs text-muted">{h.actualizadoPor}</div>
                      </>
                    ) : (
                      <span className="text-xs text-muted">Carga inicial (script 12)</span>
                    )}
                  </td>
                  <td>
                    <Button
                      ref={(el) => {
                        botonesEditar.current[h.estadoSac] = el
                      }}
                      variant="outline"
                      size="sm"
                      disabled={editando !== null}
                      onClick={() => onEditar(h.estadoSac)}
                      aria-label={`Editar la homologación del estado ${h.estadoSac}`}
                    >
                      <Icon name="edit" size={14} />
                      Editar
                    </Button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </Table>
        )}
      </Card>
    </section>
  )
}

function SeReportaComo({ homologacion: h }) {
  if (h.accion === ACCIONES.CIERRE) {
    return (
      <>
        <Badge tone="info">Cierre</Badge>
        <div className="text-xs text-muted">Saldada (02) o Castigada recuperada (07), según el estado anterior (RF12, RF15)</div>
      </>
    )
  }
  if (h.accion === ACCIONES.ESTADO) return <EstadoBadge codigo={h.estadoTu} />
  return <Badge tone="error">Sin homologar</Badge>
}

function FilaEdicion({ homologacion: h, estados, onCancelar, onGuardada, onSinCambios }) {
  const ids = { accion: useId(), estadoTu: useId(), confirmado: useId(), error: useId() }
  const [accion, setAccion] = useState(h.accion ?? ACCIONES.ESTADO)
  const [estadoTu, setEstadoTu] = useState(h.estadoTu ?? '')
  const [confirmado, setConfirmado] = useState(h.confirmado)
  const [errores, setErrores] = useState({}) // { accion?, estadoTu?, general? }
  const [enviando, setEnviando] = useState(false)
  const selectorAccion = useRef(null)
  useEffect(() => selectorAccion.current?.focus(), []) // como el mockup: al editar, el foco va a la acción
  const esCierre = accion === ACCIONES.CIERRE
  const mensaje = errores.estadoTu || errores.accion || errores.general

  const guardar = async () => {
    const valores = { accion, estadoTu: esCierre ? null : estadoTu || null, confirmado }
    const locales = validarHomologacion(valores, estados)
    if (locales.accion || locales.estadoTu) {
      setErrores(locales)
      return
    }
    if (valores.accion === h.accion && valores.estadoTu === h.estadoTu && confirmado === h.confirmado) {
      onSinCambios(h.estadoSac)
      return
    }
    setEnviando(true)
    setErrores({})
    try {
      onGuardada(await updateStateMapping(h.estadoSac, valores))
    } catch (err) {
      const deCampo = err instanceof ApiError ? mapHomologacionFieldErrors(err.fieldErrors) : {}
      setErrores(deCampo.accion || deCampo.estadoTu ? deCampo : { general: `No se pudo guardar. ${mensajeDeError(err)}` })
      setEnviando(false)
    }
  }

  return (
    <tr className="bg-amber-50/40">
      <td className="font-mono font-bold">{h.estadoSac}</td>
      <td className="font-mono">{h.prioridad}</td>
      <td className="text-muted">{h.descripcion ?? 'Por confirmar con CENS'}</td>
      <td colSpan={3}>
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor={ids.accion} className="sr-only">
            Cómo se reporta el estado {h.estadoSac}
          </label>
          <select
            id={ids.accion}
            ref={selectorAccion}
            value={accion}
            aria-invalid={errores.accion ? 'true' : undefined}
            aria-describedby={errores.accion ? ids.error : undefined}
            onChange={(e) => {
              setAccion(e.target.value)
              setErrores({})
            }}
            className="rounded-ctl border border-gris-d bg-white px-3 py-2 text-sm"
          >
            <option value={ACCIONES.ESTADO}>Estado de TransUnion</option>
            <option value={ACCIONES.CIERRE}>Cierre (RF12 o RF15)</option>
          </select>
          <label htmlFor={ids.estadoTu} className="sr-only">
            Estado de TransUnion para {h.estadoSac}
          </label>
          <select
            id={ids.estadoTu}
            value={esCierre ? '' : estadoTu}
            disabled={esCierre}
            onChange={(e) => {
              setEstadoTu(e.target.value)
              setErrores({})
            }}
            aria-invalid={errores.estadoTu ? 'true' : undefined}
            aria-describedby={errores.estadoTu ? ids.error : undefined}
            className="rounded-ctl border border-gris-d bg-white px-3 py-2 text-sm disabled:bg-slate-100 aria-[invalid=true]:border-error"
          >
            <option value="">Selecciona…</option>
            {asignables(estados).map((e) => (
              <option key={e.codigo} value={e.codigo} disabled={!e.usado}>
                {textoEstado(e.codigo, estados)}
                {e.usado ? '' : ' (no se usa)'}
              </option>
            ))}
          </select>
          <label htmlFor={ids.confirmado} className="flex items-center gap-2 text-sm">
            <input
              id={ids.confirmado}
              type="checkbox"
              checked={confirmado}
              onChange={(e) => {
                setConfirmado(e.target.checked)
                setErrores({})
              }}
            />
            Confirmado por CENS
          </label>
        </div>
        {mensaje && (
          <p id={ids.error} role="alert" className="mt-1.5 text-[13px] font-semibold text-error-d">
            {mensaje}
          </p>
        )}
      </td>
      <td className="whitespace-nowrap">
        <div className="flex gap-2">
          <Button size="sm" loading={enviando} onClick={guardar}>
            Guardar
          </Button>
          <Button variant="ghost" size="sm" disabled={enviando} onClick={() => onCancelar(h.estadoSac)}>
            Cancelar
          </Button>
        </div>
      </td>
    </tr>
  )
}

function EstadosTransUnion({ estados }) {
  const id = useId()
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="font-hd text-lg font-bold">
        Estados de TransUnion (Tabla 4b · Sector Real Servicios)
      </h2>
      <p className="mb-3 text-sm text-muted">Los 10 estados del Manual, para consulta: los define TransUnion y su uso lo aprueba CENS.</p>
      <Card className="overflow-hidden">
        {estados.length === 0 ? (
          <EmptyState>No hay estados de TransUnion cargados.</EmptyState>
        ) : (
        <Table compact caption="Estados de TransUnion (Tabla 4b)">
          <thead>
            <tr>
              <th scope="col">Código</th>
              <th scope="col">Estado</th>
              <th scope="col">¿Se usa en CENS?</th>
              <th scope="col">Nota</th>
            </tr>
          </thead>
          <tbody>
            {estados.map((e) => (
              <tr key={e.codigo}>
                <td className="font-mono">{e.codigo}</td>
                <td className="whitespace-nowrap">
                  <EstadoBadge codigo={e.codigo} descripcion={e.nombre} />
                  {e.esCierre && <CandadoCerrada />}
                </td>
                <td className="whitespace-nowrap">
                  {e.usado ? <Badge tone="ok">Sí</Badge> : <Badge tone="off">No</Badge>} {!e.confirmado && <PorConfirmar />}
                </td>
                <td className="text-muted">{NOTAS[e.codigo] ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        )}
      </Card>
    </section>
  )
}
