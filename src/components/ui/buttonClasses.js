import { cx } from './cx'

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-ctl border border-transparent font-semibold leading-tight text-center cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed'
const SIZES = {
  sm: 'px-4 py-2 text-[13px]',
  md: 'px-[18px] py-[11px] text-sm',
  lg: 'p-3.5 text-base',
}
const VARIANTS = {
  primary: 'bg-bosque text-white enabled:hover:bg-bosque-d',
  outline: 'bg-white text-bosque border-bosque enabled:hover:bg-green-50',
  ghost: 'bg-white text-slate-700 border-gris enabled:hover:bg-slate-50',
  danger: 'bg-error-d text-white enabled:hover:bg-red-800',
}

// Estilos del botón; también sirven para un <Link> con aspecto de botón.
export const buttonClasses = ({ variant = 'primary', size = 'md', block = false } = {}) =>
  cx(BASE, SIZES[size], VARIANTS[variant], block && 'flex w-full')
