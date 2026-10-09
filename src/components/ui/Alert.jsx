import Icon from './Icon'
import { cx } from './cx'

const TONOS = {
  error: 'border-red-200 bg-red-50 text-error',
  aviso: 'border-amber-200 bg-amber-50 text-amber-800',
}

// Aviso en línea. tone = 'error' (ej. "Usuario o contraseña incorrectos.") | 'aviso' (informativo).
export default function Alert({ tone = 'error', children }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cx('flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm font-medium', TONOS[tone])}
    >
      <Icon name="warn" size={16} />
      <span>{children}</span>
    </div>
  )
}
