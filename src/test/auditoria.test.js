// Auditoría (RF30): validación de filtros, mapper, servicio y mock. El contrato se prueba en contrato.test.js.
import { login } from '../features/auth/authService'
import { ROLES } from '../features/auth/roles'
import { mapAuditFieldErrors, mapRegistroAuditoria, TIPOS_ACCION } from '../features/audit/auditMapper'
import { listAuditLog } from '../features/audit/auditService'
import { MSG_AUDIT, validarFiltrosAuditoria } from '../features/audit/auditValidation'
import { registrosAuditoria, TOTAL_REGISTROS_AUDITORIA } from '../mocks/datos/auditoria'

const entrarAdmin = () => login('rmartinez@example.com', 'Admin12345')
const entrarAnalista = () => login('jperez@example.com', 'Analista123')

describe('validarFiltrosAuditoria', () => {
  test('sin filtros o con un rango correcto no hay errores', () => {
    expect(validarFiltrosAuditoria({})).toEqual({})
    expect(validarFiltrosAuditoria({ desde: '2026-09-01', hasta: '2026-09-30' })).toEqual({})
    expect(validarFiltrosAuditoria({ desde: '2026-09-30', hasta: '2026-09-30' })).toEqual({}) // inclusivo
  })
  test('fechas que no existen en el calendario se rechazan', () => {
    expect(validarFiltrosAuditoria({ desde: '2026-02-30', hasta: 'ayer' })).toEqual({ desde: MSG_AUDIT.fechaInvalida, hasta: MSG_AUDIT.fechaInvalida })
  })
  test('la fecha final no puede ser anterior a la inicial', () => {
    expect(validarFiltrosAuditoria({ desde: '2026-10-05', hasta: '2026-10-01' })).toEqual({ hasta: MSG_AUDIT.hastaAnterior })
  })
})

describe('mapRegistroAuditoria', () => {
  test('traduce el rol de código a texto, la fecha a Date y el tipo de acción a su descripción', () => {
    const r = mapRegistroAuditoria({ id: 9, fecha_hora: '2026-09-30T09:02:00-05:00', usuario_id: 2, usuario: 'Rosa Martínez', rol: 'ADMINISTRADOR', accion: 'Usuario creado', tipo_accion: 'creacion', modulo: 'Usuarios', detalle: 'María Gómez' })
    expect(r).toMatchObject({ id: 9, usuarioId: 2, usuario: 'Rosa Martínez', rol: ROLES.ADMIN, tipoAccion: { codigo: 'creacion', descripcion: 'Creación' }, modulo: 'Usuarios', detalle: 'María Gómez' })
    expect(r.fechaHora).toBeInstanceOf(Date)
  })
  test('un tipo o un rol desconocido se muestra tal cual y un detalle ausente queda vacío', () => {
    const r = mapRegistroAuditoria({ id: 1, fecha_hora: '2026-09-30T09:02:00-05:00', usuario_id: 1, usuario: 'X', rol: 'OTRO', accion: 'A', tipo_accion: 'nuevo_tipo', modulo: 'Seguridad', detalle: null })
    expect(r.rol).toBe('OTRO') // nunca coincide con ROLES.ADMIN
    expect(r.tipoAccion.descripcion).toBe('nuevo_tipo')
    expect(r.detalle).toBe('')
  })
  test('`tipo_accion` del backend es `tipoAccion` en el formulario', () => {
    expect(mapAuditFieldErrors({ tipo_accion: 'No válido', desde: 'Mal' })).toEqual({ tipoAccion: 'No válido', desde: 'Mal' })
  })
  test('una acción del sistema (sin usuario) conserva el nombre "Sistema" y deja el rol en null', () => {
    const r = mapRegistroAuditoria({ id: 3, fecha_hora: '2026-10-01T02:00:00-05:00', usuario_id: null, usuario: 'Sistema', rol: null, accion: 'Actualización mensual', tipo_accion: 'calculo', modulo: 'Extracción', detalle: '' })
    expect(r).toMatchObject({ usuarioId: null, usuario: 'Sistema', rol: null })
  })
  test('los datos del mock usan solo los 9 tipos que produce el backend, los 4 módulos e incluyen acciones del sistema', () => {
    const r = registrosAuditoria()
    const sinProducir = ['generacion', 'exportacion', 'correccion'] // nadie las produce todavía (contrato 0.6)
    expect(new Set(r.map((x) => x.tipo_accion))).toEqual(new Set(Object.keys(TIPOS_ACCION).filter((t) => !sinProducir.includes(t))))
    expect(new Set(r.map((x) => x.modulo)).size).toBe(4)
    expect(r.some((x) => x.usuario === 'Sistema' && x.usuario_id === null && x.rol === null)).toBe(true)
    expect(JSON.stringify(r)).not.toMatch(/contraseña:|password|\d{8,}/i) // sin contraseñas ni identificaciones completas
  })
})

describe('listAuditLog', () => {
  test('el Administrador recibe la primera página (20), más reciente primero, con el total', async () => {
    await entrarAdmin()
    const { items, total } = await listAuditLog()
    expect(total).toBe(TOTAL_REGISTROS_AUDITORIA)
    expect(items).toHaveLength(20)
    expect(items[0].fechaHora.getTime()).toBeGreaterThanOrEqual(items[1].fechaHora.getTime())
    expect(items[0].rol).toMatch(/Administrador|Analista de Cartera/)
  })
  test('la paginación recorre todos los registros sin repetir', async () => {
    await entrarAdmin()
    const a = await listAuditLog({ limite: 20, desplazamiento: 0 })
    const b = await listAuditLog({ limite: 20, desplazamiento: 20 })
    const c = await listAuditLog({ limite: 20, desplazamiento: 40 })
    const ids = [...a.items, ...b.items, ...c.items].map((r) => r.id)
    expect(ids).toHaveLength(TOTAL_REGISTROS_AUDITORIA)
    expect(new Set(ids).size).toBe(TOTAL_REGISTROS_AUDITORIA)
  })
  test('filtra por módulo, tipo de acción, usuario y rango de fechas (inclusivo)', async () => {
    await entrarAdmin()
    const usuarios = await listAuditLog({ modulo: 'Usuarios', limite: 100 })
    expect(usuarios.total).toBeGreaterThan(0)
    expect(usuarios.items.every((r) => r.modulo === 'Usuarios')).toBe(true)
    const cierres = await listAuditLog({ tipoAccion: 'cierre_sesion', limite: 100 })
    expect(cierres.items.every((r) => r.tipoAccion.codigo === 'cierre_sesion')).toBe(true)
    const deJuan = await listAuditLog({ usuarioId: 1, limite: 100 })
    expect(deJuan.items.every((r) => r.usuarioId === 1)).toBe(true)
    const dia = await listAuditLog({ desde: '2026-09-29', hasta: '2026-09-29', limite: 100 })
    expect(dia.total).toBeGreaterThan(0)
    expect(dia.items.every((r) => r.fechaHora.getTime() >= new Date('2026-09-29T00:00:00-05:00') && r.fechaHora.getTime() < new Date('2026-09-30T00:00:00-05:00'))).toBe(true)
  })
  test('filtros vacíos no se envían y los combinados se intersectan', async () => {
    await entrarAdmin()
    expect((await listAuditLog({ desde: '', hasta: ' ', modulo: '' })).total).toBe(TOTAL_REGISTROS_AUDITORIA)
    const combinado = await listAuditLog({ modulo: 'Extracción', usuarioId: 1, tipoAccion: 'calculo', limite: 100 })
    expect(combinado.total).toBeGreaterThan(0)
    expect(combinado.items.every((r) => r.modulo === 'Extracción' && r.usuarioId === 1 && r.tipoAccion.codigo === 'calculo')).toBe(true)
  })
  test('sin coincidencias devuelve total 0 y lista vacía', async () => {
    await entrarAdmin()
    expect(await listAuditLog({ desde: '2030-01-01' })).toEqual({ items: [], total: 0 })
  })
  test('un filtro inválido llega como errores por campo', async () => {
    await entrarAdmin()
    await expect(listAuditLog({ desde: '2026-13-01' })).rejects.toMatchObject({ status: 400, fieldErrors: { desde: MSG_AUDIT.fechaInvalida } })
    await expect(listAuditLog({ desde: '2026-10-05', hasta: '2026-10-01' })).rejects.toMatchObject({ fieldErrors: { hasta: MSG_AUDIT.hastaAnterior } })
    await expect(listAuditLog({ usuarioId: 'abc' })).rejects.toMatchObject({ fieldErrors: { usuario: expect.any(String) } })
    await expect(listAuditLog({ usuarioId: 0 })).rejects.toMatchObject({ fieldErrors: { usuario: expect.any(String) } }) // el backend exige id >= 1
    await expect(listAuditLog({ tipoAccion: 'baile' })).rejects.toMatchObject({ fieldErrors: { tipo_accion: expect.any(String) } })
    await expect(listAuditLog({ modulo: 'Cocina' })).rejects.toMatchObject({ fieldErrors: { modulo: expect.any(String) } })
    await expect(listAuditLog({ limite: 0 })).rejects.toMatchObject({ status: 400 })
  })
  test('el Analista recibe 403 y sin sesión 401', async () => {
    await expect(listAuditLog()).rejects.toMatchObject({ status: 401 })
    await entrarAnalista()
    await expect(listAuditLog()).rejects.toMatchObject({ status: 403 })
  })
})
