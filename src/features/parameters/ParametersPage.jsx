// Parametrización de Conceptos de Energía (RF35) y Grupos de Conceptos (RF43). Maqueta 6.
// Responsable: Angel (RF35).
import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  FilterSelect,
  Icon,
  IconButton,
  PageHeader,
  SearchBox,
  Spinner,
  Switch,
  Table,
  useToast,
} from '../../components/ui'
import { formatearFechaISO } from '../../lib/format'
import { usePageTitle } from '../../lib/usePageTitle'
import { useAuth } from '../auth/authContext'
import { ROLES } from '../auth/roles'
import ConceptFormPanel from './ConceptFormPanel'
import GroupFormModal from './GroupFormModal'
import {
  deleteConceptGroup,
  listConceptGroups,
  listConcepts,
  setConceptActive,
  setConceptGroupActive,
} from './parametersService'

const RESALTADO_MS = 2600

export default function ParametersPage() {
  usePageTitle('Códigos de Concepto de Energía')
  const { user } = useAuth()
  const esAdmin = user.rol === ROLES.ADMIN
  const toast = useToast()

  const [pestana, setPestana] = useState('conceptos') // 'conceptos' | 'grupos'

  // Estado de conceptos
  const [conceptos, setConceptos] = useState(null) // null = cargando
  const [errorCarga, setErrorCarga] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [panelConcepto, setPanelConcepto] = useState(null) // null | { concepto? }
  const [aDesactivarConcepto, setADesactivarConcepto] = useState(null)
  const [ocupadoConcepto, setOcupadoConcepto] = useState(null)
  const [resaltadoConcepto, setResaltadoConcepto] = useState(null)

  // Estado de grupos
  const [grupos, setGrupos] = useState(null)
  const [errorGrupos, setErrorGrupos] = useState('')
  const [modalGrupo, setModalGrupo] = useState(null) // null | { grupo? }
  const [aEliminarGrupo, setAEliminarGrupo] = useState(null)
  const [aDesactivarGrupo, setADesactivarGrupo] = useState(null)
  const [ocupadoGrupo, setOcupadoGrupo] = useState(null)

  // Carga inicial de conceptos
  useEffect(() => {
    let cancelado = false
    listConcepts()
      .then((lista) => !cancelado && setConceptos(lista))
      .catch((err) => !cancelado && setErrorCarga(err.message))
    return () => {
      cancelado = true
    }
  }, [])

  // Carga de grupos al cambiar a la pestaña de grupos
  useEffect(() => {
    if (pestana === 'grupos' && grupos === null) {
      let cancelado = false
      listConceptGroups()
        .then((lista) => !cancelado && setGrupos(lista))
        .catch((err) => !cancelado && setErrorGrupos(err.message))
      return () => {
        cancelado = true
      }
    }
  }, [pestana, grupos])

  const reintentarConceptos = async () => {
    setErrorCarga('')
    try {
      setConceptos(await listConcepts())
    } catch (err) {
      setErrorCarga(err.message)
    }
  }

  const reintentarGrupos = async () => {
    setErrorGrupos('')
    try {
      setGrupos(await listConceptGroups())
    } catch (err) {
      setErrorGrupos(err.message)
    }
  }

  const resaltar = (codigo) => {
    setResaltadoConcepto(codigo)
    setTimeout(() => setResaltadoConcepto(null), RESALTADO_MS)
  }

  // Guardado de concepto
  const guardadoConcepto = ({ concepto, creado }) => {
    setPanelConcepto(null)
    if (creado) {
      setConceptos((prev) => [...prev, concepto].toSorted((a, b) => a.codigo - b.codigo))
      toast.success(`Concepto ${concepto.codigo} creado correctamente.`)
    } else {
      setConceptos((prev) => prev.map((c) => (c.codigo === concepto.codigo ? concepto : c)))
      toast.success(`Concepto ${concepto.codigo} actualizado correctamente.`)
    }
    resaltar(concepto.codigo)
  }

  // Activar o desactivar concepto
  const cambiarEstadoConcepto = async (concepto, activo) => {
    setOcupadoConcepto(concepto.codigo)
    try {
      const actualizado = await setConceptActive(concepto.codigo, activo)
      setConceptos((prev) => prev.map((c) => (c.codigo === actualizado.codigo ? actualizado : c)))
      toast.success(
        activo
          ? `Concepto ${concepto.codigo} activado.`
          : `Concepto ${concepto.codigo} desactivado.`,
      )
    } catch (err) {
      toast.error(err.message)
    } finally {
      setOcupadoConcepto(null)
      setADesactivarConcepto(null)
    }
  }

  // Guardado de grupo
  const guardadoGrupo = ({ grupo, creado }) => {
    setModalGrupo(null)
    if (creado) {
      setGrupos((prev) => [...(prev ?? []), grupo].toSorted((a, b) => a.id - b.id))
      toast.success(`Grupo «${grupo.nombre}» creado correctamente.`)
    } else {
      setGrupos((prev) => prev.map((g) => (g.id === grupo.id ? grupo : g)))
      toast.success(`Grupo «${grupo.nombre}» actualizado correctamente.`)
    }
  }

  // Activar o desactivar grupo
  const cambiarEstadoGrupo = async (grupo, activo) => {
    setOcupadoGrupo(grupo.id)
    try {
      const actualizado = await setConceptGroupActive(grupo.id, activo)
      setGrupos((prev) => prev.map((g) => (g.id === actualizado.id ? actualizado : g)))
      toast.success(
        activo
          ? `Grupo «${grupo.nombre}» activado.`
          : `Grupo «${grupo.nombre}» desactivado.`,
      )
    } catch (err) {
      toast.error(err.message)
    } finally {
      setOcupadoGrupo(null)
      setADesactivarGrupo(null)
    }
  }

  // Eliminar grupo
  const eliminarGrupo = async (grupo) => {
    setOcupadoGrupo(grupo.id)
    try {
      await deleteConceptGroup(grupo.id)
      setGrupos((prev) => prev.filter((g) => g.id !== grupo.id))
      toast.success(`Grupo «${grupo.nombre}» eliminado.`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setOcupadoGrupo(null)
      setAEliminarGrupo(null)
    }
  }

  // Filtrado de conceptos
  const conceptosFiltrados = useMemo(() => {
    if (!conceptos) return []
    const termino = busqueda.trim().toLowerCase()
    return conceptos.filter((c) => {
      const coincideTexto =
        !termino ||
        String(c.codigo).includes(termino) ||
        c.descripcion.toLowerCase().includes(termino) ||
        c.observacion.toLowerCase().includes(termino)

      const coincideEstado =
        filtroEstado === 'todos'
          ? true
          : filtroEstado === 'activos'
            ? c.activo
            : !c.activo

      return coincideTexto && coincideEstado
    })
  }, [conceptos, busqueda, filtroEstado])

  return (
    <>
      <PageHeader title="Códigos de Concepto de Energía">
        {esAdmin && pestana === 'conceptos' && (
          <Button onClick={() => setPanelConcepto({})}>
            <Icon name="plus" size={16} />
            Agregar concepto
          </Button>
        )}
        {esAdmin && pestana === 'grupos' && (
          <Button onClick={() => setModalGrupo({})}>
            <Icon name="plus" size={16} />
            Crear grupo
          </Button>
        )}
      </PageHeader>

      {/* Pestañas de navegación */}
      <nav aria-label="Secciones de parametrización" className="mb-4 flex border-b border-gris-d">
        <button
          type="button"
          onClick={() => setPestana('conceptos')}
          className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
            pestana === 'conceptos'
              ? 'border-bosque-d text-bosque-d'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          Conceptos de energía (RF35)
        </button>
        <button
          type="button"
          onClick={() => setPestana('grupos')}
          className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
            pestana === 'grupos'
              ? 'border-bosque-d text-bosque-d'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          Grupos de conceptos
        </button>
      </nav>

      {/* ── PESTAÑA 1: CONCEPTOS DE ENERGÍA (RF35) ── */}
      {pestana === 'conceptos' && (
        <>
          {/* Barra de filtros y búsqueda */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <SearchBox
                label="Buscar concepto por código o descripción"
                placeholder="Buscar código o descripción..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              <FilterSelect
                label="Filtrar por estado"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
              >
                <option value="todos">Todos los estados</option>
                <option value="activos">Solo activos</option>
                <option value="inactivos">Solo inactivos</option>
              </FilterSelect>
            </div>
            {conceptos && (
              <p className="text-[13px] text-muted">
                Mostrando {conceptosFiltrados.length} de {conceptos.length} conceptos
              </p>
            )}
          </div>

          {errorCarga && (
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <Alert>{errorCarga}</Alert>
              <Button variant="outline" size="sm" onClick={reintentarConceptos}>
                Reintentar
              </Button>
            </div>
          )}

          {!conceptos && !errorCarga && (
            <div role="status" aria-label="Cargando conceptos de energía" className="flex justify-center p-12">
              <Spinner className="size-6" />
            </div>
          )}

          {conceptos && (
            <Card className="overflow-hidden">
              {conceptos.length === 0 ? (
                <EmptyState>Aún no hay conceptos de energía registrados.</EmptyState>
              ) : conceptosFiltrados.length === 0 ? (
                <EmptyState>No se encontraron conceptos con los filtros seleccionados.</EmptyState>
              ) : (
                <Table caption="Conceptos de facturación de energía">
                  <thead>
                    <tr>
                      <th scope="col" className="w-24">Código</th>
                      <th scope="col">Descripción</th>
                      <th scope="col">Observación</th>
                      <th scope="col" className="w-32">Estado</th>
                      {esAdmin && <th scope="col" className="w-32">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {conceptosFiltrados.map((c) => (
                      <tr
                        key={c.codigo}
                        className={resaltadoConcepto === c.codigo ? 'fila-resaltada' : undefined}
                      >
                        <td className="font-semibold text-slate-800">{c.codigo}</td>
                        <td className="font-medium text-ink">{c.descripcion}</td>
                        <td className="text-muted">{c.observacion || '—'}</td>
                        <td>
                          <Badge tone={c.activo ? 'ok' : 'off'}>{c.estado}</Badge>
                        </td>
                        {esAdmin && (
                          <td>
                            <div className="flex items-center gap-2.5 text-muted">
                              <IconButton
                                icon="edit"
                                label={`Editar concepto ${c.codigo}`}
                                onClick={() => setPanelConcepto({ concepto: c })}
                              />
                              <Switch
                                checked={c.activo}
                                label={`Concepto ${c.codigo} activo`}
                                disabled={ocupadoConcepto === c.codigo}
                                onChange={(activo) =>
                                  activo
                                    ? cambiarEstadoConcepto(c, true)
                                    : setADesactivarConcepto(c)
                                }
                              />
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card>
          )}
        </>
      )}

      {/* ── PESTAÑA 2: GRUPOS DE CONCEPTOS (RF43) ── */}
      {pestana === 'grupos' && (
        <>
          {errorGrupos && (
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <Alert>{errorGrupos}</Alert>
              <Button variant="outline" size="sm" onClick={reintentarGrupos}>
                Reintentar
              </Button>
            </div>
          )}

          {!grupos && !errorGrupos && (
            <div role="status" aria-label="Cargando grupos de conceptos" className="flex justify-center p-12">
              <Spinner className="size-6" />
            </div>
          )}

          {grupos && (
            <Card className="overflow-hidden">
              {grupos.length === 0 ? (
                <EmptyState>Aún no hay grupos de conceptos registrados.</EmptyState>
              ) : (
                <Table caption="Grupos de conceptos de energía">
                  <thead>
                    <tr>
                      <th scope="col" className="w-20">ID</th>
                      <th scope="col">Nombre del grupo</th>
                      <th scope="col">Conceptos incluidos</th>
                      <th scope="col" className="w-32">Fecha creación</th>
                      <th scope="col" className="w-28">Estado</th>
                      {esAdmin && <th scope="col" className="w-36">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {grupos.map((g) => (
                      <tr key={g.id}>
                        <td className="font-semibold text-slate-800">{g.id}</td>
                        <td className="font-medium text-ink">{g.nombre}</td>
                        <td>
                          <div className="flex flex-wrap gap-1.5">
                            {g.conceptos.map((item) => (
                              <span
                                key={item.codigo}
                                title={item.descripcion}
                                className="inline-flex items-center rounded-sm bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
                              >
                                {item.codigo}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="whitespace-nowrap text-muted">
                          {g.creado ? formatearFechaISO(g.creado) : '—'}
                        </td>
                        <td>
                          <Badge tone={g.activo ? 'ok' : 'off'}>{g.estado}</Badge>
                        </td>
                        {esAdmin && (
                          <td>
                            <div className="flex items-center gap-2.5 text-muted">
                              <IconButton
                                icon="edit"
                                label={`Editar grupo ${g.nombre}`}
                                onClick={() => setModalGrupo({ grupo: g })}
                              />
                              <Switch
                                checked={g.activo}
                                label={`Grupo ${g.nombre} activo`}
                                disabled={ocupadoGrupo === g.id}
                                onChange={(activo) =>
                                  activo
                                    ? cambiarEstadoGrupo(g, true)
                                    : setADesactivarGrupo(g)
                                }
                              />
                              <IconButton
                                icon="cross"
                                label={`Eliminar grupo ${g.nombre}`}
                                onClick={() => setAEliminarGrupo(g)}
                              />
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card>
          )}
        </>
      )}

      {/* Panel lateral para crear o editar conceptos */}
      {panelConcepto && (
        <ConceptFormPanel
          concepto={panelConcepto.concepto}
          onClose={() => setPanelConcepto(null)}
          onGuardado={guardadoConcepto}
        />
      )}

      {/* Modal para crear o editar grupos */}
      {modalGrupo && (
        <GroupFormModal
          grupo={modalGrupo.grupo}
          conceptosDisponibles={(conceptos ?? []).filter((c) => c.activo)}
          onClose={() => setModalGrupo(null)}
          onGuardado={guardadoGrupo}
        />
      )}

      {/* Diálogo de confirmación para desactivar concepto */}
      <ConfirmDialog
        open={Boolean(aDesactivarConcepto)}
        danger
        title="Desactivar concepto de energía"
        message={`¿Desactivar el concepto ${aDesactivarConcepto?.codigo} (${aDesactivarConcepto?.descripcion})? Los procesos de extracción posteriores no incluirán saldos asociados a este concepto.`}
        confirmLabel="Desactivar"
        loading={Boolean(aDesactivarConcepto) && ocupadoConcepto === aDesactivarConcepto.codigo}
        onConfirm={() => cambiarEstadoConcepto(aDesactivarConcepto, false)}
        onCancel={() => setADesactivarConcepto(null)}
      />

      {/* Diálogo de confirmación para desactivar grupo */}
      <ConfirmDialog
        open={Boolean(aDesactivarGrupo)}
        danger
        title="Desactivar grupo de conceptos"
        message={`¿Desactivar el grupo «${aDesactivarGrupo?.nombre}»? No podrá seleccionarse en nuevas extracciones hasta que lo actives.`}
        confirmLabel="Desactivar"
        loading={Boolean(aDesactivarGrupo) && ocupadoGrupo === aDesactivarGrupo.id}
        onConfirm={() => cambiarEstadoGrupo(aDesactivarGrupo, false)}
        onCancel={() => setADesactivarGrupo(null)}
      />

      {/* Diálogo de confirmación para eliminar grupo */}
      <ConfirmDialog
        open={Boolean(aEliminarGrupo)}
        danger
        title="Eliminar grupo de conceptos"
        message={`¿Eliminar permanentemente el grupo «${aEliminarGrupo?.nombre}»? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar grupo"
        loading={Boolean(aEliminarGrupo) && ocupadoGrupo === aEliminarGrupo.id}
        onConfirm={() => eliminarGrupo(aEliminarGrupo)}
        onCancel={() => setAEliminarGrupo(null)}
      />
    </>
  )
}
