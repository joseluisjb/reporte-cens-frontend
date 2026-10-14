// Extracción y Consolidación de Cartera (RF1, RF2, RF3, RF4, RF5, RF7, RF44). Maqueta 5.
// Responsable: Angel.
import { useEffect, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  FilterSelect,
  Icon,
  Input,
  PageHeader,
  Select,
  Spinner,
  Table,
  useToast,
} from '../../components/ui'
import {
  formatearCOP,
  formatearFechaHora,
  formatearFechaISO,
  hoyISO,
  plural,
} from '../../lib/format'
import { useFormulario } from '../../lib/useFormulario'
import { usePageTitle } from '../../lib/usePageTitle'
import { listConceptGroups } from '../parameters/parametersService'
import {
  generateCut,
  getCut,
  listCutObligations,
  listCuts,
  validateCut,
} from './extractionService'
import { mapCorteFieldErrors } from './extractionMapper'
import SubmissionModal from './SubmissionModal'
import ValidationErrorsModal from './ValidationErrorsModal'

const FILAS_POR_PAGINA = 20

function validarExtraccion({ fechaCorte }) {
  if (!fechaCorte) return { fechaCorte: 'Selecciona una fecha de corte.' }
  if (fechaCorte > hoyISO()) return { fechaCorte: 'La fecha de corte no puede ser futura.' }
  return {}
}

export default function ExtractionPage() {
  usePageTitle('Extracción y Consolidación de Cartera')
  const toast = useToast()

  const [gruposDisponibles, setGruposDisponibles] = useState([])

  // Estado de cortes y selección
  const [cortes, setCortes] = useState(null) // null = cargando
  const [corteActual, setCorteActual] = useState(null)
  const [errorCargaCortes, setErrorCargaCortes] = useState('')

  // Estado de las obligaciones del corte actual
  const [obligaciones, setObligaciones] = useState([])
  const [totalObligaciones, setTotalObligaciones] = useState(0)
  const [errorCargaObligaciones, setErrorCargaObligaciones] = useState('')
  const [paginaActual, setPaginaActual] = useState(1)
  const [versionCarga, setVersionCarga] = useState(0)
  const claveObligaciones = corteActual?.id
    ? `${corteActual.id}|${paginaActual}|${versionCarga}`
    : null
  const [claveCargada, setClaveCargada] = useState(null)
  // Se calcula en vez de guardarse: hay carga mientras la última clave resuelta
  // (corte, página y versión) no coincida con la solicitada.
  const cargandoObligaciones = claveObligaciones !== null && claveCargada !== claveObligaciones

  // Modales y acciones del ciclo de vida
  const [validando, setValidando] = useState(false)
  const [advertencias, setAdvertencias] = useState([])
  const [erroresCorrectivos, setErroresCorrectivos] = useState(null)
  const [modalEnvioAbierto, setModalEnvioAbierto] = useState(false)

  // Carga inicial de cortes y grupos de conceptos
  useEffect(() => {
    let cancelado = false

    Promise.all([listCuts(), listConceptGroups().catch(() => [])])
      .then(([listaCortes, grupos]) => {
        if (cancelado) return
        setCortes(listaCortes)
        setGruposDisponibles(grupos.filter((g) => g.activo))
        if (listaCortes.length > 0) {
          setCorteActual(listaCortes[0])
        }
      })
      .catch((err) => {
        if (!cancelado) setErrorCargaCortes(err.message)
      })

    return () => {
      cancelado = true
    }
  }, [])

  // Carga obligaciones cuando cambia el corte actual, la página o se fuerza recarga
  useEffect(() => {
    const id = corteActual?.id
    if (!id) return

    const clave = claveObligaciones
    let cancelado = false
    const desplazamiento = (paginaActual - 1) * FILAS_POR_PAGINA

    listCutObligations(id, {
      limite: FILAS_POR_PAGINA,
      desplazamiento,
    })
      .then(({ items, total }) => {
        if (cancelado) return
        setObligaciones(items)
        setTotalObligaciones(total)
        setErrorCargaObligaciones('')
      })
      .catch((err) => {
        if (!cancelado) setErrorCargaObligaciones(err.message)
      })
      .finally(() => {
        if (!cancelado) setClaveCargada(clave)
      })

    return () => {
      cancelado = true
    }
  }, [corteActual?.id, paginaActual, versionCarga, claveObligaciones, toast])

  // Iniciar / Generar nuevo corte (síncrono). Formulario reutilizable de RF31 (`useFormulario`).
  const formExtraccion = useFormulario({
    valoresIniciales: { fechaCorte: hoyISO(), grupoId: '' },
    validar: validarExtraccion,
    traducirErrores: mapCorteFieldErrors,
    onSubmit: async ({ fechaCorte, grupoId }) => {
      const nuevoCorte = await generateCut({
        fechaCorte,
        grupoId: grupoId ? Number(grupoId) : null,
      })

      // Actualiza cortes y selecciona el nuevo como actual
      setCortes((prev) => {
        const sinReemplazado = (prev ?? []).filter((c) => c.id !== nuevoCorte.id)
        return [nuevoCorte, ...sinReemplazado]
      })
      setCorteActual(nuevoCorte)
      setPaginaActual(1)
      setVersionCarga((v) => v + 1)
      setAdvertencias([])
      toast.success(
        `Corte de cartera generado correctamente (${plural(nuevoCorte.totalObligaciones, 'obligación', 'obligaciones')}).`,
      )
    },
  })

  // Validar corte en BORRADOR
  const ejecutarValidacion = async () => {
    if (!corteActual) return
    setValidando(true)
    setAdvertencias([])

    try {
      const { corte, advertencias: advs } = await validateCut(corteActual.id)
      setCorteActual(corte)
      setCortes((prev) => prev.map((c) => (c.id === corte.id ? corte : c)))
      setAdvertencias(advs ?? [])
      toast.success('El corte ha sido validado correctamente.')
    } catch (err) {
      if (err.status === 409 && err.datos?.errores) {
        setErroresCorrectivos(err.datos.errores)
      } else {
        toast.error(err.message)
      }
    } finally {
      setValidando(false)
    }
  }

  // Finalizar envío a TransUnion
  const corteEnviado = (corteActualizado) => {
    setModalEnvioAbierto(false)
    setCorteActual(corteActualizado)
    setCortes((prev) => prev.map((c) => (c.id === corteActualizado.id ? corteActualizado : c)))
    toast.success('Envío a TransUnion registrado exitosamente.')
  }

  const reintentarCargaObligaciones = () => {
    setErrorCargaObligaciones('')
    setVersionCarga((version) => version + 1)
  }

  // Cambiar selección de corte
  const seleccionarCorte = async (id) => {
    try {
      const corte = await getCut(id)
      setCorteActual(corte)
      setPaginaActual(1)
      setAdvertencias([])
    } catch (err) {
      toast.error(err.message)
    }
  }

  const totalPaginas = Math.ceil(totalObligaciones / FILAS_POR_PAGINA) || 1

  return (
    <>
      <PageHeader title="Extracción y Consolidación de Cartera" />

      {/* Formulario de nueva extracción (RF1, RF2, RF44) */}
      <Card className="mb-6 p-6">
        <h2 className="font-hd text-lg font-bold text-ink">
          Iniciar extracción mensual de cartera
        </h2>
        <p className="mt-1 text-sm text-muted">
          Aísla y consolida exclusivamente los conceptos de energía de deudores con financiación
          vigente según las reglas de negocio de CENS.
        </p>

        <form {...formExtraccion.formProps} className="mt-5">
          <div className="grid gap-4 md:grid-cols-3 md:items-end">
            <div>
              <Input
                label="Fecha de corte"
                type="date"
                required
                max={hoyISO()}
                {...formExtraccion.campo('fechaCorte')}
              />
            </div>

            <div>
              <Select label="Grupo de conceptos de energía" {...formExtraccion.campo('grupoId')}>
                <option value="">Todos los conceptos reportables (predeterminado)</option>
                {gruposDisponibles.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nombre}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Button type="submit" loading={formExtraccion.enviando} block>
                <Icon name="bolt" size={16} />
                Iniciar extracción
              </Button>
            </div>
          </div>

          {formExtraccion.errorGeneral && (
            <div className="mt-4">
              <Alert>{formExtraccion.errorGeneral}</Alert>
            </div>
          )}
        </form>
      </Card>

      {/* Selector de corte y estado actual */}
      {errorCargaCortes && (
        <div className="mb-4">
          <Alert>{errorCargaCortes}</Alert>
        </div>
      )}

      {!cortes && !errorCargaCortes && (
        <div role="status" aria-label="Cargando extracciones" className="flex justify-center p-12">
          <Spinner className="size-6" />
        </div>
      )}

      {cortes && cortes.length === 0 && (
        <Card className="p-8 text-center">
          <EmptyState>Aún no se ha realizado ninguna extracción de cartera.</EmptyState>
        </Card>
      )}

      {corteActual && (
        <>
          {/* Tarjeta de Resumen y Ciclo de Vida del Corte Actual */}
          <Card className="mb-6 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gris-d pb-4">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="font-hd text-xl font-bold text-ink">
                  Corte #{corteActual.id} al {formatearFechaISO(corteActual.fechaCorte)}
                </h3>
                <Badge
                  tone={
                    corteActual.esEnviado
                      ? 'ok'
                      : corteActual.esValidado
                        ? 'admin'
                        : 'off'
                  }
                >
                  {corteActual.estado}
                </Badge>
              </div>

              {/* Selector para cambiar de corte si hay más de uno */}
              {cortes.length > 1 && (
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" className="text-xs text-muted">
                    Historial de cortes:
                  </span>
                  <FilterSelect
                    label="Historial de cortes"
                    value={corteActual.id}
                    onChange={(e) => seleccionarCorte(Number(e.target.value))}
                  >
                    {cortes.map((c) => (
                      <option key={c.id} value={c.id}>
                        Corte {c.id} ({formatearFechaISO(c.fechaCorte)}) - {c.estado}
                      </option>
                    ))}
                  </FilterSelect>
                </div>
              )}
            </div>

            {/* Métricas clave del corte */}
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-ctl bg-fondo p-3">
                <span className="text-xs text-muted">Total obligaciones</span>
                <p className="font-hd text-xl font-bold text-bosque-d">
                  {corteActual.totalObligaciones}
                </p>
              </div>
              <div className="rounded-ctl bg-fondo p-3">
                <span className="text-xs text-muted">Saldo neto reportado</span>
                <p className="font-hd text-xl font-bold text-slate-700">
                  {formatearCOP(corteActual.saldoConsolidado)}
                </p>
              </div>
              <div className="rounded-ctl bg-fondo p-3">
                <span className="text-xs text-muted">Fecha de ejecución</span>
                <p className="text-sm font-semibold text-slate-700">
                  {corteActual.fechaEjecucion
                    ? formatearFechaHora(corteActual.fechaEjecucion)
                    : '—'}
                </p>
              </div>
              <div className="rounded-ctl bg-fondo p-3">
                <span className="text-xs text-muted">Grupo de conceptos</span>
                <p className="text-sm font-semibold text-slate-700">
                  {corteActual.grupo ? corteActual.grupo.nombre : 'Todos los reportables'}
                </p>
              </div>
            </div>

            {/* Advertencias informativas no bloqueantes */}
            {advertencias.length > 0 && (
              <div className="mt-4">
                <Alert tone="aviso">
                  <strong>Validado con observaciones informativas:</strong>
                  <ul className="mt-1 list-inside list-disc text-xs">
                    {advertencias.map((adv, i) => (
                      <li key={i}>
                        <strong>{adv.regla}:</strong> {adv.mensaje}
                      </li>
                    ))}
                  </ul>
                </Alert>
              </div>
            )}

            {/* Barra de acciones del ciclo de corte */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gris-d pt-4">
              <div className="text-xs text-muted">
                {corteActual.ejecutadaPor && (
                  <span>Generado por: <strong>{corteActual.ejecutadaPor}</strong></span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {corteActual.esBorrador && (
                  <Button onClick={ejecutarValidacion} loading={validando}>
                    <Icon name="check" size={16} />
                    Validar corte
                  </Button>
                )}

                {corteActual.esValidado && (
                  <Button onClick={() => setModalEnvioAbierto(true)}>
                    <Icon name="upload" size={16} />
                    Registrar envío a TransUnion
                  </Button>
                )}

                {corteActual.esEnviado && (
                  <div className="flex items-center gap-2 text-sm font-medium text-bosque-d">
                    <Icon name="check" size={18} />
                    <span>Reporte finalizado y enviado a TransUnion</span>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Tabla de Resultados Consolidados de Deudores (RF3, RF4, RF5, RF7) */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-gris-d p-4">
              <h3 className="font-hd font-bold text-ink">
                Obligaciones consolidadas ({totalObligaciones})
              </h3>
              <span className="text-xs text-muted">
                Identificación protegida bajo Ley de Habeas Data
              </span>
            </div>

            <div className="border-b border-gris-d px-4 py-3 text-sm text-muted">
              El contrato actual informa saldo neto, días de mora y edad de mora. No incluye el estado
              individual de consolidación ni el detalle de facturación y pagos; esos valores no se
              infieren en esta pantalla.
            </div>

            {cargandoObligaciones ? (
              <div role="status" aria-label="Cargando obligaciones" className="flex justify-center p-12">
                <Spinner className="size-6" />
              </div>
            ) : errorCargaObligaciones ? (
              <div className="flex flex-wrap items-center gap-3 p-4">
                <Alert>{errorCargaObligaciones}</Alert>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={reintentarCargaObligaciones}
                >
                  Reintentar carga de obligaciones
                </Button>
              </div>
            ) : obligaciones.length === 0 ? (
              <EmptyState>No hay obligaciones en este corte.</EmptyState>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table caption="Resultados consolidados de cartera a reportar">
                    <thead>
                      <tr>
                        <th scope="col">N° Obligación</th>
                        <th scope="col">Titular</th>
                        <th scope="col">Identificación</th>
                        <th scope="col" className="text-center">Créditos</th>
                        <th scope="col">Estado TU</th>
                        <th scope="col" className="text-center">Días Mora</th>
                        <th scope="col">Edad Mora (T9)</th>
                        <th scope="col" className="text-right">Valor Mora</th>
                        <th scope="col" className="text-right">Saldo neto (COP)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {obligaciones.map((o) => (
                        <tr key={o.numeroObligacion}>
                          <td className="font-mono text-xs font-semibold text-ink">
                            {o.numeroObligacion}
                          </td>
                          <td className="font-medium text-ink">{o.nombreTitular}</td>
                          <td className="font-mono text-xs text-muted">{o.identificacion}</td>
                          <td className="text-center font-semibold text-slate-700">
                            {o.nCreditos}
                          </td>
                          <td>
                            <Badge tone={o.estado.codigo === '01' ? 'ok' : 'off'}>
                              {o.estado.codigo} - {o.estado.descripcion}
                            </Badge>
                          </td>
                          <td className="text-center">
                            <span
                              className={`font-semibold ${
                                o.diasMora > 0 ? 'text-danger' : 'text-bosque-d'
                              }`}
                            >
                              {o.diasMora}
                            </span>
                          </td>
                          <td>
                            <span className="text-xs text-slate-700">
                              {o.edadMora.codigo} {o.edadMora.descripcion}
                            </span>
                          </td>
                          <td className="text-right font-medium text-slate-700">
                            {formatearCOP(o.valorMora)}
                          </td>
                          <td className="text-right font-semibold text-slate-700">
                            {formatearCOP(o.valorSaldo)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>

                {/* Paginación */}
                {totalPaginas > 1 && (
                  <div className="flex items-center justify-between border-t border-gris-d p-4 text-sm text-slate-700">
                    <span className="text-xs text-muted">
                      Mostrando {(paginaActual - 1) * FILAS_POR_PAGINA + 1} a{' '}
                      {Math.min(paginaActual * FILAS_POR_PAGINA, totalObligaciones)} de{' '}
                      {totalObligaciones} obligaciones
                    </span>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={paginaActual <= 1}
                        onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                      >
                        Anterior
                      </Button>
                      <span className="text-xs font-semibold">
                        Página {paginaActual} de {totalPaginas}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={paginaActual >= totalPaginas}
                        onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        </>
      )}

      {/* Modal de errores correctivos de validación */}
      {erroresCorrectivos && (
        <ValidationErrorsModal
          errores={erroresCorrectivos}
          onClose={() => setErroresCorrectivos(null)}
        />
      )}

      {/* Modal para registrar envío a TransUnion */}
      {modalEnvioAbierto && corteActual && (
        <SubmissionModal
          corte={corteActual}
          onClose={() => setModalEnvioAbierto(false)}
          onEnviado={corteEnviado}
        />
      )}
    </>
  )
}
