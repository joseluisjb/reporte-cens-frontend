// Detecta inactividad (RF26) y avisa antes de cerrar la sesión. Los tiempos son parámetros.
//
// - Compara la hora real cada segundo (no un setTimeout único): sigue siendo correcto si el equipo
//   se suspende o la pestaña queda en segundo plano.
// - Fase 'aviso': faltan `warningMs` para cerrar. Aquí el movimiento del mouse NO reinicia el
//   contador (para no descartar el aviso sin querer): solo `seguirConectado()`.
// - Mientras hay actividad, llama a `onKeepAlive` cada idleMs/2 para que el reloj del servidor
//   (Django mide por peticiones) coincida con el del navegador.
// - Varias pestañas: la actividad en una se comunica a las otras (BroadcastChannel), si no la
//   pestaña quieta cerraría la sesión de quien está trabajando en otra.
import { useCallback, useEffect, useRef, useState } from 'react'

const EVENTOS = ['pointermove', 'pointerdown', 'keydown', 'scroll', 'wheel', 'touchstart']
const CANAL = 'nexovolt-actividad'
const ACTIVO = { fase: 'activo', segundos: 0 }

export function useIdleTimeout({ idleMs, warningMs, onIdle, onKeepAlive, enabled = true }) {
  const [estado, setEstado] = useState(ACTIVO)
  const ultima = useRef(0)
  const ultimoPing = useRef(0)
  const fase = useRef('activo')
  const canal = useRef(null)
  const callbacks = useRef({ onIdle, onKeepAlive })
  useEffect(() => {
    callbacks.current = { onIdle, onKeepAlive }
  })

  const marcarActivo = useCallback(() => {
    fase.current = 'activo'
    setEstado((e) => (e.fase === 'activo' ? e : ACTIVO))
  }, [])

  useEffect(() => {
    if (!enabled) return undefined
    ultima.current = Date.now()
    ultimoPing.current = Date.now()
    fase.current = 'activo'
    const bc = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CANAL)
    canal.current = bc
    let ultimoAvisoOtrasPestanas = 0
    let terminado = false

    const actividad = () => {
      if (fase.current === 'aviso') return
      const ahora = Date.now()
      ultima.current = ahora
      if (bc && ahora - ultimoAvisoOtrasPestanas > 5000) {
        ultimoAvisoOtrasPestanas = ahora
        bc.postMessage('actividad')
      }
      if (ahora - ultimoPing.current > idleMs / 2) {
        ultimoPing.current = ahora
        callbacks.current.onKeepAlive?.()
      }
    }
    if (bc) {
      bc.onmessage = () => {
        ultima.current = Date.now()
        if (fase.current === 'aviso') marcarActivo()
      }
    }

    const revisar = () => {
      if (terminado) return
      const inactivo = Date.now() - ultima.current
      if (inactivo >= idleMs) {
        terminado = true
        clearInterval(id)
        callbacks.current.onIdle?.()
      } else if (inactivo >= idleMs - warningMs) {
        fase.current = 'aviso'
        setEstado({ fase: 'aviso', segundos: Math.ceil((idleMs - inactivo) / 1000) })
      } else if (fase.current !== 'activo') {
        marcarActivo()
      }
    }

    const id = setInterval(revisar, 1000)
    EVENTOS.forEach((e) => window.addEventListener(e, actividad, { capture: true, passive: true }))
    document.addEventListener('visibilitychange', revisar)
    return () => {
      terminado = true
      clearInterval(id)
      EVENTOS.forEach((e) => window.removeEventListener(e, actividad, { capture: true }))
      document.removeEventListener('visibilitychange', revisar)
      bc?.close()
      canal.current = null
    }
  }, [enabled, idleMs, warningMs, marcarActivo])

  // El usuario confirma que sigue ahí (botón del aviso): reinicia el contador y renueva el servidor.
  const seguirConectado = useCallback(() => {
    const ahora = Date.now()
    ultima.current = ahora
    ultimoPing.current = ahora
    marcarActivo()
    canal.current?.postMessage('actividad')
    callbacks.current.onKeepAlive?.()
  }, [marcarActivo])

  return { fase: estado.fase, segundos: estado.segundos, seguirConectado }
}
