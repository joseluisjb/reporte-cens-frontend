import { cx } from './cx'
import Icon from './Icon'

// Filtro desplegable compacto (ej. "Todos los estados"). `label` es el nombre accesible.
export default function FilterSelect({ label, className, children, ...rest }) {
  return (
    <div className={cx('relative inline-block', className)}>
      <select
        aria-label={label}
        className="cursor-pointer appearance-none rounded-ctl border border-gris bg-white py-[9px] pr-9 pl-3.5 text-[13px] text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bosque"
        {...rest}
      >
        {children}
      </select>
      <Icon
        name="chevron"
        size={14}
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted"
      />
    </div>
  )
}
