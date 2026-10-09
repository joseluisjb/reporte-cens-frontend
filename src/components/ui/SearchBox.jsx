import { cx } from './cx'
import Icon from './Icon'

// Caja de búsqueda con lupa. `label` es el nombre accesible (el placeholder no basta).
export default function SearchBox({ label = 'Buscar', className, ...rest }) {
  return (
    <div
      className={cx(
        'flex w-70 max-w-full items-center gap-2 rounded-ctl border border-gris bg-white px-3.5 py-[9px] text-muted focus-within:border-bosque focus-within:ring-1 focus-within:ring-bosque',
        className,
      )}
    >
      <Icon name="search" size={16} />
      <input
        type="search"
        aria-label={label}
        className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-muted"
        {...rest}
      />
    </div>
  )
}
