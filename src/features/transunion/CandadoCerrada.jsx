import { Icon } from '../../components/ui'

// Candado de obligación cerrada (02 Saldada o 07 Castigada recuperada): se reporta una sola vez y ya
// no cambia (RF13, RF16). El texto oculto lo lee el lector de pantalla; `title` lo muestra al pasar el mouse.
export default function CandadoCerrada() {
  return (
    <span className="ml-1 inline-flex align-middle text-muted" title="Cierre definitivo: se reporta una sola vez">
      <Icon name="lock" size={14} strokeWidth={2.2} />
      <span className="sr-only">Obligación cerrada</span>
    </span>
  )
}
