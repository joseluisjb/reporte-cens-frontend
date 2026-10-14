// Conformidad con el contrato: cada respuesta de los mocks debe cumplir los esquemas de
// `docs/contrato/openapi.yaml`. Si agregas o cambias un mock, agrega aquí su caso.
// Se llama a la API por el cliente real (`api`), con `validateStatus` abierto para recibir también
// el cuerpo de los errores tal cual.
import { api } from '../lib/api'
import { forzarErrorCorrectivo } from '../mocks/datos/validaciones'
import { db } from '../mocks/db'
import { expectCumpleContrato } from './contrato'

const ADMIN = ['rmartinez@example.com', 'Admin12345'] // id 2
const ANALISTA = ['jperez@example.com', 'Analista123']

const llamar = (metodo, ruta, datos) => api.request({ method: metodo, url: ruta, data: datos, validateStatus: () => true })

// Llama, comprueba el estado esperado y valida el cuerpo contra la clave `rutaContrato` de `paths`.
async function verifica(metodo, rutaContrato, status, { url = rutaContrato, datos } = {}) {
  const res = await llamar(metodo, url, datos)
  expect(res.status, `${metodo.toUpperCase()} ${url}: ${JSON.stringify(res.data)}`).toBe(status)
  expectCumpleContrato(metodo, rutaContrato, status, res.data)
  return res.data
}

async function entrar([email, password]) {
  const res = await llamar('post', '/auth/login/', { email, password })
  expect(res.status).toBe(200)
}

describe('conformidad de los mocks con el contrato OpenAPI', () => {
  test('utilidades: GET /salud/ 200 cumple el contrato sin sesión', async () => {
    const ok = await verifica('get', '/salud/', 200)
    expect(ok.estado).toBe('ok')
  })

  test('el validador detecta una respuesta que no cumple', () => {
    expect(() => expectCumpleContrato('get', '/conceptos/', 200, [{ codigo: 'x' }])).toThrow(/no cumple el contrato/)
    expect(() => expectCumpleContrato('get', '/conceptos/', 200, { codigo: 30 })).toThrow()
    expect(() => expectCumpleContrato('get', '/users/', 200, [{ id: 1, nombre: 'A', email: 'no-es-correo', rol: 'JEFE', is_active: true, last_login: '2026-09-30T08:14:00', must_change_password: false }])).toThrow()
    expect(() => expectCumpleContrato('delete', '/grupos-conceptos/{id}/', 204, { detail: 'x' })).toThrow(/no declara cuerpo/)
    expect(() => expectCumpleContrato('get', '/conceptos/', 418, {})).toThrow(/no define/)
    // validar 409: ErrorCorrectivo exige `detail` y que cada elemento de `errores` tenga `regla` y `mensaje`
    expect(() => expectCumpleContrato('post', '/extracciones/{id}/validar/', 409, { detail: 'x', errores: [{ basura: 1 }] })).toThrow(/no cumple el contrato/)
    expect(() => expectCumpleContrato('post', '/extracciones/{id}/validar/', 409, { errores: [] })).toThrow()
    expect(() => expectCumpleContrato('post', '/extracciones/{id}/validar/', 409, { detail: 'x' })).not.toThrow()
    expect(() => expectCumpleContrato('post', '/extracciones/{id}/validar/', 409, { detail: 'x', errores: [{ regla: 'R', mensaje: 'M' }] })).not.toThrow()
    // y acepta las formas válidas, incluido `nullable` (observacion y last_login en null)
    expect(() => expectCumpleContrato('get', '/conceptos/', 200, [{ codigo: 30, descripcion: 'A', activo: true, observacion: null }])).not.toThrow()
    expect(() => expectCumpleContrato('get', '/auth/me/', 200, { user: { id: 7, nombre: 'A', email: 'a@example.com', rol: 'ANALISTA_CARTERA', is_active: true, last_login: null, must_change_password: true } })).not.toThrow()
    // 0.6: `descripcion` vacía en conceptos y nula dentro de los grupos (columna nullable en Oracle)
    expect(() => expectCumpleContrato('get', '/conceptos/', 200, [{ codigo: 30, descripcion: '', activo: true, observacion: null }])).not.toThrow()
    expect(() => expectCumpleContrato('get', '/grupos-conceptos/{id}/', 200, { id: 1, nombre: 'G', activo: true, conceptos: [{ codigo: 30, descripcion: null }], creado: '2026-10-10' })).not.toThrow()
  })

  test('auditoría: RegistroAuditoria acepta las acciones del sistema (0.6) y rechaza un rol desconocido', () => {
    const registro = { id: 7, fecha_hora: '2026-10-12T08:30:00-05:00', usuario_id: 3, usuario: 'Rosa Martínez', rol: 'ADMINISTRADOR', accion: 'Usuario desactivado', tipo_accion: 'desactivacion', modulo: 'Usuarios', detalle: '' }
    const sistema = { ...registro, id: 8, usuario_id: null, usuario: 'Sistema', rol: null, accion: 'Actualización mensual', tipo_accion: 'calculo', modulo: 'Extracción' }
    expect(() => expectCumpleContrato('get', '/auditoria/', 200, { total: 2, resultados: [registro, sistema] })).not.toThrow()
    expect(() => expectCumpleContrato('get', '/auditoria/', 200, { total: 1, resultados: [{ ...registro, rol: 'JEFE' }] })).toThrow(/no cumple el contrato/)
    expect(() => expectCumpleContrato('get', '/auditoria/', 200, { total: 1, resultados: [{ ...registro, tipo_accion: 'borrado' }] })).toThrow(/no cumple el contrato/)
  })

  test('autenticación: POST /auth/login/ 200 cumple UserEnvelope y 401 cumple ErrorDetail', async () => {
    const ok = await verifica('post', '/auth/login/', 200, { datos: { email: ADMIN[0], password: ADMIN[1] } })
    expect(ok.user.last_login).not.toBeNull() // la sesión nueva fija el último acceso
    await verifica('post', '/auth/login/', 401, { datos: { email: ADMIN[0], password: 'mala' } })
  })

  test('autenticación: GET /auth/me/ 200 cumple UserEnvelope y 401 (sin sesión) cumple Unauthorized', async () => {
    await verifica('get', '/auth/me/', 401)
    await entrar(ANALISTA)
    await verifica('get', '/auth/me/', 200)
  })

  test('autenticación: POST /auth/change-password/ 400 (contraseña actual errónea) cumple ErrorCampos', async () => {
    await entrar(ADMIN)
    await verifica('post', '/auth/change-password/', 400, { datos: { current_password: 'mala', new_password: 'Nueva12345' } })
  })

  test('usuarios: GET /users/ 200 cumple User[] como Administrador, 403 como Analista y 401 sin sesión', async () => {
    await verifica('get', '/users/', 401)
    await entrar(ADMIN)
    const lista = await verifica('get', '/users/', 200)
    expect(lista.some((u) => u.last_login === null)).toBe(true) // cubre el caso nullable de verdad
    await entrar(ANALISTA)
    await verifica('get', '/users/', 403)
  })

  test('usuarios: POST /users/ 201 cumple UserCreatedResponse (sin contraseña temporal), 400 y 403', async () => {
    await entrar(ADMIN)
    const nuevo = { nombre: 'Laura Prueba', email: 'lprueba@example.com', rol: 'ANALISTA_CARTERA' }
    const creado = await verifica('post', '/users/', 201, { datos: nuevo })
    expect(creado.temporary_password).toBeNull()
    await verifica('post', '/users/', 400, { datos: nuevo }) // correo repetido
    await verifica('post', '/users/', 400, { datos: { nombre: '', email: '', rol: 'JEFE' } }) // campos vacíos
    await entrar(ANALISTA)
    await verifica('post', '/users/', 403, { datos: { ...nuevo, email: 'otra@example.com' } })
  })

  test('usuarios: PATCH /users/{id}/ 200 cumple User, 400 (desactivarse a sí mismo), 403 y 404', async () => {
    await entrar(ADMIN)
    await verifica('patch', '/users/{id}/', 200, { url: '/users/3/', datos: { is_active: false } })
    await verifica('patch', '/users/{id}/', 200, { url: '/users/2/', datos: { nombre: 'Rosa M.' } })
    await verifica('patch', '/users/{id}/', 400, { url: '/users/2/', datos: { is_active: false } })
    await verifica('patch', '/users/{id}/', 404, { url: '/users/999/', datos: { nombre: 'X' } })
    await entrar(ANALISTA)
    await verifica('patch', '/users/{id}/', 403, { url: '/users/3/', datos: { nombre: 'X' } })
  })

  test('conceptos: GET /conceptos/ 200 cumple Concepto[] y 401 sin sesión', async () => {
    await verifica('get', '/conceptos/', 401)
    await entrar(ANALISTA)
    const lista = await verifica('get', '/conceptos/', 200)
    expect(lista.length).toBeGreaterThan(0)
  })

  test('conceptos: POST /conceptos/ 201 cumple Concepto, 409, 400 y 403 (Analista)', async () => {
    await entrar(ADMIN)
    await verifica('post', '/conceptos/', 201, { datos: { codigo: 100, descripcion: 'CONCEPTO NUEVO', observacion: 'nota' } })
    await verifica('post', '/conceptos/', 201, { datos: { codigo: 101, descripcion: 'SIN OBSERVACION' } }) // observacion null
    await verifica('post', '/conceptos/', 409, { datos: { codigo: 30, descripcion: 'REPETIDO' } })
    await verifica('post', '/conceptos/', 400, { datos: { codigo: 0, descripcion: '' } })
    await entrar(ANALISTA)
    await verifica('post', '/conceptos/', 403, { datos: { codigo: 102, descripcion: 'NO PUEDE' } })
  })

  test('conceptos: PATCH /conceptos/{codigo}/ 200 cumple Concepto, 400, 403 y 404', async () => {
    await entrar(ADMIN)
    await verifica('patch', '/conceptos/{codigo}/', 200, { url: '/conceptos/30/', datos: { activo: false, observacion: 'ya no aplica' } })
    await verifica('patch', '/conceptos/{codigo}/', 400, { url: '/conceptos/30/', datos: { descripcion: '' } })
    await verifica('patch', '/conceptos/{codigo}/', 404, { url: '/conceptos/9876/', datos: { activo: true } })
    await entrar(ANALISTA)
    await verifica('patch', '/conceptos/{codigo}/', 403, { url: '/conceptos/30/', datos: { activo: true } })
  })

  test('grupos: GET /grupos-conceptos/ 200 cumple GrupoConcepto[]; GET /{id}/ 200 y 404', async () => {
    await verifica('get', '/grupos-conceptos/', 401)
    await entrar(ANALISTA)
    const lista = await verifica('get', '/grupos-conceptos/', 200)
    expect(lista.length).toBeGreaterThan(0)
    await verifica('get', '/grupos-conceptos/{id}/', 200, { url: '/grupos-conceptos/1/' })
    await verifica('get', '/grupos-conceptos/{id}/', 404, { url: '/grupos-conceptos/999/' })
  })

  test('grupos: POST /grupos-conceptos/ 201 cumple GrupoConcepto, 400 (detail y campos), 403 y 409', async () => {
    await entrar(ADMIN)
    await verifica('post', '/grupos-conceptos/', 201, { datos: { nombre: 'Grupo nuevo', conceptos: [30, 94] } })
    await verifica('post', '/grupos-conceptos/', 400, { datos: { nombre: 'Con inactivo', conceptos: [9002] } }) // { detail }
    await verifica('post', '/grupos-conceptos/', 400, { datos: { nombre: '', conceptos: [] } }) // { campo: [...] }
    await verifica('post', '/grupos-conceptos/', 409, { datos: { nombre: 'Energía financiada', conceptos: [30] } })
    await entrar(ANALISTA)
    await verifica('post', '/grupos-conceptos/', 403, { datos: { nombre: 'No puede', conceptos: [30] } })
  })

  test('grupos: PATCH /grupos-conceptos/{id}/ 200 cumple GrupoConcepto, 400, 403, 404 y 409', async () => {
    await entrar(ADMIN)
    await verifica('patch', '/grupos-conceptos/{id}/', 200, { url: '/grupos-conceptos/1/', datos: { nombre: 'Renombrado', conceptos: [30] } })
    await verifica('patch', '/grupos-conceptos/{id}/', 400, { url: '/grupos-conceptos/1/', datos: { conceptos: [9002] } })
    await verifica('patch', '/grupos-conceptos/{id}/', 400, { url: '/grupos-conceptos/1/', datos: { nombre: '' } })
    await verifica('patch', '/grupos-conceptos/{id}/', 404, { url: '/grupos-conceptos/999/', datos: { activo: false } })
    await verifica('patch', '/grupos-conceptos/{id}/', 409, { url: '/grupos-conceptos/1/', datos: { nombre: 'Solo cuota de energía' } })
    await entrar(ANALISTA)
    await verifica('patch', '/grupos-conceptos/{id}/', 403, { url: '/grupos-conceptos/1/', datos: { activo: false } })
  })

  test('grupos: DELETE /grupos-conceptos/{id}/ 204 (sin cuerpo), 403, 404 y 409 (corte en borrador)', async () => {
    await entrar(ANALISTA)
    await verifica('delete', '/grupos-conceptos/{id}/', 403, { url: '/grupos-conceptos/1/' })
    await entrar(ADMIN)
    await verifica('delete', '/grupos-conceptos/{id}/', 204, { url: '/grupos-conceptos/1/' })
    await verifica('delete', '/grupos-conceptos/{id}/', 404, { url: '/grupos-conceptos/1/' })
    await verifica('delete', '/grupos-conceptos/{id}/', 409, { url: '/grupos-conceptos/2/' })
  })
})

// Extracción y ciclo de corte (contrato 0.4). Se fija el "hoy" del mock en 2026-10-10 (solo `Date`).
describe('conformidad de los mocks de extracción con el contrato', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-10T12:00:00-05:00'))
  })
  afterEach(() => vi.useRealTimers())

  test('GET /extracciones/ 200 cumple CorteResumen[] (Analista y Administrador) y 401 sin sesión', async () => {
    await verifica('get', '/extracciones/', 401)
    await entrar(ANALISTA)
    const lista = await verifica('get', '/extracciones/', 200)
    expect(lista.map((c) => c.id)).toEqual([2, 1])
    await entrar(ADMIN)
    await verifica('get', '/extracciones/', 200)
  })

  test('GET /extracciones/ultima/ 200 cumple CorteResumen y 204 no trae cuerpo', async () => {
    await verifica('get', '/extracciones/ultima/', 401)
    await entrar(ANALISTA)
    const ultimo = await verifica('get', '/extracciones/ultima/', 200)
    expect(ultimo.id).toBe(2)
    db.cortes = []
    await verifica('get', '/extracciones/ultima/', 204)
    await verifica('get', '/extracciones/', 200)
  })

  test('GET /extracciones/{id}/ 200 cumple CorteResumen; 404 (inexistente y no numérico)', async () => {
    await entrar(ANALISTA)
    await verifica('get', '/extracciones/{id}/', 200, { url: '/extracciones/1/' })
    await verifica('get', '/extracciones/{id}/', 200, { url: '/extracciones/2/' })
    await verifica('get', '/extracciones/{id}/', 404, { url: '/extracciones/999/' })
    await verifica('get', '/extracciones/{id}/', 404, { url: '/extracciones/abc/' })
  })

  test('POST /extracciones/ 201 cumple CorteResumen (con y sin grupo)', async () => {
    await entrar(ADMIN)
    const conGrupo = await verifica('post', '/extracciones/', 201, { datos: { fecha_corte: '2026-09-30', grupo_id: 1 } }) // reemplaza el BORRADOR
    expect(conGrupo.grupo).toEqual({ id: 1, nombre: 'Energía financiada' })
    const sinGrupo = await verifica('post', '/extracciones/', 201, { datos: { fecha_corte: '2026-09-30', grupo_id: null } })
    expect(sinGrupo.grupo).toBeNull() // cubre el caso nullable de verdad
    expect(sinGrupo.ejecutada_por).toBe('Rosa Martínez')
  })

  test('POST /extracciones/ 400 (por campo y con detail), 404 y 409 (cada caso)', async () => {
    await verifica('post', '/extracciones/', 401, { datos: { fecha_corte: '2026-09-30' } })
    await entrar(ANALISTA)
    await verifica('post', '/extracciones/', 400, { datos: {} }) // fecha_corte: [...]
    await verifica('post', '/extracciones/', 400, { datos: { fecha_corte: '30/09/2026' } })
    await verifica('post', '/extracciones/', 400, { datos: { fecha_corte: '2026-09-30', grupo_id: 0 } }) // grupo_id: [...]
    await verifica('post', '/extracciones/', 400, { datos: { fecha_corte: '2099-01-01' } }) // { detail }
    await verifica('post', '/extracciones/', 404, { datos: { fecha_corte: '2026-10-05', grupo_id: 999 } })
    await verifica('post', '/extracciones/', 409, { datos: { fecha_corte: '2026-10-05', grupo_id: 3 } }) // grupo inactivo
    await verifica('post', '/extracciones/', 409, { datos: { fecha_corte: '2026-08-31' } }) // estado fijo
    await verifica('post', '/extracciones/', 409, { datos: { fecha_corte: '2026-10-05' } }) // otro BORRADOR
    db.cortes = db.cortes.filter((c) => c.id !== 2)
    await verifica('post', '/extracciones/', 409, { datos: { fecha_corte: '2026-08-15' } }) // no posterior al último enviado (A9)
  })

  test('POST /extracciones/{id}/validar/ 200 cumple CorteValidado; 409 detail y 409 con errores; 404', async () => {
    await verifica('post', '/extracciones/{id}/validar/', 401, { url: '/extracciones/2/validar/' })
    await entrar(ANALISTA)
    await verifica('post', '/extracciones/{id}/validar/', 404, { url: '/extracciones/999/validar/' })

    forzarErrorCorrectivo(2)
    const bloqueado = await llamar('post', '/extracciones/2/validar/')
    expect(bloqueado.status).toBe(409)
    expectCumpleContrato('post', '/extracciones/{id}/validar/', 409, bloqueado.data)
    expect(bloqueado.data.errores.length).toBeGreaterThan(0) // el caso ErrorCorrectivo, no solo ErrorDetail
    db.cortesConErrorForzado = []

    const validado = await verifica('post', '/extracciones/{id}/validar/', 200, { url: '/extracciones/2/validar/' })
    expect(validado.estado).toBe('VALIDADO')
    expect(validado.advertencias.length).toBeGreaterThan(0)
    await verifica('post', '/extracciones/{id}/validar/', 409, { url: '/extracciones/2/validar/' }) // ya no es BORRADOR
  })

  test('POST /extracciones/{id}/registrar-envio/ 200 cumple CorteResumen; 400 (detail y campo), 404 y 409', async () => {
    await verifica('post', '/extracciones/{id}/registrar-envio/', 401, { url: '/extracciones/2/registrar-envio/' })
    await entrar(ANALISTA)
    await verifica('post', '/extracciones/{id}/registrar-envio/', 409, { url: '/extracciones/2/registrar-envio/' }) // sigue en BORRADOR
    await verifica('post', '/extracciones/{id}/registrar-envio/', 404, { url: '/extracciones/999/registrar-envio/' })
    await verifica('post', '/extracciones/{id}/validar/', 200, { url: '/extracciones/2/validar/' })
    await verifica('post', '/extracciones/{id}/registrar-envio/', 400, { url: '/extracciones/2/registrar-envio/', datos: { fecha_envio: '2099-01-01' } }) // { detail }
    await verifica('post', '/extracciones/{id}/registrar-envio/', 400, { url: '/extracciones/2/registrar-envio/', datos: { fecha_envio: 'ayer' } }) // { fecha_envio: [...] }
    const enviado = await verifica('post', '/extracciones/{id}/registrar-envio/', 200, { url: '/extracciones/2/registrar-envio/', datos: { fecha_envio: '2026-10-09' } })
    expect(enviado.estado).toBe('ENVIADO')
  })

  test('POST /extracciones/{id}/registrar-envio/ 200 sin cuerpo', async () => {
    await entrar(ADMIN)
    await verifica('post', '/extracciones/{id}/validar/', 200, { url: '/extracciones/2/validar/' })
    const res = await api.request({ method: 'post', url: '/extracciones/2/registrar-envio/', validateStatus: () => true })
    expect(res.status).toBe(200)
    expectCumpleContrato('post', '/extracciones/{id}/registrar-envio/', 200, res.data)
  })

  test('DELETE /extracciones/{id}/ 204 (sin cuerpo) para un BORRADOR; 401, 404 y 409 (no BORRADOR)', async () => {
    await verifica('delete', '/extracciones/{id}/', 401, { url: '/extracciones/2/' })
    await entrar(ANALISTA)
    await verifica('delete', '/extracciones/{id}/', 409, { url: '/extracciones/1/' }) // ENVIADO
    await verifica('delete', '/extracciones/{id}/', 204, { url: '/extracciones/2/' }) // BORRADOR
    await verifica('delete', '/extracciones/{id}/', 404, { url: '/extracciones/2/' }) // ya borrado
    await verifica('delete', '/extracciones/{id}/', 404, { url: '/extracciones/abc/' })
    await entrar(ADMIN)
    await verifica('post', '/extracciones/', 201, { datos: { fecha_corte: '2026-10-05' } })
    await verifica('delete', '/extracciones/{id}/', 204, { url: '/extracciones/3/' })
  })

  test('GET /extracciones/{id}/obligaciones/ 200 cumple ListaPaginada de ObligacionCorte; 400, 404 y 401', async () => {
    await verifica('get', '/extracciones/{id}/obligaciones/', 401, { url: '/extracciones/1/obligaciones/' })
    await entrar(ANALISTA)
    const pagina = await verifica('get', '/extracciones/{id}/obligaciones/', 200, { url: '/extracciones/1/obligaciones/' })
    expect(pagina.total).toBe(24)
    expect(pagina.resultados).toHaveLength(20)
    const ultima = await verifica('get', '/extracciones/{id}/obligaciones/', 200, { url: '/extracciones/1/obligaciones/?limite=100&desplazamiento=20' })
    expect(ultima.resultados).toHaveLength(4)
    const todas = await verifica('get', '/extracciones/{id}/obligaciones/', 200, { url: '/extracciones/2/obligaciones/?limite=500' })
    expect(todas.resultados.some((o) => o.estado_tu === '02')).toBe(true) // cubre Saldada (Tabla 4b '02') y Castigada '06'
    expect(todas.resultados.some((o) => o.estado_tu === '06')).toBe(true)
    const noEnteros = await verifica('get', '/extracciones/{id}/obligaciones/', 400, { url: '/extracciones/1/obligaciones/?limite=abc' })
    expect(noEnteros.detail).toBe('Los parámetros limite y desplazamiento deben ser enteros.')
    const sinLimite = await verifica('get', '/extracciones/{id}/obligaciones/', 400, { url: '/extracciones/1/obligaciones/?limite=0' })
    expect(sinLimite.detail).toBe('El límite debe ser mayor que 0 y el desplazamiento no puede ser negativo.')
    const negativo = await verifica('get', '/extracciones/{id}/obligaciones/', 400, { url: '/extracciones/1/obligaciones/?desplazamiento=-1' })
    expect(negativo.detail).toBe(sinLimite.detail)
    await verifica('get', '/extracciones/{id}/obligaciones/', 404, { url: '/extracciones/999/obligaciones/' })
    await verifica('get', '/extracciones/{id}/obligaciones/', 404, { url: '/extracciones/abc/obligaciones/' })
  })
})
