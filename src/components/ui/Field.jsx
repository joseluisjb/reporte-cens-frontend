import { cx } from './cx'

// Piezas comunes de los campos de formulario: etiqueta, mensaje de error y estilo del control.
export function FieldLabel({ htmlFor, children, className }) {
  return (
    <label htmlFor={htmlFor} className={cx('mb-1.5 block text-sm font-semibold', className)}>
      {children}
    </label>
  )
}

export function FieldError({ id, children }) {
  if (!children) return null
  return (
    <p id={id} role="alert" className="mt-1.5 text-[13px] font-semibold text-error-d">
      {children}
    </p>
  )
}

export const CONTROL =
  'w-full rounded-ctl border border-gris bg-white px-4 py-3 text-sm text-ink placeholder:text-slate-400 ' +
  'focus:border-bosque focus:ring-1 focus:ring-bosque focus-visible:outline-none ' +
  'aria-[invalid=true]:border-error aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-error ' +
  'disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400'
