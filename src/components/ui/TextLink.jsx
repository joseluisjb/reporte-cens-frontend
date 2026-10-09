import { Link } from 'react-router-dom'
import { cx } from './cx'

// Enlace de texto verde. `block` lo centra en su propia línea (ej. "¿Olvidaste tu contraseña?").
export default function TextLink({ block = false, underline = false, className, ...rest }) {
  return (
    <Link
      className={cx(
        'text-bosque-d hover:underline',
        block ? 'mt-4 block text-center text-sm font-medium' : 'font-semibold',
        underline && 'underline',
        className,
      )}
      {...rest}
    />
  )
}
