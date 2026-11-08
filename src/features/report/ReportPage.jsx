// Reporte a TransUnion (pantalla 12, HU-C), solo Analista. Mockup v3: vReporte y vResCargue.
// Cubre RF20, RF21, RF22, RF51, RF53, RF54 y el aviso de RF57: trabaja sobre el último corte (el que dejó la
// extracción), muestra las «Validaciones antes de generar», deja validar el corte (BORRADOR → VALIDADO),
// genera el archivo plano con los 6 pasos como guía mientras la petición está pendiente, y lista y
// descarga los archivos generados. Desde la lista se registra el envío, se cargan los archivos de
// respuesta de TransUnion y se ven sus resultados (RF54).
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Button, Card, EmptyState, Icon, PageHeader, PorConfirmar, Spinner, TextLink, useToast } from '../../components/ui'
import { ApiError, mensajeDeError } from '../../lib/api'
import { formatearFechaISOLarga, plural } from '../../lib/format'
import { usePageTitle } from '../../lib/usePageTitle'
import { getEntity } from '../entity/entityService'
import { getLatestCut, validateCut } from '../extraction/extractionService'
import SubmissionModal from '../extraction/SubmissionModal'
import CargueResultsView from './CargueResultsView'
import FilesTable from './FilesTable'
import GeneratedFileCard from './GeneratedFileCard'
import { mapErroresCorrectivos } from './reportMapper'
import { downloadFile, generateFile, getUploadResults, getValidations, listFiles } from './reportService'
import UploadResultsModal from './UploadResultsModal'
import ValidationChecklist from './ValidationChecklist'

const PASOS = [
  <>Revisar las validaciones del corte: las correctivas bloquean — RF53</>,
  <>Elegir las obligaciones: las abiertas y las que cerraron en este corte; sin las cerradas antes ni las eliminadas — RF13, RF16, RF21, RF50</>,
  <>Revisar los campos de cierre de Saldadas y Castigadas recuperadas — RF22</>,
  <>
    Convertir los valores a miles de pesos <PorConfirmar>redondeo por confirmar con TransUnion</PorConfirmar> — RF51
  </>,
  <>Armar el registro 1 (encabezado), un registro 2 por obligación y el registro 9 (totales) — RF20</>,
  <>Nombrar el archivo: SSR + tipo de entidad + código de entidad + fecha de corte — RF57</>,
]

export default function ReportPage() {
  usePageTitle('Reporte a TransUnion')
  const toast = useToast()
  const [corte, setCorte] = useState(undefined) // undefined = cargando; null = no hay cortes
  const [validaciones, setValidaciones] = useState(null)
  const [entidad, setEntidad] = useState(null)
  const [errorCarga, setErrorCarga] = useState('')
  const [intento, setIntento] = useState(0)
  const [accion, setAccion] = useState(null) // 'validar' | 'generar' | null
  const [errorAccion, setErrorAccion] = useState(null) // { mensaje, errores } | null
  const [generado, setGenerado] = useState(null) // Archivo recién generado (o null)
  const [archivos, setArchivos] = useState(null)
  const [errorArchivos, setErrorArchivos] = useState('')
  const [intentoArchivos, setIntentoArchivos] = useState(0)
  const [descargando, setDescargando] = useState(() => new Set()) // ids de los archivos que se están descargando
  const [archivoAEnviar, setArchivoAEnviar] = useState(null) // archivo del diálogo «Registrar envío»
  const [archivoACargar, setArchivoACargar] = useState(null) // archivo del modal «Cargar resultados»
  const [vista, setVista] = useState(null) // resultados a la vista: { archivo, resultados } | { archivo, error } | { archivo } (cargando)

  // Corte, validaciones y entidad. Las validaciones se vuelven a pedir después de validar o generar.
  useEffect(() => {
    let cancelado = false
    ;(async () => {
      const [ultimo, datosEntidad] = await Promise.all([getLatestCut(), getEntity()])
      const resultado = ultimo ? await getValidations(ultimo.id) : null
      return { ultimo, datosEntidad, resultado }
    })().then(
      ({ ultimo, datosEntidad, resultado }) => {
        if (cancelado) return
        setCorte(ultimo)
        setEntidad(datosEntidad)
        setValidaciones(resultado)
        setErrorCarga('')
      },
      (err) => !cancelado && setErrorCarga(mensajeDeError(err)),
    )
    return () => {
      cancelado = true
    }
  }, [intento])

  useEffect(() => {
    let cancelado = false
    listFiles().then(
      (lista) => {
        if (cancelado) return
        setArchivos(lista)
        setErrorArchivos('')
      },
      (err) => {
        if (cancelado) return
        setArchivos(null)
        setErrorArchivos(mensajeDeError(err))
      },
    )
    return () => {
      cancelado = true
    }
  }, [intentoArchivos])

  const ejecutar = async (tipo, pedir) => {
    setAccion(tipo)
    setErrorAccion(null)
    try {
      await pedir()
    } catch (err) {
      const errores = err instanceof ApiError ? mapErroresCorrectivos(err.datos?.errores) : []
      setErrorAccion({ mensaje: mensajeDeError(err), errores })
    } finally {
      setAccion(null)
      setIntento((n) => n + 1) // el estado del corte y las validaciones pueden haber cambiado
    }
  }

  const validar = () =>
    ejecutar('validar', async () => {
      await validateCut(corte.id)
      toast.success('Corte validado: ya puedes generar el archivo plano.')
    })

  const generar = () =>
    ejecutar('generar', async () => {
      setGenerado(null)
      const archivo = await generateFile(corte.id)
      setGenerado(archivo)
      setIntentoArchivos((n) => n + 1)
      toast.success(`Archivo generado: ${archivo.nombre}${archivo.aptoEnvio ? '.' : ' (no apto para envío).'}`)
    })

  const descargar = useCallback(
    async (archivo) => {
      setDescargando((ids) => new Set(ids).add(archivo.id))
      try {
        const nombre = await downloadFile(archivo)
        toast.success(`Descarga iniciada: ${nombre}.`)
      } catch (err) {
        toast.error(`No se pudo descargar el archivo. ${mensajeDeError(err)}`)
      } finally {
        setDescargando((ids) => {
          const quedan = new Set(ids)
          quedan.delete(archivo.id)
          return quedan
        })
      }
    },
    [toast],
  )

  // El archivo más reciente de cada corte (la lista llega del más reciente al más antiguo).
  const ultimos = useMemo(() => {
    const cortes = new Set()
    const ids = new Set()
    for (const a of archivos ?? []) {
      if (!cortes.has(a.corteId)) ids.add(a.id)
      cortes.add(a.corteId)
    }
    return ids
  }, [archivos])
  // Solo se envía el más reciente del corte de la página, y con ese corte VALIDADO (lo dice el corte, no la
  // copia de su estado que trae cada archivo).
  const enviables = useMemo(
    () => new Set((archivos ?? []).filter((a) => ultimos.has(a.id) && corte?.esValidado && a.corteId === corte.id).map((a) => a.id)),
    [archivos, ultimos, corte],
  )

  // Registrar el envío es irreversible: pide la fecha y la confirmación con el mismo diálogo de la Extracción.
  const enviado = () => {
    setArchivoAEnviar(null)
    toast.success('Envío registrado. Cuando TransUnion responda, carga aquí sus archivos de resultados.')
    setIntentoArchivos((n) => n + 1)
    setIntento((n) => n + 1)
  }

  const verResultados = useCallback((archivo) => {
    setVista({ archivo })
    getUploadResults(archivo.id).then(
      (resultados) => setVista((v) => (v?.archivo.id === archivo.id ? { archivo, resultados } : v)),
      (err) => setVista((v) => (v?.archivo.id === archivo.id ? { archivo, error: mensajeDeError(err) } : v)),
    )
  }, [])

  const cargados = (resultados) => {
    const archivo = archivoACargar
    setArchivoACargar(null)
    setVista({ archivo, resultados })
    setIntentoArchivos((n) => n + 1)
    setIntento((n) => n + 1)
    toast.success(`Resultados cargados: ${resultados.cargados} registros cargados, ${plural(resultados.inconsistencias.length, 'inconsistencia', 'inconsistencias')}.`)
  }

  // La tarjeta del archivo recién generado sigue a la lista (por ejemplo, cuando se registra su envío).
  const generadoActual = (generado && archivos?.find((a) => a.id === generado.id)) ?? generado

  return (
    <>
      <PageHeader title="Reporte a TransUnion" />
      {entidad?.conMarcador && (
        <div className="mb-5">
          <Alert tone="aviso">
            TransUnion aún no asigna los datos de la entidad. Mientras el tipo de entidad, el código de entidad y la sucursal lleven relleno (
            <span className="font-mono">XXX</span>), los archivos salen <b>no aptos para envío</b>. Los cambia el Administrador en «Datos de la Entidad».
          </Alert>
        </div>
      )}

      {errorCarga && (
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <Alert>No se pudo cargar el corte. {errorCarga}</Alert>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setErrorCarga('')
              setCorte(undefined)
              setIntento((n) => n + 1)
            }}
          >
            Reintentar
          </Button>
        </div>
      )}
      {corte === undefined && !errorCarga && (
        <div role="status" aria-label="Cargando el corte" className="flex justify-center p-12">
          <Spinner className="size-6" />
        </div>
      )}
      {corte === null && (
        <Card className="mb-5">
          <EmptyState>
            Aún no hay cortes. Primero genera la extracción y la actualización mensual. <TextLink to="/extraccion">Ir a Extracción de Cartera</TextLink>
          </EmptyState>
        </Card>
      )}
      {corte && validaciones && (
        <>
          <Parametros
            corte={corte}
            validaciones={validaciones}
            entidad={entidad}
            accion={accion}
            yaGenerado={archivos?.some((a) => a.corteId === corte.id)}
            onValidar={validar}
            onGenerar={generar}
          />
          {errorAccion && <ErrorAccion error={errorAccion} />}
          <Validaciones validaciones={validaciones} />
          {(accion === 'generar' || generado) && <Progreso enCurso={accion === 'generar'} />}
          {generadoActual && <GeneratedFileCard archivo={generadoActual} onDescargar={descargar} descargando={descargando.has(generadoActual.id)} />}
        </>
      )}

      <Archivos
        archivos={archivos}
        error={errorArchivos}
        onReintentar={() => {
          setErrorArchivos('')
          setIntentoArchivos((n) => n + 1)
        }}
        onDescargar={descargar}
        descargando={descargando}
        ultimos={ultimos}
        enviables={enviables}
        onRegistrarEnvio={setArchivoAEnviar}
        onCargarResultados={setArchivoACargar}
        onVerResultados={verResultados}
      />
      {vista && <Resultados vista={vista} onReintentar={() => verResultados(vista.archivo)} />}
      <UploadResultsModal archivo={archivoACargar} onCerrar={() => setArchivoACargar(null)} onCargados={cargados} />
      {archivoAEnviar && (
        <SubmissionModal corte={{ id: archivoAEnviar.corteId, fechaCorte: archivoAEnviar.fechaCorte }} onClose={() => setArchivoAEnviar(null)} onEnviado={enviado} />
      )}
    </>
  )
}

function Parametros({ corte, validaciones, entidad, accion, yaGenerado, onValidar, onGenerar }) {
  const hayCorrectivas = validaciones.resultados.some((r) => r.nivel === 'correctiva')
  const nombre = entidad ? `${entidad.prefijoArchivo}${corte.fechaCorte.replaceAll('-', '')}` : null
  let ayuda = 'Incluye las obligaciones abiertas y las que cerraron en este corte. Las que cerraron antes ya no se reportan.'
  if (!corte.esBorrador && !corte.esValidado) ayuda = 'Este corte ya se envió a TransUnion y no admite otro archivo. Para el siguiente reporte, genera la extracción del próximo corte.'
  else if (hayCorrectivas) ayuda = 'Corrige las validaciones en rojo para poder validar el corte y generar el archivo.'
  else if (corte.esBorrador) ayuda = 'El corte está en borrador: valídalo para poder generar el archivo.'
  else if (yaGenerado) ayuda = 'Ya existe un archivo para este corte: se generará una nueva versión.'
  return (
    <Card as="section" aria-label="Parámetros del reporte" className="mb-5 p-6">
      <div className="flex flex-wrap items-start gap-5">
        <div>
          <div className="text-xs text-muted">Fecha de corte</div>
          <b>{formatearFechaISOLarga(corte.fechaCorte)}</b>
          <div className="text-sm text-muted">Último corte · {corte.estado}</div>
        </div>
        <div className="min-w-60 flex-1">
          <div className="text-xs text-muted">Formato del archivo</div>
          <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
            {['TOTAL · toda la cartera', 'ANSI · longitud fija', 'Registros 1, 2 y 9 · Sector Real Servicios (SSR)'].map((t) => (
              <span key={t} className="rounded-full bg-slate-100 px-2.5 py-0.75 font-semibold text-slate-600">
                {t}
              </span>
            ))}
          </div>
          {nombre && (
            <div className="mt-1.5 text-sm text-muted">
              Nombre: <span className="font-mono">{nombre}</span>
            </div>
          )}
        </div>
        {corte.esBorrador ? (
          <Button onClick={onValidar} loading={accion === 'validar'} disabled={hayCorrectivas || accion !== null}>
            {accion !== 'validar' && <Icon name="check" size={16} />}
            Validar corte
          </Button>
        ) : (
          <Button onClick={onGenerar} loading={accion === 'generar'} disabled={!validaciones.puedeGenerar || accion !== null}>
            {accion !== 'generar' && <Icon name="file" size={16} />}
            {accion === 'generar' ? 'Generando…' : 'Generar archivo plano'}
          </Button>
        )}
      </div>
      <p className="mt-3 text-sm text-muted">{ayuda}</p>
    </Card>
  )
}

function ErrorAccion({ error }) {
  return (
    <div className="mb-5">
      <Alert>
        {error.mensaje}
        {error.errores.length > 0 && (
          <ul className="mt-1.5 list-disc pl-5 font-normal">
            {error.errores.map((e, i) => (
              <li key={`${e.regla}-${e.numeroObligacion}-${i}`}>
                {e.numeroObligacion &&
                  (e.id ? (
                    <Link to={`/obligaciones?obligacion=${e.id}`} className="font-mono font-bold underline">
                      {e.numeroObligacion}
                    </Link>
                  ) : (
                    <span className="font-mono font-bold">{e.numeroObligacion}</span>
                  ))}
                {e.campo && <span className="font-mono"> · {e.campo}</span>}
                {e.numeroObligacion ? ': ' : ''}
                {e.mensaje}
              </li>
            ))}
          </ul>
        )}
      </Alert>
    </div>
  )
}

function Validaciones({ validaciones }) {
  const id = useId()
  return (
    <Card as="section" aria-labelledby={id} className="mb-5 p-6">
      <h2 id={id} className="mb-4 font-semibold">
        Validaciones antes de generar (RF53)
      </h2>
      <ValidationChecklist resultados={validaciones.resultados} />
    </Card>
  )
}

function Progreso({ enCurso }) {
  const titulo = enCurso ? 'Generando el archivo plano…' : 'Generación del archivo completada'
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

function Archivos({ archivos, error, onReintentar, ...acciones }) {
  const id = useId()
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="font-hd text-lg font-bold">
        Archivos generados
      </h2>
      <p className="mb-3 text-sm text-muted">Cada archivo queda registrado con su corte, sus obligaciones y su estado.</p>
      {error && (
        <div className="flex flex-wrap items-center gap-3">
          <Alert>No se pudieron cargar los archivos. {error}</Alert>
          <Button variant="outline" size="sm" onClick={onReintentar}>
            Reintentar
          </Button>
        </div>
      )}
      {!archivos && !error && (
        <div role="status" aria-label="Cargando los archivos" className="flex justify-center p-8">
          <Spinner className="size-6" />
        </div>
      )}
      {archivos && (
        <Card className="overflow-hidden">
          {archivos.length === 0 ? (
            <EmptyState>Aún no se ha generado ningún archivo.</EmptyState>
          ) : (
            <FilesTable archivos={archivos} {...acciones} />
          )}
        </Card>
      )}
    </section>
  )
}

// Resultados del cargue del archivo elegido: carga, error con «Reintentar» o la vista (mockup: vResCargue).
// Al aparecer, la página se desplaza hasta ellos, como en el mockup.
function Resultados({ vista, onReintentar }) {
  const ref = useRef(null)
  const listos = Boolean(vista.resultados)
  useEffect(() => {
    if (listos) ref.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' })
  }, [listos, vista.archivo.id])
  if (vista.error) {
    return (
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Alert>No se pudieron cargar los resultados de {vista.archivo.nombre}. {vista.error}</Alert>
        <Button variant="outline" size="sm" onClick={onReintentar}>
          Reintentar
        </Button>
      </div>
    )
  }
  if (!listos) {
    return (
      <div role="status" aria-label="Cargando los resultados del cargue" className="flex justify-center p-8">
        <Spinner className="size-6" />
      </div>
    )
  }
  return (
    <div ref={ref}>
      <CargueResultsView resultados={vista.resultados} />
    </div>
  )
}
