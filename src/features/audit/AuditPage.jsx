// Log de auditoría del sistema (RF30), solo Administrador. Maqueta 8.
// Muestra quién hizo qué y cuándo, más reciente primero, con filtros (rango de fechas, usuario, tipo de
// acción y módulo) y paginación. El formulario de filtros usa el formulario reutilizable de RF31.
// El detalle de cada registro no trae contraseñas ni datos personales completos: se muestra tal cual llega.
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Alert, Badge, Button, Card, EmptyState, Input, PageHeader, Pagination, Select, Spinner, Table } from '../../components/ui'
import { formatearFechaHora } from '../../lib/format'
import { useFormulario } from '../../lib/useFormulario'
import { usePageTitle } from '../../lib/usePageTitle'
import { ROLES } from '../auth/roles'
import { listUsers } from '../users/usersService'
import { MODULOS_AUDITORIA, mapAuditFieldErrors, TIPOS_ACCION } from './auditMapper'
import { LIMITE_AUDITORIA, listAuditLog } from './auditService'
import { validarFiltrosAuditoria } from './auditValidation'

const SIN_FILTROS = { desde: '', hasta: '', usuario: '', tipoAccion: '', modulo: '' }
const ORDEN = ['desde', 'hasta', 'usuario', 'tipoAccion', 'modulo']
const hayFiltros = (valores) => ORDEN.some((c) => valores[c])

// Pide una página al servicio. Lanza el ApiError si falla.
const pedirPagina = (filtros, desplazamiento) =>
  listAuditLog({
    desde: filtros.desde,
    hasta: filtros.hasta,
    usuarioId: filtros.usuario,
    tipoAccion: filtros.tipoAccion,
    modulo: filtros.modulo,
    desplazamiento,
  })

export default function AuditPage() {
  usePageTitle('Log de Auditoría del Sistema')
  const resumenId = useId()
  const [pagina, setPagina] = useState(null) // { items, total } | null (cargando por primera vez)
  const [aplicados, setAplicados] = useState(SIN_FILTROS) // filtros de la consulta que se está mostrando
  const [desplazamiento, setDesplazamiento] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')
  const [usuarios, setUsuarios] = useState([]) // opciones del filtro "Usuario"
  const ultima = useRef(0) // número de la última consulta: una respuesta tardía de una anterior se descarta
  const montado = useRef(true)

  const mostrar = useCallback((resultado, filtros, nuevoDesplazamiento) => {
    setPagina(resultado)
    setAplicados(filtros)
    setDesplazamiento(nuevoDesplazamiento)
    setErrorCarga('')
  }, [])

  // Consulta disparada por el usuario (filtrar, paginar, reintentar). Lanza el ApiError si falla: el
  // formulario lo muestra en el campo; la paginación y "Reintentar" lo muestran sobre la tabla.
  const consultar = useCallback(
    async (filtros, nuevoDesplazamiento) => {
      const numero = ++ultima.current
      setCargando(true)
      try {
        const resultado = await pedirPagina(filtros, nuevoDesplazamiento)
        if (numero === ultima.current && montado.current) mostrar(resultado, filtros, nuevoDesplazamiento)
      } finally {
        if (numero === ultima.current && montado.current) setCargando(false)
      }
    },
    [mostrar],
  )

  const form = useFormulario({
    valoresIniciales: SIN_FILTROS,
    orden: ORDEN,
    validar: validarFiltrosAuditoria,
    traducirErrores: mapAuditFieldErrors,
    onSubmit: (valores) => consultar(valores, 0),
  })

  // Carga inicial (sin filtros) y lista de usuarios para el filtro. Esta última es secundaria: si falla,
  // el filtro queda solo con "Todos los usuarios".
  useEffect(() => {
    montado.current = true
    let cancelado = false
    pedirPagina(SIN_FILTROS, 0)
      .then((resultado) => {
        if (!cancelado && ultima.current === 0) mostrar(resultado, SIN_FILTROS, 0)
      })
      .catch((err) => {
        if (!cancelado && ultima.current === 0) setErrorCarga(err.message)
      })
      .finally(() => {
        if (!cancelado && ultima.current === 0) setCargando(false)
      })
    listUsers().then(
      (lista) => !cancelado && setUsuarios(lista),
      () => {},
    )
    return () => {
      cancelado = true
      montado.current = false
    }
  }, [mostrar])

  const irA = (nuevo) => consultar(aplicados, nuevo).catch((err) => setErrorCarga(err.message))
  const reintentar = () => consultar(aplicados, desplazamiento).catch((err) => setErrorCarga(err.message))
  const limpiar = () => {
    form.reiniciar()
    consultar(SIN_FILTROS, 0).catch((err) => setErrorCarga(err.message))
  }

  return (
    <>
      <PageHeader title="Log de Auditoría del Sistema" />

      <Card className="mb-4 p-5">
        <form {...form.formProps} aria-label="Filtros del log de auditoría">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Input label="Desde" type="date" {...form.campo('desde')} />
            <Input label="Hasta" type="date" {...form.campo('hasta')} />
            <Select label="Usuario" {...form.campo('usuario')}>
              <option value="">Todos los usuarios</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </Select>
            <Select label="Tipo de acción" {...form.campo('tipoAccion')}>
              <option value="">Todas las acciones</option>
              {Object.entries(TIPOS_ACCION).map(([codigo, texto]) => (
                <option key={codigo} value={codigo}>
                  {texto}
                </option>
              ))}
            </Select>
            <Select label="Módulo" {...form.campo('modulo')}>
              <option value="">Todos los módulos</option>
              {MODULOS_AUDITORIA.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </Select>
          </div>
          {form.errorGeneral && (
            <div className="mt-4">
              <Alert>{form.errorGeneral}</Alert>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Button type="submit" loading={form.enviando}>
              Filtrar
            </Button>
            <Button variant="ghost" onClick={limpiar} disabled={!hayFiltros(form.valores) && !hayFiltros(aplicados)}>
              Limpiar filtros
            </Button>
          </div>
        </form>
      </Card>

      {errorCarga && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Alert>{errorCarga}</Alert>
          <Button variant="outline" size="sm" onClick={reintentar}>
            Reintentar
          </Button>
        </div>
      )}
      {!pagina && !errorCarga && (
        <div role="status" aria-label="Cargando registros de auditoría" className="flex justify-center p-12">
          <Spinner className="size-6" />
        </div>
      )}
      {pagina && (
        <Card className="overflow-hidden" aria-busy={cargando || undefined} aria-describedby={resumenId}>
          {pagina.items.length === 0 ? (
            <EmptyState>No hay registros que coincidan con los filtros.</EmptyState>
          ) : (
            <Table caption="Registros de auditoría">
              <thead>
                <tr>
                  <th scope="col">Fecha y hora</th>
                  <th scope="col">Usuario</th>
                  <th scope="col">Acción</th>
                  <th scope="col">Módulo</th>
                  <th scope="col">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {pagina.items.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap">{formatearFechaHora(r.fechaHora)}</td>
                    <td>
                      <div>{r.usuario}</div>
                      {/* Las acciones del sistema (usuario "Sistema") llegan sin rol. */}
                      {r.rol && <Badge tone={r.rol === ROLES.ADMIN ? 'admin' : 'ok'}>{r.rol}</Badge>}
                    </td>
                    <td>
                      {r.accion}
                      <span className="sr-only"> ({r.tipoAccion.descripcion})</span>
                    </td>
                    <td>{r.modulo}</td>
                    <td>{r.detalle || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          <p id={resumenId} className="sr-only">
            {pagina.total} registros en total
          </p>
          <Pagination total={pagina.total} limit={LIMITE_AUDITORIA} offset={desplazamiento} onChange={irA} loading={cargando} noun="registros" nounSingular="registro" />
        </Card>
      )}
    </>
  )
}
