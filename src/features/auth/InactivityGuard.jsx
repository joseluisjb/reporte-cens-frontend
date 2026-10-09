// Cierre de sesión por inactividad (RF26): aviso previo y cierre automático.
// El tiempo sale de VITE_IDLE_MINUTES (lib/config.js) y debe coincidir con el backend.
import { useRef } from 'react'
import { Button, Modal } from '../../components/ui'
import { IDLE_MINUTES, IDLE_WARNING_SECONDS } from '../../lib/config'
import { useAuth } from './authContext'
import { keepAlive } from './authService'
import { useIdleTimeout } from './useIdleTimeout'

const IDLE_MS = IDLE_MINUTES * 60 * 1000

export default function InactivityGuard({
  idleMs = IDLE_MS,
  warningMs = Math.min(IDLE_WARNING_SECONDS * 1000, idleMs / 2),
}) {
  const { logout } = useAuth()
  const seguirRef = useRef(null)
  const { fase, segundos, seguirConectado } = useIdleTimeout({
    idleMs,
    warningMs,
    onIdle: () => logout('inactividad'),
    // Un fallo de red aquí no debe molestar al usuario; un 401 lo atiende el manejo global.
    onKeepAlive: () => keepAlive().catch(() => {}),
  })

  return (
    <Modal
      open={fase === 'aviso'}
      onClose={seguirConectado}
      initialFocusRef={seguirRef}
      title="¿Sigues ahí?"
      subtitle="Por seguridad, la sesión se cierra cuando no hay actividad."
      footer={
        <>
          <Button variant="ghost" onClick={() => logout()}>
            Cerrar sesión ahora
          </Button>
          <Button ref={seguirRef} onClick={seguirConectado}>
            Seguir conectado
          </Button>
        </>
      }
    >
      <p>
        Tu sesión se cerrará por inactividad en <b>{segundos}</b> {segundos === 1 ? 'segundo' : 'segundos'}.
      </p>
    </Modal>
  )
}
