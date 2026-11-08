import Icon from './Icon'
import { cx } from './cx'

// Por tono: clases, rol ARIA e ícono. Un tono desconocido usa `aviso` (se ve y se anuncia).
const TONOS = {
  error: { clases: 'border-red-200 bg-red-50 text-error-d', rol: 'alert', icono: 'warn' },
  aviso: { clases: 'border-amber-200 bg-amber-50 text-amber-800', rol: 'status', icono: 'warn' },
  info: { clases: 'border-info-borde bg-info-claro text-info-d', rol: 'note', icono: 'info' },
}

// Aviso en línea.
// tone = 'error' (ej. "Usuario o contraseña incorrectos.") | 'aviso' (advertencia que se anuncia)
//      | 'info' (nota fija de la pantalla, la NoteBox de la maqueta v3: no se anuncia al cargar).
export default function Alert({ tone = 'error', children }) {
  const { clases, rol, icono } = TONOS[tone] ?? TONOS.aviso
  return (
    <div role={rol} className={cx('flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm font-medium', clases)}>
      <Icon name={icono} size={16} className="shrink-0" />
      <div>{children}</div>
    </div>
  )
}
