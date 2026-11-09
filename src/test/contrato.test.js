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
import { conArchivoApto } from './escenarios/envio'
import { detalleCorrectivas, detalleSinRegistro2, estadisticos, noReportados } from './escenarios/resultadosTU'

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
    conArchivoApto(2) // contrato 0.9: el último archivo del corte debe ser apto
    await verifica('post', '/extracciones/{id}/registrar-envio/', 400, { url: '/extracciones/2/registrar-envio/', datos: { fecha_envio: '2099-01-01' } }) // { detail }
    await verifica('post', '/extracciones/{id}/registrar-envio/', 400, { url: '/extracciones/2/registrar-envio/', datos: { fecha_envio: 'ayer' } }) // { fecha_envio: [...] }
    const enviado = await verifica('post', '/extracciones/{id}/registrar-envio/', 200, { url: '/extracciones/2/registrar-envio/', datos: { fecha_envio: '2026-10-09' } })
    expect(enviado.estado).toBe('ENVIADO')
  })

  test('POST /extracciones/{id}/registrar-envio/ 200 sin cuerpo', async () => {
    await entrar(ADMIN)
    await verifica('post', '/extracciones/{id}/validar/', 200, { url: '/extracciones/2/validar/' })
    conArchivoApto(2)
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
    expect(ciclo).toMatchObject({ corte_id: 3, fecha_corte: '2026-10-31', ejecutada_por: 'Juan Pérez', primer_reporte: 3, cambios_estado: 3, cierres: 1, rechazados: 0, con_pagos: 7, normalizadas: 1 })
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

  test('el ciclo de un corte borrado sale del historial y repetir un corte anterior descarta los posteriores', async () => {
    corteDeOctubreEnBorrador()
    await entrar(ANALISTA)
    await verifica('post', '/ciclos/', 201, { datos: { fecha_corte: '2026-10-31' } })
    // Se borra el BORRADOR del 31/10 y el 30/09 vuelve a estar en borrador.
    db.cortes = db.cortes.filter((c) => c.id !== 3).map((c) => (c.id === 2 ? { ...c, estado: 'BORRADOR', fecha_envio: null } : c))
    expect((await verifica('get', '/ciclos/', 200)).map((c) => c.fecha_corte)).toEqual(['2026-09-30'])
    await verifica('get', '/ciclos/{corte_id}/', 404, { url: '/ciclos/3/' })
    await verifica('post', '/ciclos/', 201, { datos: { fecha_corte: '2026-09-30' } })
    expect(await verifica('get', '/obligaciones/resumen/', 200)).toMatchObject({ fecha_ultimo_ciclo: '2026-09-30', total: 12 })
    expect(db.ciclos.map((c) => c.fecha_corte)).toEqual(['2026-09-30'])
  })

  test('el escenario con rechazos 713 y 881 y revisiones cumple CicloDetalle', async () => {
    server.use(...cicloConRechazosYRevisiones())
    await entrar(ANALISTA)
    const ciclo = await verifica('post', '/ciclos/', 201, { datos: { fecha_corte: '2026-10-31' } })
    expect(ciclo.rechazos.map((r) => r.codigo)).toEqual(['881', '713'])
  })
})

describe('conformidad de los mocks de refinanciaciones (contrato 0.9)', () => {
  const pedido = { obligacion_original_id: 7, naturaleza: '06', numero_cuotas: 24, fecha: '2026-10-15' }

  test('GET /refinanciaciones/ 200 cumple la lista de Refinanciacion; 403 al Administrador y 401', async () => {
    await verifica('get', '/refinanciaciones/', 401)
    await entrar(ADMIN)
    await verifica('get', '/refinanciaciones/', 403)
    await entrar(ANALISTA)
    const [inicial] = await verifica('get', '/refinanciaciones/', 200)
    expect(inicial).toMatchObject({
      origen: 'MANUAL',
      obligacion_original: { numero_obligacion: '2255-7788', estado_cierre: '02', modo_extincion: { codigo: '16' } },
      obligacion_nueva: { numero_obligacion: '2271-5502', estado_tu: '01', numero_reestructuraciones: 1 },
      naturaleza: { codigo: '07', confirmado: false },
    })
  })

  test('POST /refinanciaciones/ 201 cierra la original en 07 (venía de 03) y crea la nueva reestructurada', async () => {
    await entrar(ANALISTA)
    expect(() => expectPeticionCumpleContrato('post', '/refinanciaciones/', pedido)).not.toThrow()
    const r = await verifica('post', '/refinanciaciones/', 201, { datos: pedido })
    expect(r).toMatchObject({
      origen: 'MANUAL',
      registrada_por: 'Juan Pérez',
      obligacion_original: { obligacion_id: 7, estado_cierre: '07', modo_extincion: { codigo: '16', descripcion: 'Refinanciación' } },
      obligacion_nueva: { numero_obligacion: '2272-6101', estado_tu: '01', numero_reestructuraciones: 1 },
      saldo_refinanciado: 5420000,
      naturaleza: { codigo: '06', descripcion: 'Ordinaria', confirmado: false },
      numero_cuotas: 24,
    })
    const nueva = await verifica('get', '/obligaciones/{id}/', 200, { url: `/obligaciones/${r.obligacion_nueva.obligacion_id}/` })
    expect(nueva).toMatchObject({ numero_identificacion: '******0007', nombre_titular: 'Hotel Mirador Cúcuta', primer_reporte: true, reestructuracion: { numero_reestructuraciones: 1, obligacion_anterior: { obligacion_id: 7 } } })
    const original = await verifica('get', '/obligaciones/{id}/', 200, { url: '/obligaciones/7/' })
    expect(original).toMatchObject({ estado_tu: '07', cerrada: true, refinanciada_en: { numero_obligacion: '2272-6101' }, cierre: { tipo_pago: { codigo: '02' } } })
    // Refinanciarla otra vez: ya está cerrada.
    expect(await verifica('post', '/refinanciaciones/', 409, { datos: pedido })).toEqual({
      detail: 'La obligación 2250-0987 ya está cerrada: no se puede refinanciar.',
      code: 'obligacion_cerrada',
    })
  })

  test('POST /refinanciaciones/ 400 por campo, 404 sin obligación y 409 si la matriz no lo permite', async () => {
    await entrar(ANALISTA)
    expect(await verifica('post', '/refinanciaciones/', 400, { datos: { ...pedido, numero_cuotas: 0 } })).toEqual({ numero_cuotas: ['Ingresa un número de cuotas entre 1 y 120.'] })
    expect(await verifica('post', '/refinanciaciones/', 400, { datos: { ...pedido, numero_cuotas: 121 } })).toEqual({ numero_cuotas: ['Ingresa un número de cuotas entre 1 y 120.'] })
    expect(await verifica('post', '/refinanciaciones/', 400, { datos: { ...pedido, naturaleza: '99' } })).toEqual({ naturaleza: ['Selecciona la naturaleza de la reestructuración.'] })
    expect(await verifica('post', '/refinanciaciones/', 400, { datos: { ...pedido, fecha: '2999-01-01' } })).toEqual({ fecha: ['La fecha de la refinanciación no puede ser futura.'] })
    expect(await verifica('post', '/refinanciaciones/', 400, { datos: { ...pedido, fecha: '2026-02-30' } })).toEqual({ fecha: ['La fecha de la refinanciación no es válida.'] })
    expect(await verifica('post', '/refinanciaciones/', 400, { datos: { ...pedido, fecha: '2025-01-10' } })).toEqual({
      fecha: ['La fecha de la refinanciación no puede ser anterior al ingreso de la obligación (30/06/2025).'],
    })
    expect(await verifica('post', '/refinanciaciones/', 400, { datos: { ...pedido, fecha: '2026-08-15' } })).toEqual({
      fecha: ['La fecha de la refinanciación debe ser posterior al último corte enviado (31/08/2026).'],
    })
    expect(await verifica('post', '/refinanciaciones/', 400, { datos: {} })).toEqual({
      obligacion_original_id: ['Selecciona la obligación original.'],
      naturaleza: ['Selecciona la naturaleza de la reestructuración.'],
      numero_cuotas: ['Ingresa un número de cuotas entre 1 y 120.'],
      fecha: ['Selecciona la fecha de la refinanciación.'],
    })
    expect(await verifica('post', '/refinanciaciones/', 404, { datos: { ...pedido, obligacion_original_id: 999 } })).toEqual({ detail: 'Obligación no encontrada.' })
    db.obligaciones.find((o) => o.id === 5).estado = '04'
    expect(await verifica('post', '/refinanciaciones/', 409, { datos: { ...pedido, obligacion_original_id: 5 } })).toEqual({
      detail: 'TransUnion no acepta pasar de 04 · Suspendida por la entidad a 02 · Saldada (error 713). Define el tratamiento con CENS.',
      code: 'transicion_no_permitida',
    })
  })
})

describe('conformidad de los mocks del reporte a TransUnion (contrato 0.9): validaciones, archivo y descarga', () => {
  test('GET /extracciones/{id}/validaciones/ 200 cumple ValidacionesCorte para los dos roles; 404 y 401', async () => {
    await verifica('get', '/extracciones/{id}/validaciones/', 401, { url: '/extracciones/2/validaciones/' })
    for (const usuario of [ADMIN, ANALISTA]) {
      await entrar(usuario)
      const v = await verifica('get', '/extracciones/{id}/validaciones/', 200, { url: '/extracciones/2/validaciones/' })
      expect(v).toMatchObject({ corte_id: 2, estado_corte: 'BORRADOR', puede_generar: false })
      expect(v.resultados.find((r) => r.regla === 'ENTIDAD_CON_MARCADOR').nivel).toBe('advertencia')
    }
    expect(await verifica('get', '/extracciones/{id}/validaciones/', 404, { url: '/extracciones/99/validaciones/' })).toEqual({ detail: 'Corte no encontrado.' })
  })

  test('POST /extracciones/{id}/validar/ 409 trae las correctivas con la obligación y el campo (0.9)', async () => {
    db.obligaciones.find((o) => o.numero === '2259-1092').cierre.fecha_pago = null
    await entrar(ANALISTA)
    const r = await verifica('post', '/extracciones/{id}/validar/', 409, { url: '/extracciones/2/validar/' })
    expect(r.errores).toContainEqual({ regla: 'CIERRE_INCOMPLETO', mensaje: 'Falta la fecha de pago del cierre.', obligacion_id: 3, numero_obligacion: '2259-1092', campo: 'fecha_pago' })
  })

  test('POST /extracciones/{id}/archivo/ 409 sin validar, 201 cumple Archivo y la descarga es texto plano', async () => {
    await entrar(ANALISTA)
    expect(await verifica('post', '/extracciones/{id}/archivo/', 409, { url: '/extracciones/2/archivo/' })).toEqual({ detail: 'Valida el corte antes de generar el archivo.' })
    await verifica('post', '/extracciones/{id}/validar/', 200, { url: '/extracciones/2/validar/' })
    const archivo = await verifica('post', '/extracciones/{id}/archivo/', 201, { url: '/extracciones/2/archivo/' })
    expect(archivo).toMatchObject({
      id: 3, corte_id: 2, nombre: 'SSRXXXXXX20260930', tipo_reporte: '01', n_registros: 11, total_registros: 13, n_excluidas: 1,
      longitud_registro_tipo2: 930, apto_envio: false, enviado: false, estado_corte: 'VALIDADO', generado_por: 'Juan Pérez',
    })
    // Como la pantalla, se pide como texto (el cliente rechaza un cuerpo no JSON si espera JSON).
    const res = await api.request({ method: 'get', url: '/archivos/3/descarga/', responseType: 'text', validateStatus: () => true })
    expect(res.status).toBe(200)
    expectCumpleContrato('get', '/archivos/{id}/descarga/', 200, res.data)
    expect(res.headers['content-disposition']).toBe('attachment; filename="SSRXXXXXX20260930.txt"')
    const lineas = res.data.split('\r\n').filter(Boolean)
    expect(lineas).toHaveLength(13)
    expect(lineas[0]).toBe('111XXXXXX          0120260930')
    expect(lineas[0]).toHaveLength(29)
    expect(lineas[1]).toHaveLength(930)
    // Registro tipo 2 según la Tabla 2 (pp. 45-51). 2259-1092 cerró como Saldada en este corte (RF22).
    const saldada = lineas.find((l) => l.slice(88, 108).trim() === '2259-1092')
    expect(saldada.slice(0, 1)).toBe('2')
    expect(saldada.slice(18, 78)).toBe('Jorge Iván Salcedo'.padEnd(60)) // nombre del titular, 19-78
    expect(saldada.slice(108, 114)).toBe('XXXXXX') // sucursal con relleno
    expect(saldada.slice(119, 123)).toBe('0200') // estado 02 y edad de mora 00
    expect(saldada.slice(125, 133)).toBe('20260930') // fecha de corte
    expect(saldada.slice(165, 177)).toBe('202609120101') // fecha de pago, modo de extinción y tipo de pago
    expect(saldada.slice(188, 191)).toBe('000') // cuotas en mora
    expect(saldada.slice(191, 203)).toBe('000000001020') // valor inicial en miles (.020.000)
    expect(saldada.slice(203, 239)).toBe('0'.repeat(36)) // mora, saldo y cuota en cero
    expect(lineas.at(-1)).toBe('900000013000000110000000000000000')
    expect(lineas.at(-1)).toHaveLength(33)
    expect(await verifica('get', '/archivos/{id}/descarga/', 404, { url: '/archivos/99/descarga/' })).toEqual({ detail: 'Archivo no encontrado.' })
  })

  test('el archivo de un corte anterior se arma con las obligaciones de esa fecha y queda fijo', async () => {
    await entrar(ANALISTA)
    const descargar = async () => (await api.request({ method: 'get', url: '/archivos/1/descarga/', responseType: 'text' })).data.split('\r\n').filter(Boolean)
    const lineas = await descargar()
    // El 31/08 aún no habían cerrado las del 30/09: el archivo cuadra con lo que declara (10 registros 2).
    const [archivo] = await verifica('get', '/archivos/', 200, { url: '/archivos/?corte_id=1' })
    expect(archivo).toMatchObject({ n_registros: 10, total_registros: 12 })
    expect(lineas).toHaveLength(12)
    expect(lineas.at(-1)).toBe('900000012000000100000000000000000')
    // Tabla 2: número de obligación en 89-108, sucursal en 109-114, calidad en 115 y estado en 120-121.
    const r2 = lineas.find((l) => l.includes('2259-1092'))
    expect(r2.slice(88, 108)).toBe('2259-1092'.padStart(20))
    expect(r2.slice(108, 114)).toBe('A1B2C3') // la sucursal con que se generó
    expect(r2.slice(114, 115)).toBe('P')
    expect(r2.slice(119, 121)).toBe('01') // Vigente al 31/08: cerró después
    // Ya armado, no cambia con la entidad ni con las obligaciones de hoy.
    db.entidad.codigo_sucursal = 'Z9Z9Z9'
    db.obligaciones = db.obligaciones.filter((o) => o.numero !== '2259-1092')
    expect(await descargar()).toEqual(lineas)
  })

  test('POST /extracciones/{id}/archivo/ 409 con un campo que no cabe; GET /archivos/ filtra por corte y 400', async () => {
    db.obligaciones.find((o) => o.numero === '2262-3318').titular = 'N'.repeat(61)
    await entrar(ANALISTA)
    await verifica('post', '/extracciones/{id}/validar/', 200, { url: '/extracciones/2/validar/' })
    expect(await verifica('post', '/extracciones/{id}/archivo/', 409, { url: '/extracciones/2/archivo/' })).toEqual({
      detail: 'No se generó el archivo: hay campos que no caben en su posición.',
      errores: [{ regla: 'CAMPO_EXCEDE_LONGITUD', mensaje: 'El nombre del titular tiene 61 caracteres y el campo admite 60.', obligacion_id: 6, numero_obligacion: '2262-3318', campo: 'nombre_titular' }],
    })
    expect((await verifica('get', '/archivos/', 200)).map((a) => a.id)).toEqual([2, 1])
    expect((await verifica('get', '/archivos/', 200, { url: '/archivos/?corte_id=1' })).map((a) => a.id)).toEqual([1])
    expect(await verifica('get', '/archivos/', 400, { url: '/archivos/?corte_id=abc' })).toEqual({ corte_id: ['Indica el id numérico del corte.'] })
  })
})

describe('conformidad de los mocks de los resultados del cargue (contrato 0.9, RF54)', () => {
  const adjuntar = (...archivos) => {
    const formulario = new FormData()
    for (const a of archivos) formulario.append('archivos', a)
    return formulario
  }
  // El archivo del 31/08 (id 1) ya enviado y sin resultados, listo para cargarlos.
  const sinResultados = () => {
    delete db.resultadosCargue[1]
    db.archivos.find((a) => a.id === 1).tiene_resultados = false
    db.cortes.find((c) => c.id === 1).estado = 'ENVIADO'
  }

  test('GET /archivos/{id}/resultados/ 200 cumple ResultadosCargue; 404 sin resultados; 403 al Administrador y 401', async () => {
    await verifica('get', '/archivos/{id}/resultados/', 401, { url: '/archivos/1/resultados/' })
    await entrar(ADMIN)
    await verifica('get', '/archivos/{id}/resultados/', 403, { url: '/archivos/1/resultados/' })
    await entrar(ANALISTA)
    const r = await verifica('get', '/archivos/{id}/resultados/', 200, { url: '/archivos/1/resultados/' })
    expect(r).toMatchObject({ archivo_id: 1, estado_corte: 'ENVIADO_CON_INCONSISTENCIAS', recibidos: 10, cargados: 9, con_inconsistencias: 2, no_reportadas: 1 })
    expect(await verifica('get', '/archivos/{id}/resultados/', 404, { url: '/archivos/2/resultados/' })).toEqual({ detail: 'Este archivo todavía no tiene resultados cargados.' })
    expect(await verifica('get', '/archivos/{id}/resultados/', 404, { url: '/archivos/99/resultados/' })).toEqual({ detail: 'Archivo no encontrado.' })
  })

  test('POST /archivos/{id}/resultados/ con correctivas asocia cada una y deja el corte ENVIADO_CON_INCONSISTENCIAS', async () => {
    sinResultados()
    await entrar(ANALISTA)
    const r = await verifica('post', '/archivos/{id}/resultados/', 201, {
      url: '/archivos/1/resultados/',
      datos: adjuntar(detalleCorrectivas('2026-08-31', [{ numero: '2258-7731', codigo: '707', descripcion: 'VALOR DE MORA ES REQUERIDO' }]), estadisticos('2026-08-31')),
    })
    expect(r).toMatchObject({ estado_corte: 'ENVIADO_CON_INCONSISTENCIAS', recibidos: 10, cargados: 9, con_inconsistencias: 1, no_reportadas: 0, cargado_por: 'Juan Pérez' })
    expect(r.archivos_cargados).toEqual([
      { nombre_archivo: 'Detalle_Inco_CSR_001_123_Correctivas_20260831.txt', tipo_archivo: 'CORRECTIVAS', n_filas: 1 },
      { nombre_archivo: 'Esta_Inco_CSR_001_123_Correctivas_20260831.txt', tipo_archivo: 'ESTADISTICOS', n_filas: 1 },
    ])
    expect(r.inconsistencias).toEqual([{ obligacion_id: 2, numero_obligacion: '2258-7731', tipo: 'CORRECTIVA', codigo: '707', descripcion: 'VALOR DE MORA ES REQUERIDO' }])
    expect(db.cortes.find((c) => c.id === 1).estado).toBe('ENVIADO_CON_INCONSISTENCIAS')
    expect(db.archivos.find((a) => a.id === 1)).toMatchObject({ tiene_resultados: true, estado_corte: 'ENVIADO_CON_INCONSISTENCIAS' })
    // Volver a cargar reemplaza los resultados anteriores (y el estado del corte).
    const otra = await verifica('post', '/archivos/{id}/resultados/', 201, { url: '/archivos/1/resultados/', datos: adjuntar(estadisticos('2026-08-31', 2)) })
    expect(otra).toMatchObject({ estado_corte: 'ENVIADO', inconsistencias: [], archivos_cargados: [{ tipo_archivo: 'ESTADISTICOS', n_filas: 2 }] })
    expect((await verifica('get', '/archivos/{id}/resultados/', 200, { url: '/archivos/1/resultados/' })).inconsistencias).toEqual([])
    expect(db.cortes.find((c) => c.id === 1).estado).toBe('ENVIADO')
  })

  test('POST sin correctivas deja el corte ENVIADO y el norep marca la obligación como no reportada', async () => {
    sinResultados()
    db.cortes.find((c) => c.id === 1).estado = 'ENVIADO_CON_INCONSISTENCIAS'
    await entrar(ANALISTA)
    const r = await verifica('post', '/archivos/{id}/resultados/', 201, { url: '/archivos/1/resultados/', datos: adjuntar(noReportados('2026-08-31', ['2260-5543', '2263-9004', '9999-0000'])) })
    expect(r).toMatchObject({ estado_corte: 'ENVIADO', cargados: 10, con_inconsistencias: 3, no_reportadas: 3 })
    expect(r.inconsistencias).toEqual([
      { obligacion_id: 4, numero_obligacion: '2260-5543', tipo: 'NO_REPORTADA', codigo: 'R', descripcion: 'Obligación no reportada' },
      // Una obligación que no entró en el archivo también se enlaza: el norep trae justo esas.
      { obligacion_id: 10, numero_obligacion: '2263-9004', tipo: 'NO_REPORTADA', codigo: 'R', descripcion: 'Obligación no reportada' },
      { obligacion_id: null, numero_obligacion: '9999-0000', tipo: 'NO_REPORTADA', codigo: 'R', descripcion: 'Obligación no reportada' },
    ])
    expect(db.cortes.find((c) => c.id === 1).estado).toBe('ENVIADO')
  })

  test('POST 422 con un archivo de otro corte o con otra estructura, y no guarda nada; 409 sin envío; 404 y 403', async () => {
    sinResultados()
    await entrar(ANALISTA)
    const ruta = { url: '/archivos/1/resultados/' }
    expect(await verifica('post', '/archivos/{id}/resultados/', 422, { ...ruta, datos: adjuntar(estadisticos('2026-08-31'), detalleCorrectivas('2026-07-31', [])) })).toEqual({
      detail: 'El archivo Detalle_Inco_CSR_001_123_Correctivas_20260731.txt es del corte 31/07/2026, no del 31/08/2026.',
      code: 'archivo_de_otro_corte',
    })
    expect(await verifica('post', '/archivos/{id}/resultados/', 422, { ...ruta, datos: adjuntar(detalleSinRegistro2('2026-08-31')) })).toEqual({
      detail: 'El archivo Detalle_Inco_CSR_001_123_Correctivas_20260831.txt no tiene la estructura esperada (línea 2: no trae el registro tipo 2 con el código, la descripción y el tipo de la inconsistencia).',
      code: 'estructura_invalida',
    })
    // El número de línea cuenta las líneas vacías.
    const conLineaVacia = new File(['LINEA|TIPO ID\r\n\r\n000000000001|01'], 'Detalle_Inco_CSR_001_123_Correctivas_20260831.txt')
    expect((await verifica('post', '/archivos/{id}/resultados/', 422, { ...ruta, datos: adjuntar(conLineaVacia) })).detail).toMatch(/\(línea 3: no trae el registro tipo 2/)
    // La Tabla 22 da SSR como sigla de Servicios: también se acepta en el nombre (la p. 43 escribe CSR).
    const conSSR = new File(['CODIGO|CANTIDAD'], 'Esta_Inco_SSR_001_123_Correctivas_20260731.txt')
    expect((await verifica('post', '/archivos/{id}/resultados/', 422, { ...ruta, datos: adjuntar(conSSR) })).code).toBe('archivo_de_otro_corte')
    const conOtroNombre = new File(['A|B'], 'resultados.txt')
    expect((await verifica('post', '/archivos/{id}/resultados/', 422, { ...ruta, datos: adjuntar(conOtroNombre) })).code).toBe('estructura_invalida')
    expect(db.resultadosCargue[1]).toBeUndefined()
    expect(db.cortes.find((c) => c.id === 1).estado).toBe('ENVIADO')
    expect(await verifica('post', '/archivos/{id}/resultados/', 409, { url: '/archivos/2/resultados/', datos: adjuntar(estadisticos('2026-09-30')) })).toEqual({
      detail: 'Registra el envío del archivo antes de cargar sus resultados.',
    })
    await verifica('post', '/archivos/{id}/resultados/', 404, { url: '/archivos/99/resultados/', datos: adjuntar(estadisticos('2026-08-31')) })
    await entrar(ADMIN)
    await verifica('post', '/archivos/{id}/resultados/', 403, { ...ruta, datos: adjuntar(estadisticos('2026-08-31')) })
  })

  test('POST /extracciones/{id}/registrar-envio/ 0.9: 409 sin archivo o no apto; con archivo apto lo marca enviado', async () => {
    await entrar(ANALISTA)
    await verifica('post', '/extracciones/{id}/validar/', 200, { url: '/extracciones/2/validar/' })
    db.archivos = db.archivos.filter((a) => a.corte_id !== 2)
    expect(await verifica('post', '/extracciones/{id}/registrar-envio/', 409, { url: '/extracciones/2/registrar-envio/' })).toEqual({
      detail: 'Primero genera el archivo plano del corte.',
      code: 'sin_archivo',
    })
    await verifica('post', '/extracciones/{id}/archivo/', 201, { url: '/extracciones/2/archivo/' })
    expect(await verifica('post', '/extracciones/{id}/registrar-envio/', 409, { url: '/extracciones/2/registrar-envio/' })).toMatchObject({ code: 'archivo_no_apto' })
    db.entidad = { ...db.entidad, tipo_entidad: '001', codigo_entidad: '123', codigo_sucursal: 'A1B2C3' }
    const archivo = await verifica('post', '/extracciones/{id}/archivo/', 201, { url: '/extracciones/2/archivo/' })
    expect((await verifica('post', '/extracciones/{id}/registrar-envio/', 200, { url: '/extracciones/2/registrar-envio/' })).estado).toBe('ENVIADO')
    expect(db.archivos.find((a) => a.id === archivo.id)).toMatchObject({ enviado: true, estado_corte: 'ENVIADO' })
  })
})

describe('conformidad de los mocks de la homologación de estados (contrato 0.9.1, RF48)', () => {
  test('GET /estados/ y GET /homologacion-estados/ cumplen el contrato; 403 al Analista y 401', async () => {
    await verifica('get', '/estados/', 401)
    await entrar(ANALISTA)
    await verifica('get', '/estados/', 403)
    await verifica('get', '/homologacion-estados/', 403)
    await entrar(ADMIN)
    const estados = await verifica('get', '/estados/', 200)
    // Los 10 de la Tabla 4b (Manual, p. 64).
    expect(estados.map((e) => e.codigo)).toEqual(['01', '02', '03', '04', '06', '07', '08', '10', '11', '12'])
    expect(estados.find((e) => e.codigo === '12').nombre).toBe('Ley 1564 de 2012 Insolvencia PNNC')
    expect(estados.filter((e) => e.es_cierre).map((e) => e.codigo)).toEqual(['02', '07'])
    expect(estados.filter((e) => !e.usado).map((e) => e.codigo)).toEqual(['04', '08'])
    // La carga inicial del script de la base, por prioridad.
    const homologaciones = await verifica('get', '/homologacion-estados/', 200)
    expect(homologaciones.map((h) => [h.estado_sac, h.prioridad, h.accion, h.estado_tu])).toEqual([
      ['A', 1, 'ESTADO', '01'],
      ['C', 2, 'ESTADO', '03'],
      ['D', 3, null, null],
      ['B', 4, null, null],
      ['F', 5, 'CIERRE', null],
    ])
  })

  test('PUT /homologacion-estados/{estado_sac}/ 200 guarda quién y cuándo; 400 por estado no usado, de cierre o cierre con estado; 404; 403', async () => {
    const ruta = (sac) => ({ url: `/homologacion-estados/${sac}/` })
    await entrar(ADMIN)
    const a = await verifica('put', '/homologacion-estados/{estado_sac}/', 200, { ...ruta('A'), datos: { accion: 'ESTADO', estado_tu: '01', confirmado: true } })
    expect(a).toMatchObject({ estado_sac: 'A', prioridad: 1, accion: 'ESTADO', estado_tu: '01', confirmado: true, actualizado_por: 'Rosa Martínez' })
    expect(a.fecha_actualizacion).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(await verifica('put', '/homologacion-estados/{estado_sac}/', 400, { ...ruta('B'), datos: { accion: 'ESTADO', estado_tu: '08' } })).toEqual({
      estado_tu: ['El estado 08 · Inactivo no se usa en CENS: elige un estado en uso.'],
    })
    expect(await verifica('put', '/homologacion-estados/{estado_sac}/', 400, { ...ruta('B'), datos: { accion: 'ESTADO', estado_tu: '02' } })).toEqual({
      estado_tu: ['Saldada (02) y Castigada recuperada (07) se asignan con «Cierre», según el estado anterior.'],
    })
    expect(await verifica('put', '/homologacion-estados/{estado_sac}/', 400, { ...ruta('B'), datos: { accion: 'CIERRE', estado_tu: '07' } })).toEqual({
      estado_tu: ['Un estado que cierra el crédito no lleva estado de TransUnion.'],
    })
    expect(await verifica('put', '/homologacion-estados/{estado_sac}/', 400, { ...ruta('B'), datos: { accion: 'ESTADO', estado_tu: null } })).toEqual({
      estado_tu: ['Selecciona el estado de TransUnion.'],
    })
    const f = await verifica('put', '/homologacion-estados/{estado_sac}/', 200, { ...ruta('D'), datos: { accion: 'CIERRE', estado_tu: null } })
    expect(f).toMatchObject({ estado_sac: 'D', prioridad: 3, accion: 'CIERRE', estado_tu: null, confirmado: false })
    expect(await verifica('put', '/homologacion-estados/{estado_sac}/', 404, { ...ruta('Z'), datos: { accion: 'CIERRE', estado_tu: null } })).toEqual({
      detail: 'Estado del SAC no encontrado.',
    })
    await entrar(ANALISTA)
    await verifica('put', '/homologacion-estados/{estado_sac}/', 403, { ...ruta('A'), datos: { accion: 'ESTADO', estado_tu: '01' } })
  })
})

describe('conformidad de los mocks de novedades, eliminaciones y rectificaciones (contrato 0.9.2, pantalla 14)', () => {
  test('GET /novedades/ y GET /rectificaciones/ cumplen el contrato; 400 por filtro; 403 al Administrador y 401', async () => {
    await verifica('get', '/novedades/', 401)
    await entrar(ADMIN)
    await verifica('get', '/novedades/', 403)
    await verifica('get', '/eliminaciones/', 403)
    await entrar(ANALISTA)
    const novedades = await verifica('get', '/novedades/', 200)
    expect(novedades.map((n) => n.id)).toEqual([3, 2, 1])
    await verifica('get', '/novedades/', 200, { url: '/novedades/?estado=PENDIENTE' })
    expect(await verifica('get', '/novedades/', 400, { url: '/novedades/?estado=OTRO' })).toEqual({ estado: ['Estado no válido.'] })
    const rectificaciones = await verifica('get', '/rectificaciones/', 200)
    expect(rectificaciones[0]).toMatchObject({ novedad_id: 2, fecha_corte: '2026-08-31' })
  })

  test('GET /eliminaciones/ es una página { total, resultados }; 400 por paginación', async () => {
    await entrar(ANALISTA)
    const pagina = await verifica('get', '/eliminaciones/', 200, { url: '/eliminaciones/?limite=100' })
    expect(pagina.total).toBe(1)
    expect(pagina.resultados[0].numero_obligacion).toBe('2249-1180')
    expect(await verifica('get', '/eliminaciones/', 400, { url: '/eliminaciones/?limite=0' })).toEqual({ limite: ['Debe ser un entero mayor o igual a 1.'] })
  })

  test('POST /novedades/{id}/gestionar/ exige la fecha de gestión; una eliminación crea la eliminación una sola vez', async () => {
    await entrar(ANALISTA)
    const peticion = { numero_transaccion_tu: 'TU-AL-001999', fecha_gestion: '2026-11-09' }
    expectPeticionCumpleContrato('post', '/novedades/{id}/gestionar/', peticion)
    expect(await verifica('post', '/novedades/{id}/gestionar/', 400, { url: '/novedades/1/gestionar/', datos: { numero_transaccion_tu: 'TU-AL-001999' } })).toEqual({
      fecha_gestion: ['Usa una fecha válida (AAAA-MM-DD).'],
    })
    const gestionada = await verifica('post', '/novedades/{id}/gestionar/', 200, { url: '/novedades/1/gestionar/', datos: peticion })
    expect(gestionada).toMatchObject({ estado: 'GESTIONADA', fecha_gestion: '2026-11-09' })
    expect(await verifica('post', '/novedades/{id}/gestionar/', 409, { url: '/novedades/1/gestionar/', datos: peticion })).toEqual({ detail: 'La novedad no está pendiente.' })
    await verifica('post', '/novedades/{id}/gestionar/', 404, { url: '/novedades/99/gestionar/', datos: peticion })

    // Dos eliminaciones de la misma obligación ya eliminada no la repiten en la lista (mockup v3).
    for (const id of [1, 2]) {
      const nueva = { tipo: 'ELIMINACION', sujeto: 'OBLIGACION', referencia: '2249-1180', motivo: `Prueba ${id}`, motivo_eliminacion: '14' }
      expectPeticionCumpleContrato('post', '/novedades/', nueva)
      const creada = await verifica('post', '/novedades/', 201, { datos: nueva })
      await verifica('post', '/novedades/{id}/gestionar/', 200, { url: `/novedades/${creada.id}/gestionar/`, datos: peticion })
    }
    expect((await verifica('get', '/eliminaciones/', 200)).total).toBe(1)
  })

  test('POST /eliminaciones/{id}/reactivar/ exige la fecha de activación; 409 si ya se reactivó', async () => {
    await entrar(ANALISTA)
    const ruta = { url: '/eliminaciones/1/reactivar/' }
    const peticion = { numero_activacion_tu: 'TU-AC-000045', fecha_activacion: '2026-10-20' }
    expectPeticionCumpleContrato('post', '/eliminaciones/{id}/reactivar/', peticion)
    expect(await verifica('post', '/eliminaciones/{id}/reactivar/', 400, { ...ruta, datos: { numero_activacion_tu: 'TU-AC-000045' } })).toEqual({
      fecha_activacion: ['Usa una fecha válida (AAAA-MM-DD).'],
    })
    const reactivada = await verifica('post', '/eliminaciones/{id}/reactivar/', 200, { ...ruta, datos: peticion })
    expect(reactivada).toMatchObject({ bloqueada: false, fecha_activacion: '2026-10-20', numero_activacion_tu: 'TU-AC-000045' })
    await verifica('post', '/eliminaciones/{id}/reactivar/', 409, { ...ruta, datos: peticion })
  })

  test('POST /rectificaciones/ 0.9.2 enlaza la novedad; 400 si la novedad no existe; 409 sobre un corte sin enviar', async () => {
    await entrar(ANALISTA)
    const novedad = await verifica('post', '/novedades/', 201, {
      datos: { tipo: 'CORRECCION', sujeto: 'OBLIGACION', obligacion_id: 2, referencia: '2258-7731', motivo: 'Valor en mora errado' },
    })
    expect(novedad).not.toHaveProperty('corte_id')
    const peticion = { novedad_id: novedad.id, obligacion_id: 2, corte_id: 1, campo: 'valor_mora', valor_corregido: '70000', justificacion: 'Valor errado.', medio: 'ACTUALIZACION_LINEA' }
    expectPeticionCumpleContrato('post', '/rectificaciones/', peticion)
    const rect = await verifica('post', '/rectificaciones/', 201, { datos: peticion })
    expect(rect).toMatchObject({ novedad_id: novedad.id, corte_id: 1, estado: 'REGISTRADA' })
    expect(await verifica('post', '/rectificaciones/', 400, { datos: { ...peticion, novedad_id: 999 } })).toEqual({ novedad_id: ['Novedad no encontrada.'] })
    expect(await verifica('post', '/rectificaciones/', 409, { datos: { ...peticion, corte_id: 2 } })).toEqual({ detail: 'Solo se rectifican cortes ya enviados a TransUnion.' })
  })
})
