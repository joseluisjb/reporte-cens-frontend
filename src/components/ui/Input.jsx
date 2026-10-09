import { useId } from 'react'
import { describedByIds } from './cx'
import { CONTROL, FieldError, FieldLabel } from './Field'

// Campo de texto con etiqueta y error accesible (aria-invalid + aria-describedby).
export default function Input({ label, error, describedBy, id, className, ...rest }) {
  const auto = useId()
  const inputId = id ?? auto
  const errId = `${inputId}-err`
  return (
    <div className={className}>
      {label && <FieldLabel htmlFor={inputId}>{label}</FieldLabel>}
      <input
        id={inputId}
        className={CONTROL}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedByIds(error && errId, describedBy)}
        {...rest}
      />
      <FieldError id={errId}>{error}</FieldError>
    </div>
  )
}
