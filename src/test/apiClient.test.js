import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'
import { api, ApiError, setAuthHandlers } from '../lib/api'
import { toApiError } from '../lib/api/ApiError'

const RUTA = '/prueba/' // axios le antepone la base '/api'
const URL = `/api${RUTA}` // ruta completa que ve el backend simulado

afterEach(() => setAuthHandlers({}))

describe('manejo global de 401 y 403', () => {
  test('un 401 avisa a onUnauthorized y el error llega en español', async () => {
    const onUnauthorized = vi.fn()
    setAuthHandlers({ onUnauthorized })
    server.use(http.get(URL, () => HttpResponse.json({ detail: 'Authentication credentials were not provided.' }, { status: 401 })))
    await expect(api.get(RUTA)).rejects.toMatchObject({ status: 401, message: 'Tu sesión no es válida o expiró. Inicia sesión de nuevo.' })
    expect(onUnauthorized).toHaveBeenCalledOnce()
  })

  test('skipAuthRedirect evita el manejo global (ej. el login mismo)', async () => {
    const onUnauthorized = vi.fn()
    setAuthHandlers({ onUnauthorized })
    server.use(http.get(URL, () => HttpResponse.json({}, { status: 401 })))
    await expect(api.get(RUTA, { skipAuthRedirect: true })).rejects.toBeInstanceOf(ApiError)
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  test('un 403 avisa a onForbidden y traduce el mensaje por defecto de DRF', async () => {
    const onForbidden = vi.fn()
    setAuthHandlers({ onForbidden })
    server.use(http.get(URL, () => HttpResponse.json({ detail: 'You do not have permission to perform this action.' }, { status: 403 })))
    await expect(api.get(RUTA)).rejects.toMatchObject({ status: 403, message: 'No tienes permiso para realizar esta acción.' })
    expect(onForbidden).toHaveBeenCalledOnce()
  })
})

describe('mensajes de error', () => {
  test('un 400 de DRF separa el mensaje por campo', async () => {
    server.use(http.post(URL, () => HttpResponse.json({ email: ['Ya existe un usuario con ese correo.'], rol: ['Selecciona un rol válido.'] }, { status: 400 })))
    const e = await api.post(RUTA, {}, { skipAuthRedirect: true }).catch((x) => x)
    expect(e.fieldErrors).toEqual({ email: 'Ya existe un usuario con ese correo.', rol: 'Selecciona un rol válido.' })
    expect(e.message).toBe('Los datos enviados no son válidos.')
  })

  test('un 400 con detail en español usa ese mensaje', () => {
    const e = toApiError({ response: { status: 403, data: { detail: 'Tu usuario está desactivado.' } } })
    expect(e.message).toBe('Tu usuario está desactivado.')
  })

  test('un 500 muestra un mensaje genérico, sin detalles técnicos', async () => {
    server.use(http.get(URL, () => HttpResponse.text('Traceback (most recent call last)...', { status: 500 })))
    await expect(api.get(RUTA)).rejects.toMatchObject({ status: 500, message: 'Ocurrió un error en el servidor. Intenta de nuevo más tarde.' })
  })

  test('sin conexión muestra un mensaje de red', async () => {
    server.use(http.get(URL, () => HttpResponse.error()))
    await expect(api.get(RUTA)).rejects.toMatchObject({ status: 0, message: expect.stringMatching(/no se pudo conectar/i) })
  })
})

describe('token CSRF', () => {
  test('antes de la primera petición que modifica datos pide el token, una sola vez', async () => {
    let pedidos = 0
    server.use(
      http.get('/api/auth/csrf/', () => {
        pedidos += 1
        return new HttpResponse(null, { status: 204 })
      }),
      http.post(URL, () => HttpResponse.json({ ok: true })),
    )
    await api.post(RUTA, {})
    await api.post(RUTA, {})
    expect(pedidos).toBe(1)
  })

  test('una petición de solo lectura no pide el token', async () => {
    let pedidos = 0
    server.use(
      http.get('/api/auth/csrf/', () => {
        pedidos += 1
        return new HttpResponse(null, { status: 204 })
      }),
      http.get(URL, () => HttpResponse.json({ ok: true })),
    )
    await api.get(RUTA)
    expect(pedidos).toBe(0)
  })
})
