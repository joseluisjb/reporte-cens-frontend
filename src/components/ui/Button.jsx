import { buttonClasses } from './buttonClasses'
import { cx } from './cx'
import Spinner from './Spinner'

export default function Button({
  variant = 'primary',
  size = 'md',
  block = false,
  loading = false,
  type = 'button',
  disabled,
  className,
  children,
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(buttonClasses({ variant, size, block }), className)}
      {...rest}
    >
      {loading && <Spinner className="border-white/45 border-t-white" />}
      {children}
    </button>
  )
}
