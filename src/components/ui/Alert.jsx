import Icon from './Icon'
import { cx } from './cx'

const TONOS = {
  error: 'border-red-200 bg-red-50 text-error-d',
  aviso: 'border-amber-200 bg-amber-50 text-amber-800',
  info: 'border-info-borde bg-info-claro text-info-d',
}

const ROLES_ARIA = { error: 'alert', aviso: 'status', info: 'note' }

// Aviso en línea.
// tone = 'error' (ej. "Usuario o contraseña incorrectos.") | 'aviso' (advertencia que se anuncia)
//      | 'info' (nota fija de la pantalla, la NoteBox de la maqueta v3: no se anuncia al cargar).
export default function Alert({ tone = 'error', children }) {
  return (
    <div
      role={ROLES_ARIA[tone]}
      className={cx('flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm font-medium', TONOS[tone])}
    >
      <Icon name={tone === 'info' ? 'info' : 'warn'} size={16} className="shrink-0" />
      <div>{children}</div>
    </div>
  )
}
