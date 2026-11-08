import { Icon } from '../../components/ui'

// Candado de obligación cerrada (02 Saldada o 07 Castigada recuperada): se reporta una sola vez y ya
// no cambia (RF13, RF16). El lector de pantalla lee la regla completa; el `title` del ícono la
// muestra al pasar el mouse.
export default function CandadoCerrada() {
  return (
    <span className="ml-1 inline-flex align-middle text-muted">
      <span aria-hidden="true" title="Cierre definitivo: se reporta una sola vez">
        <Icon name="lock" size={14} strokeWidth={2.2} />
      </span>
      <span className="sr-only">Obligación cerrada: se reporta una sola vez</span>
    </span>
  )
}
