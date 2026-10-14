import { act, fireEvent, renderHook, screen } from '@testing-library/react'
import { keepAlive } from '../features/auth/authService'
import { MSG_SALIDA } from '../features/auth/authConfig'
import { useIdleTimeout } from '../features/auth/useIdleTimeout'
import { getCurrentUser, login } from '../features/auth/authService'
import { espiarLogout } from './espiarLogout'
import { renderApp } from './renderApp'

// Solo se simulan el reloj y los intervalos; setTimeout queda real para que MSW responda.
beforeEach(() => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] }))
afterEach(() => vi.useRealTimers())

const pasar = (ms) => act(() => vi.advanceTimersByTimeAsync(ms))
const S = 1000

function montar(opciones = {}) {
  const props = { idleMs: 10 * S, warningMs: 3 * S, onIdle: vi.fn(), onKeepAlive: vi.fn(), ...opciones }
  return { props, ...renderHook((p) => useIdleTimeout(p), { initialProps: props }) }
}

describe('useIdleTimeout', () => {
  test('sin actividad avisa 3 s antes y cierra a los 10 s, una sola vez', async () => {
    const { result, props } = montar()
    await pasar(6 * S)
    expect(result.current.fase).toBe('activo')
    await pasar(1 * S) // 7 s: faltan 3
    expect(result.current.fase).toBe('aviso')
    expect(result.current.segundos).toBe(3)
    expect(props.onIdle).not.toHaveBeenCalled()
    await pasar(3 * S)
    expect(props.onIdle).toHaveBeenCalledOnce()
    await pasar(5 * S)
    expect(props.onIdle).toHaveBeenCalledOnce()
  })

  test('la actividad antes del aviso reinicia el contador', async () => {
    const { result, props } = montar()
    await pasar(6 * S)
    fireEvent.keyDown(window, { key: 'a' })
    await pasar(6 * S) // 12 s en total, pero solo 6 desde la tecla
    expect(result.current.fase).toBe('activo')
    expect(props.onIdle).not.toHaveBeenCalled()
  })

  test('durante el aviso mover el mouse NO lo descarta; "seguir conectado" sí y renueva el servidor', async () => {
    const { result, props } = montar()
    await pasar(8 * S)
    expect(result.current.fase).toBe('aviso')
    fireEvent.pointerMove(window)
    await pasar(1 * S)
    expect(result.current.fase).toBe('aviso')

    act(() => result.current.seguirConectado())
    expect(result.current.fase).toBe('activo')
    expect(props.onKeepAlive).toHaveBeenCalledOnce()
    await pasar(6 * S)
    expect(props.onIdle).not.toHaveBeenCalled()
  })

  test('mientras hay actividad renueva el servidor cada idleMs/2', async () => {
    const { props } = montar()
    fireEvent.pointerMove(window)
    expect(props.onKeepAlive).not.toHaveBeenCalled()
    await pasar(6 * S)
    fireEvent.pointerMove(window) // pasaron más de 5 s desde el último ping
    expect(props.onKeepAlive).toHaveBeenCalledOnce()
    fireEvent.pointerMove(window)
    expect(props.onKeepAlive).toHaveBeenCalledOnce()
  })

  test('si el equipo estuvo suspendido, al volver cierra de inmediato por la hora real', async () => {
    const { props } = montar()
    vi.setSystemTime(Date.now() + 60 * S) // el reloj saltó 1 minuto sin que corrieran los intervalos
    document.dispatchEvent(new Event('visibilitychange'))
    expect(props.onIdle).toHaveBeenCalledOnce()
  })

  test('deshabilitado no hace nada', async () => {
    const { props } = montar({ enabled: false })
    await pasar(30 * S)
    expect(props.onIdle).not.toHaveBeenCalled()
  })

  test.skipIf(typeof BroadcastChannel === 'undefined')('la actividad en otra pestaña descarta el aviso', async () => {
    const { result } = montar()
    await pasar(8 * S)
    expect(result.current.fase).toBe('aviso')
    const otraPestana = new BroadcastChannel('nexovolt-actividad')
    otraPestana.postMessage('actividad')
    await vi.waitFor(() => expect(result.current.fase).toBe('activo'))
    otraPestana.close()
  })
})

describe('cierre por inactividad en la aplicación (10 minutos, aviso 1 minuto antes)', () => {
  const MIN = 60 * S
  // Con sesión real en el mock: así el "ping" de renovación al servidor es válido.
  async function entrar() {
    await login('rmartinez@example.com', 'Admin12345')
    renderApp('/panel', null)
  }

  test('a los 9 minutos aparece el aviso y a los 10 se cierra la sesión con el motivo en el login', async () => {
    await entrar()
    await screen.findByRole('heading', { name: 'Bienvenido, Rosa' })
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()

    await pasar(9 * MIN)
    const aviso = await screen.findByRole('alertdialog', { name: '¿Sigues ahí?' })
    expect(aviso).toHaveTextContent(/60 segundos|59 segundos/)
    expect(screen.getByRole('button', { name: 'Seguir conectado' })).toHaveFocus()

    await pasar(1 * MIN)
    expect(await screen.findByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(screen.getByText(MSG_SALIDA.inactividad)).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  test('"Seguir conectado" mantiene la sesión', async () => {
    await entrar()
    await screen.findByRole('heading', { name: 'Bienvenido, Rosa' })
    await pasar(9 * MIN)
    fireEvent.click(await screen.findByRole('button', { name: 'Seguir conectado' }))
    await pasar(5 * MIN)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Bienvenido, Rosa' })).toBeInTheDocument()
  })

  test('Escape en el aviso equivale a seguir conectado', async () => {
    await entrar()
    await screen.findByRole('heading', { name: 'Bienvenido, Rosa' })
    await pasar(9 * MIN)
    await screen.findByRole('alertdialog', { name: '¿Sigues ahí?' })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  test('"Cerrar sesión ahora" cierra como cierre manual (sin mensaje de inactividad)', async () => {
    await entrar()
    await screen.findByRole('heading', { name: 'Bienvenido, Rosa' })
    await pasar(9 * MIN)
    fireEvent.click(await screen.findByRole('button', { name: 'Cerrar sesión ahora' }))
    expect(await screen.findByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(screen.queryByText(MSG_SALIDA.inactividad)).not.toBeInTheDocument()
  })

  test('el cierre por inactividad invalida la sesión también en el servidor', async () => {
    await login('rmartinez@example.com', 'Admin12345')
    renderApp('/panel', null)
    await screen.findByRole('heading', { name: 'Bienvenido, Rosa' })
    await pasar(10 * MIN)
    await screen.findByRole('button', { name: 'Iniciar sesión' })
    expect(await getCurrentUser()).toBeNull()
  })

  test('al vencer, el servidor recibe el motivo "inactividad" (queda así en la auditoría)', async () => {
    const cuerpos = espiarLogout()
    await entrar()
    await screen.findByRole('heading', { name: 'Bienvenido, Rosa' })
    await pasar(10 * MIN)
    await screen.findByRole('button', { name: 'Iniciar sesión' })
    expect(cuerpos).toEqual([{ motivo: 'inactividad' }])
  })

  test('"Cerrar sesión ahora" envía el motivo "manual"', async () => {
    const cuerpos = espiarLogout()
    await entrar()
    await screen.findByRole('heading', { name: 'Bienvenido, Rosa' })
    await pasar(9 * MIN)
    fireEvent.click(await screen.findByRole('button', { name: 'Cerrar sesión ahora' }))
    await screen.findByRole('button', { name: 'Iniciar sesión' })
    expect(cuerpos).toEqual([{ motivo: 'manual' }])
  })
})

describe('keepAlive', () => {
  test('con sesión vigente renueva; con sesión vencida falla con 401', async () => {
    await expect(keepAlive()).rejects.toMatchObject({ status: 401 })
    await login('jperez@example.com', 'Analista123')
    await expect(keepAlive()).resolves.toBeUndefined()
  })
})
