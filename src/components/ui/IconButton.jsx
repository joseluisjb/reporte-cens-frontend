import { cx } from './cx'
import Icon from './Icon'

// Botón de solo icono (ej. lápiz de editar en una tabla). `label` es obligatorio para lectores de pantalla.
export default function IconButton({ icon, label, size = 16, className, ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex cursor-pointer rounded-md p-1 text-muted hover:bg-slate-100 hover:text-bosque disabled:cursor-not-allowed disabled:opacity-55',
        className,
      )}
      {...rest}
    >
      <Icon name={icon} size={size} />
    </button>
  )
}
