// Conformidad con el contrato: cada respuesta de los mocks debe cumplir los esquemas de
// `docs/contrato/openapi.yaml`. Si agregas o cambias un mock, agrega aquí su caso.
// Se llama a la API por el cliente real (`api`), con `validateStatus` abierto para recibir también
// el cuerpo de los errores tal cual.
import { api } from '../lib/api'
import { expectCumpleContrato } from './contrato'

const ADMIN = ['rmartinez@cens.com.co', 'Admin12345'] // id 2
const ANALISTA = ['jperez@cens.com.co', 'Analista123']

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
  test('el validador detecta una respuesta que no cumple', () => {
    expect(() => expectCumpleContrato('get', '/conceptos/', 200, [{ codigo: 'x' }])).toThrow(/no cumple el contrato/)
    expect(() => expectCumpleContrato('get', '/conceptos/', 200, { codigo: 30 })).toThrow()
    expect(() => expectCumpleContrato('get', '/users/', 200, [{ id: 1, nombre: 'A', email: 'no-es-correo', rol: 'JEFE', is_active: true, last_login: '2026-09-30T08:14:00', must_change_password: false }])).toThrow()
    expect(() => expectCumpleContrato('delete', '/grupos-conceptos/{id}/', 204, { detail: 'x' })).toThrow(/no declara cuerpo/)
    expect(() => expectCumpleContrato('get', '/conceptos/', 418, {})).toThrow(/no define/)
    // y acepta las formas válidas, incluido `nullable` (observacion y last_login en null)
    expect(() => expectCumpleContrato('get', '/conceptos/', 200, [{ codigo: 30, descripcion: 'A', activo: true, observacion: null }])).not.toThrow()
    expect(() => expectCumpleContrato('get', '/auth/me/', 200, { user: { id: 7, nombre: 'A', email: 'a@cens.com.co', rol: 'ANALISTA_CARTERA', is_active: true, last_login: null, must_change_password: true } })).not.toThrow()
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
    const nuevo = { nombre: 'Laura Prueba', email: 'lprueba@cens.com.co', rol: 'ANALISTA_CARTERA' }
    const creado = await verifica('post', '/users/', 201, { datos: nuevo })
    expect(creado.temporary_password).toBeNull()
    await verifica('post', '/users/', 400, { datos: nuevo }) // correo repetido
    await verifica('post', '/users/', 400, { datos: { nombre: '', email: '', rol: 'JEFE' } }) // campos vacíos
    await entrar(ANALISTA)
    await verifica('post', '/users/', 403, { datos: { ...nuevo, email: 'otra@cens.com.co' } })
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
