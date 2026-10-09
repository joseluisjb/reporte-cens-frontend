import { cx } from './cx'

export default function Spinner({ className }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'inline-block size-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-bosque',
        className,
      )}
    />
  )
}
