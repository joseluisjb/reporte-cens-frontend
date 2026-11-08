// Conformidad con el contrato: cada respuesta de los mocks debe cumplir los esquemas de
// `docs/contrato/openapi.yaml`. Si agregas o cambias un mock, agrega aquí su caso.
// Se llama a la API por el cliente real (`api`), con `validateStatus` abierto para recibir también
// el cuerpo de los errores tal cual.
import { readFileSync } from 'node:fs'
import { parse } from 'yaml'
import { api } from '../lib/api'
import { forzarErrorCorrectivo } from '../mocks/datos/validaciones'
import { db } from '../mocks/db'
import { server } from '../mocks/server'
import { expectCumpleContrato, expectPeticionCumpleContrato } from './contrato'
import { cicloConRechazosYRevisiones, corteDeOctubreEnBorrador } from './escenarios/ciclo'

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

  test('0.9: una referencia que puede ser null (nullable + allOf) acepta null y sigue validando el objeto', () => {
    const panel = {
      fecha_ultimo_ciclo: null, total_obligaciones: 0, distribucion: [], ultimo_archivo: null,
      en_reclamo: 0, novedades_pendientes: 0, con_dos_o_mas_cuotas: 0, entidad_con_marcador: true,
    }
    expect(() => expectCumpleContrato('get', '/panel/resumen/', 200, panel)).not.toThrow()
    expect(() => expectCumpleContrato('get', '/panel/resumen/', 200, { ...panel, ultimo_archivo: { id: 1 } })).toThrow(/no cumple el contrato/)
    // los tipos «o nulo» de la 0.9 aceptan null y rechazan códigos que no existen
    const transicion = { obligacion_id: 1, numero_obligacion: '2265-2208', nombre_titular: 'A', estado_anterior: null, estado_nuevo: '01', edad_anterior: null, edad_nueva: '00', primer_reporte: true, requiere_revision: false, reglas: [] }
    const ciclo = { corte_id: 3, fecha_corte: '2026-10-31', fecha_ejecucion: '2026-11-03T09:15:00-05:00', ejecutada_por: null, primer_reporte: 1, cambios_estado: 0, cierres: 0, rechazados: 0, con_pagos: 0, a_dudoso: 0, a_castigada: 0, normalizadas: 0, transiciones: [transicion], rechazos: [] }
    expect(() => expectCumpleContrato('get', '/ciclos/{corte_id}/', 200, ciclo)).not.toThrow()
    expect(() => expectCumpleContrato('get', '/ciclos/{corte_id}/', 200, { ...ciclo, transiciones: [{ ...transicion, estado_anterior: '05' }] })).toThrow(/no cumple el contrato/)
  })

  test('0.9: los tipos «o nulo» repiten exactamente el enum o los campos de su tipo base', () => {
    const { schemas } = parse(readFileSync('docs/contrato/openapi.yaml', 'utf-8')).components
    expect(schemas.EstadoObligacionONulo.enum).toEqual([...schemas.EstadoObligacion.enum, null])
    expect(schemas.CodigoEdadMoraONulo.enum).toEqual([...schemas.CodigoEdadMora.enum, null])
    expect(Object.keys(schemas.CodigoDescripcionONulo.properties)).toEqual(Object.keys(schemas.CodigoDescripcion.properties))
    expect(Object.keys(schemas.ItemCatalogoONulo.properties)).toEqual(Object.keys(schemas.ItemCatalogo.properties))
  })

  test('auditoría: RegistroAuditoria acepta las acciones del sistema (0.6) y rechaza un rol desconocido', () => {
    const registro = { id: 7, fecha_hora: '2026-10-12T08:30:00-05:00', usuario_id: 3, usuario: 'Rosa Martínez', rol: 'ADMINISTRADOR', accion: 'Usuario desactivado', tipo_accion: 'desactivacion', modulo: 'Usuarios', detalle: '' }
    const sistema = { ...registro, id: 8, usuario_id: null, usuario: 'Sistema', rol: null, accion: 'Actualización mensual', tipo_accion: 'calculo', modulo: 'Extracción' }
    expect(() => expectCumpleContrato('get', '/auditoria/', 200, { total: 2, resultados: [registro, sistema] })).not.toThrow()
    expect(() => expectCumpleContrato('get', '/auditoria/', 200, { total: 1, resultados: [{ ...registro, rol: 'JEFE' }] })).toThrow(/no cumple el contrato/)
    expect(() => expectCumpleContrato('get', '/auditoria/', 200, { total: 1, resultados: [{ ...registro, tipo_accion: 'borrado' }] })).toThrow(/no cumple el contrato/)
  })

  test('autenticación: POST /auth/logout/ acepta { motivo } opcional (0.7) y 204 no trae cuerpo', async () => {
    expect(() => expectPeticionCumpleContrato('post', '/auth/logout/', { motivo: 'inactividad' })).not.toThrow()
    expect(() => expectPeticionCumpleContrato('post', '/auth/logout/', { motivo: 'manual' })).not.toThrow()
    expect(() => expectPeticionCumpleContrato('post', '/auth/logout/', {})).not.toThrow()
    expect(() => expectPeticionCumpleContrato('post', '/auth/logout/', { motivo: 'aburrimiento' })).toThrow(/no cumple el contrato/)
    expect(() => expectPeticionCumpleContrato('get', '/auth/me/', {})).toThrow(/no define el cuerpo/)
    await entrar(ANALISTA)
    await verifica('post', '/auth/logout/', 204, { datos: { motivo: 'inactividad' } })
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

describe('conformidad del mock de auditoría con el contrato', () => {
  test('GET /auditoria/ 200 cumple ListaPaginada de RegistroAuditoria (con filtros, paginación y acciones del sistema); 401 y 403', async () => {
    await verifica('get', '/auditoria/', 401)
    await entrar(ANALISTA)
    await verifica('get', '/auditoria/', 403) // solo Administrador
    await entrar(ADMIN)
    const pagina = await verifica('get', '/auditoria/', 200)
    expect(pagina.total).toBeGreaterThan(20)
    expect(pagina.resultados).toHaveLength(20)
    const filtrada = await verifica('get', '/auditoria/', 200, { url: '/auditoria/?modulo=Usuarios&tipo_accion=creacion&usuario=2&desde=2026-09-01&hasta=2026-10-31&limite=5&desplazamiento=0' })
    expect(filtrada.total).toBeGreaterThan(0)
    expect(filtrada.resultados.every((r) => r.modulo === 'Usuarios' && r.tipo_accion === 'creacion' && r.usuario_id === 2)).toBe(true)
    const sistema = await verifica('get', '/auditoria/', 200, { url: '/auditoria/?tipo_accion=calculo&limite=100' })
    expect(sistema.resultados.some((r) => r.usuario === 'Sistema' && r.usuario_id === null && r.rol === null)).toBe(true)
    const vacia = await verifica('get', '/auditoria/', 200, { url: '/auditoria/?desde=2030-01-01' })
    expect(vacia).toEqual({ total: 0, resultados: [] })
  })

  test('GET /auditoria/ 400 cumple ErrorCampos en cada filtro inválido (mensajes del contrato)', async () => {
    await entrar(ADMIN)
    const desde = await verifica('get', '/auditoria/', 400, { url: '/auditoria/?desde=2026-02-30' })
    expect(desde).toEqual({ desde: ['Usa una fecha válida (AAAA-MM-DD).'] })
    const hasta = await verifica('get', '/auditoria/', 400, { url: '/auditoria/?desde=2026-10-05&hasta=2026-10-01' })
    expect(hasta).toEqual({ hasta: ['La fecha final no puede ser anterior a la inicial.'] })
    expect(await verifica('get', '/auditoria/', 400, { url: '/auditoria/?usuario=abc' })).toEqual({ usuario: ['Indica el id numérico del usuario.'] })
    expect(await verifica('get', '/auditoria/', 400, { url: '/auditoria/?usuario=0' })).toEqual({ usuario: ['Indica el id numérico del usuario.'] })
    expect(await verifica('get', '/auditoria/', 400, { url: '/auditoria/?tipo_accion=baile' })).toEqual({ tipo_accion: ['Tipo de acción no válido.'] })
    expect(await verifica('get', '/auditoria/', 400, { url: '/auditoria/?modulo=Cocina' })).toEqual({ modulo: ['Módulo no válido.'] })
  })
})

describe('conformidad de los mocks de la Iteración 2 (contrato 0.9): obligaciones, catálogos y entidad', () => {
  test('GET /obligaciones/ 200 cumple ListaPaginada de ObligacionResumen (Analista); 401 sin sesión y 403 al Administrador', async () => {
    await verifica('get', '/obligaciones/', 401)
    await entrar(ADMIN)
    expect(await verifica('get', '/obligaciones/', 403)).toEqual({ detail: 'You do not have permission to perform this action.' })
    await entrar(ANALISTA)
    const pagina = await verifica('get', '/obligaciones/', 200)
    expect(pagina.total).toBe(12)
    expect(pagina.resultados.map((o) => o.numero_obligacion)).toEqual([...pagina.resultados.map((o) => o.numero_obligacion)].sort())
    const hotel = pagina.resultados.find((o) => o.numero_obligacion === '2250-0987')
    expect(hotel).toMatchObject({ obligacion_id: 7, estado_tu: '03', edad_mora: '05', dias_mora: 156, cuotas_mora: 6, valor_mora: 1620000, caducado: true })
  })

  test('GET /obligaciones/ filtra por estado, cuotas en mora, búsqueda y eliminadas, y pagina', async () => {
    await entrar(ANALISTA)
    const enDudoso = await verifica('get', '/obligaciones/', 200, { url: '/obligaciones/?estado_tu=03' })
    expect(enDudoso.resultados.map((o) => o.numero_obligacion)).toEqual(['2250-0987'])
    const dosOMas = await verifica('get', '/obligaciones/', 200, { url: '/obligaciones/?cuotas_mora_min=2' })
    expect(dosOMas.total).toBe(5)
    const busqueda = await verifica('get', '/obligaciones/', 200, { url: '/obligaciones/?q=pamplona' })
    expect(busqueda.total).toBe(2)
    expect((await verifica('get', '/obligaciones/', 200, { url: '/obligaciones/?eliminada=true' })).total).toBe(0)
    const pagina2 = await verifica('get', '/obligaciones/', 200, { url: '/obligaciones/?limite=5&desplazamiento=10' })
    expect(pagina2).toMatchObject({ total: 12 })
    expect(pagina2.resultados).toHaveLength(2)
  })

  test('GET /obligaciones/ 400 cumple ErrorCampos en cada filtro inválido', async () => {
    await entrar(ANALISTA)
    expect(await verifica('get', '/obligaciones/', 400, { url: '/obligaciones/?estado_tu=05' })).toEqual({ estado_tu: ['Estado no válido. Usa un código de la Tabla 4b.'] })
    expect(await verifica('get', '/obligaciones/', 400, { url: '/obligaciones/?cuotas_mora_min=-1' })).toHaveProperty('cuotas_mora_min')
    expect(await verifica('get', '/obligaciones/', 400, { url: '/obligaciones/?eliminada=quizas' })).toHaveProperty('eliminada')
    expect(await verifica('get', '/obligaciones/', 400, { url: '/obligaciones/?limite=0' })).toHaveProperty('limite')
    expect(await verifica('get', '/obligaciones/', 400, { url: `/obligaciones/?q=${'x'.repeat(61)}` })).toHaveProperty('q')
  })

  test('GET /obligaciones/resumen/ 200 cumple ResumenObligaciones: las 4 agrupaciones suman las abiertas; 403 al Administrador', async () => {
    await entrar(ADMIN)
    await verifica('get', '/obligaciones/resumen/', 403)
    await entrar(ANALISTA)
    const resumen = await verifica('get', '/obligaciones/resumen/', 200)
    expect(resumen).toMatchObject({ fecha_ultimo_ciclo: '2026-09-30', total: 12, abiertas: 9, eliminadas: 0 })
    expect(resumen.por_cuotas_mora).toEqual({ al_dia: 2, una: 2, dos_a_tres: 2, cuatro_o_mas: 3 })
    expect(Object.values(resumen.por_cuotas_mora).reduce((a, b) => a + b, 0)).toBe(resumen.abiertas)
    expect(resumen.por_estado).toEqual([
      { estado_tu: '01', cantidad: 7 },
      { estado_tu: '03', cantidad: 1 },
      { estado_tu: '06', cantidad: 1 },
      { estado_tu: '02', cantidad: 2 },
      { estado_tu: '07', cantidad: 1 },
    ])
    expect(resumen.financiaciones_nuevas).toHaveLength(3)
  })

  test('GET /obligaciones/{id}/ 200 cumple ObligacionDetalle (abierta, cerrada y reestructurada); 404 y 403', async () => {
    await entrar(ANALISTA)
    const enMora = await verifica('get', '/obligaciones/{id}/', 200, { url: '/obligaciones/2/' })
    expect(enMora).toMatchObject({ numero_obligacion: '2258-7731', fecha_exigibilidad: '2026-08-14', valor_mora: 140000, cuotas_atrasadas: 2 })
    expect(enMora.cuotas_vencidas).toEqual([
      { fecha_vencimiento: '2026-08-14', valor_pendiente: 70000, dias: 47 },
      { fecha_vencimiento: '2026-09-14', valor_pendiente: 70000, dias: 16 },
    ])
    expect(enMora.posibles_transiciones.find((r) => r.rf === 'RF14')).toMatchObject({ por_confirmar: true })
    const cerrada = await verifica('get', '/obligaciones/{id}/', 200, { url: '/obligaciones/3/' })
    expect(cerrada).toMatchObject({ cerrada: true, valor_cuota: 0, valor_cuota_antes_cierre: 85000 })
    expect(cerrada.cierre).toEqual({ fecha_corte: '2026-09-30', fecha_pago: '2026-09-12', modo_extincion: { codigo: '01', descripcion: 'Voluntario' }, tipo_pago: { codigo: '01', descripcion: 'Voluntario' } })
    expect(cerrada.posibles_transiciones).toEqual([{ rf: 'RF13', texto: 'Se reporta una sola vez, en el corte en que cerró (30/09/2026), y después ya no', por_confirmar: false }])
    const nueva = await verifica('get', '/obligaciones/{id}/', 200, { url: '/obligaciones/12/' })
    expect(nueva.reestructuracion).toMatchObject({ numero_reestructuraciones: 1, obligacion_anterior: { obligacion_id: 11, numero_obligacion: '2255-7788' } })
    for (let id = 1; id <= 12; id++) await verifica('get', '/obligaciones/{id}/', 200, { url: `/obligaciones/${id}/` })
    expect(await verifica('get', '/obligaciones/{id}/', 404, { url: '/obligaciones/99/' })).toEqual({ detail: 'Obligación no encontrada.' })
    await verifica('get', '/obligaciones/{id}/', 404, { url: '/obligaciones/abc/' })
    await entrar(ADMIN)
    await verifica('get', '/obligaciones/{id}/', 403, { url: '/obligaciones/2/' })
  })

  test('GET /obligaciones/{id}/linea-tiempo/ 200 cumple EventoObligacion[] (del más reciente al más antiguo); 404 y 403', async () => {
    await entrar(ANALISTA)
    const eventos = await verifica('get', '/obligaciones/{id}/linea-tiempo/', 200, { url: '/obligaciones/2/linea-tiempo/' })
    expect(eventos.map((e) => e.fecha)).toEqual(['2026-09-30', '2026-08-31', '2026-02-28'])
    await verifica('get', '/obligaciones/{id}/linea-tiempo/', 404, { url: '/obligaciones/99/linea-tiempo/' })
    await entrar(ADMIN)
    await verifica('get', '/obligaciones/{id}/linea-tiempo/', 403, { url: '/obligaciones/2/linea-tiempo/' })
  })

  test('GET /catalogos/{nombre}/ 200 cumple ItemCatalogo[] para los dos roles; 404 y 401', async () => {
    await verifica('get', '/catalogos/{nombre}/', 401, { url: '/catalogos/tipos-pago/' })
    await entrar(ADMIN)
    for (const nombre of ['modos-extincion', 'tipos-pago', 'naturalezas-reestructuracion', 'motivos-eliminacion', 'tipologias-reclamo']) {
      const items = await verifica('get', '/catalogos/{nombre}/', 200, { url: `/catalogos/${nombre}/` })
      expect(items.length, nombre).toBeGreaterThan(0)
    }
    await entrar(ANALISTA)
    const naturalezas = await verifica('get', '/catalogos/{nombre}/', 200, { url: '/catalogos/naturalezas-reestructuracion/' })
    expect(naturalezas.every((n) => n.confirmado === false)).toBe(true) // Tabla 11: código de CENS por definir
    expect(await verifica('get', '/catalogos/{nombre}/', 404, { url: '/catalogos/colores/' })).toEqual({ detail: 'Catálogo no encontrado.' })
  })

  test('PUT /entidad/ 200 cumple Entidad (datos y vuelta al marcador), 400 por campo, 403 al Analista y 401', async () => {
    const datos = { tipo_entidad: '001', codigo_entidad: '123', codigo_sucursal: 'A1B2C3' }
    expect(() => expectPeticionCumpleContrato('put', '/entidad/', datos)).not.toThrow()
    await verifica('put', '/entidad/', 401, { datos })
    await entrar(ANALISTA)
    await verifica('put', '/entidad/', 403, { datos })
    await entrar(ADMIN)
    expect(await verifica('put', '/entidad/', 200, { datos })).toMatchObject({ ...datos, con_marcador: false, prefijo_archivo: 'SSR001123', actualizado_por: 'Rosa Martínez' })
    const marcador = { tipo_entidad: 'XXX', codigo_entidad: 'XXX', codigo_sucursal: 'XXXXXX' }
    expect(await verifica('put', '/entidad/', 200, { datos: marcador })).toMatchObject({ con_marcador: true, prefijo_archivo: 'SSRXXXXXX' })
    expect(await verifica('put', '/entidad/', 400, { datos: { ...datos, tipo_entidad: '12' } })).toEqual({
      tipo_entidad: ['El tipo de entidad debe tener 3 dígitos (o XXX mientras TransUnion no los asigne).'],
    })
    expect(await verifica('put', '/entidad/', 400, { datos: { ...datos, codigo_sucursal: 'a1-b2' } })).toHaveProperty('codigo_sucursal')
    expect(await verifica('put', '/entidad/', 400, { datos: {} })).toEqual({
      tipo_entidad: ['Este campo es requerido.'], codigo_entidad: ['Este campo es requerido.'], codigo_sucursal: ['Este campo es requerido.'],
    })
  })

  test('GET /panel/resumen/ 200 cumple PanelResumen (Analista), también sin archivos; 403 al Administrador y 401', async () => {
    await verifica('get', '/panel/resumen/', 401)
    await entrar(ADMIN)
    await verifica('get', '/panel/resumen/', 403)
    await entrar(ANALISTA)
    const panel = await verifica('get', '/panel/resumen/', 200)
    expect(panel).toMatchObject({ fecha_ultimo_ciclo: '2026-09-30', total_obligaciones: 12, en_reclamo: 2, con_dos_o_mas_cuotas: 5, entidad_con_marcador: true })
    expect(panel.ultimo_archivo).toMatchObject({ id: 2, nombre: 'SSRXXXXXX20260930', apto_envio: false })
    db.archivos = []
    expect((await verifica('get', '/panel/resumen/', 200)).ultimo_archivo).toBeNull()
  })

  test('GET /entidad/ 200 cumple Entidad con el marcador para los dos roles; 401 sin sesión', async () => {
    await verifica('get', '/entidad/', 401)
    for (const usuario of [ADMIN, ANALISTA]) {
      await entrar(usuario)
      expect(await verifica('get', '/entidad/', 200)).toEqual({
        tipo_entidad: 'XXX', codigo_entidad: 'XXX', codigo_sucursal: 'XXXXXX', con_marcador: true,
        prefijo_archivo: 'SSRXXXXXX', actualizado_por: null, fecha_actualizacion: null,
      })
    }
  })
})

describe('conformidad de los mocks de la actualización mensual (contrato 0.9): ciclos y matriz', () => {
  test('GET /matriz-estados/ 200 cumple MatrizEstados con las 400 transiciones; 403 al Administrador y 401', async () => {
    await verifica('get', '/matriz-estados/', 401)
    await entrar(ADMIN)
    await verifica('get', '/matriz-estados/', 403)
    await entrar(ANALISTA)
    const matriz = await verifica('get', '/matriz-estados/', 200)
    expect(matriz.transiciones).toHaveLength(400)
    const permitida = (desde, dm, hacia, hm) =>
      matriz.transiciones.find((t) => t.desde === desde && t.desde_con_mora === dm && t.hacia === hacia && t.hacia_con_mora === hm).permitida
    expect(permitida('01', false, '02', false)).toBe(true)
    expect(permitida('02', false, '01', false)).toBe(false) // Saldada no tiene salidas
    expect(permitida('03', true, '07', false)).toBe(true)
    expect(permitida('01', false, '06', false)).toBe(false)
  })

  test('GET /ciclos/ 200 cumple la lista de CicloResumen y GET /ciclos/{id}/ el CicloDetalle; 404 sin ciclo', async () => {
    await verifica('get', '/ciclos/', 401)
    await entrar(ADMIN)
    await verifica('get', '/ciclos/', 403)
    await entrar(ANALISTA)
    expect(await verifica('get', '/ciclos/', 200)).toEqual([
      { corte_id: 2, fecha_corte: '2026-09-30', fecha_ejecucion: '2026-09-30T10:02:00-05:00', ejecutada_por: 'Juan Pérez', primer_reporte: 2, cambios_estado: 2, cierres: 2, rechazados: 0 },
    ])
    expect((await verifica('get', '/ciclos/{corte_id}/', 200, { url: '/ciclos/2/' })).transiciones).toHaveLength(6)
    expect(await verifica('get', '/ciclos/{corte_id}/', 404, { url: '/ciclos/1/' })).toEqual({ detail: 'Ese corte no tiene una actualización mensual ejecutada.' })
  })

  test('POST /ciclos/ 201 aplica la foto del 2026-10-31 sobre el BORRADOR y actualiza las obligaciones', async () => {
    corteDeOctubreEnBorrador()
    await entrar(ANALISTA)
    expect(() => expectPeticionCumpleContrato('post', '/ciclos/', { fecha_corte: '2026-10-31' })).not.toThrow()
    const ciclo = await verifica('post', '/ciclos/', 201, { datos: { fecha_corte: '2026-10-31' } })
    expect(ciclo).toMatchObject({ corte_id: 3, fecha_corte: '2026-10-31', ejecutada_por: 'Juan Pérez', primer_reporte: 3, cambios_estado: 3, cierres: 1, rechazados: 0, con_pagos: 5 })
    expect(ciclo.transiciones).toHaveLength(10)
    // Las obligaciones quedan al corte nuevo: 15, la del Hotel en Castigada y 2261-8820 cerrada.
    const resumen = await verifica('get', '/obligaciones/resumen/', 200)
    expect(resumen).toMatchObject({ fecha_ultimo_ciclo: '2026-10-31', total: 15, financiaciones_nuevas: [] })
    const hotel = (await verifica('get', '/obligaciones/', 200, { url: '/obligaciones/?q=hotel' })).resultados[0]
    expect(hotel).toMatchObject({ estado_tu: '06', dias_mora: 187, edad_mora: '06' })
    expect((await verifica('get', '/ciclos/', 200)).map((c) => c.fecha_corte)).toEqual(['2026-10-31', '2026-09-30'])
    // Volver a ejecutarlo sobre el mismo BORRADOR reemplaza el resultado (no duplica).
    await verifica('post', '/ciclos/', 201, { datos: { fecha_corte: '2026-10-31' } })
    expect(await verifica('get', '/ciclos/', 200)).toHaveLength(2)
    expect((await verifica('get', '/obligaciones/resumen/', 200)).total).toBe(15)
  })

  test('POST /ciclos/ 400 por fecha (falta, no es fin de mes, no es posterior al último enviado) y 409 sin BORRADOR', async () => {
    await entrar(ANALISTA)
    expect(await verifica('post', '/ciclos/', 400, { datos: {} })).toEqual({ fecha_corte: ['Selecciona una fecha de corte.'] })
    expect(await verifica('post', '/ciclos/', 400, { datos: { fecha_corte: '2026-10-15' } })).toEqual({
      fecha_corte: ['El corte es el último día del mes. Para ese mes sería el 31/10/2026.'],
    })
    expect(await verifica('post', '/ciclos/', 400, { datos: { fecha_corte: '2026-08-31' } })).toEqual({
      fecha_corte: ['La fecha de corte debe ser posterior al último corte enviado (31/08/2026).'],
    })
    expect(await verifica('post', '/ciclos/', 409, { datos: { fecha_corte: '2026-10-31' } })).toEqual({ detail: 'Primero genera la extracción de ese corte.' })
    await entrar(ADMIN)
    await verifica('post', '/ciclos/', 403, { datos: { fecha_corte: '2026-09-30' } })
  })

  test('el escenario con rechazos 713 y 881 y revisiones cumple CicloDetalle', async () => {
    server.use(...cicloConRechazosYRevisiones())
    await entrar(ANALISTA)
    const ciclo = await verifica('post', '/ciclos/', 201, { datos: { fecha_corte: '2026-10-31' } })
    expect(ciclo.rechazos.map((r) => r.codigo)).toEqual(['881', '713'])
  })
})
