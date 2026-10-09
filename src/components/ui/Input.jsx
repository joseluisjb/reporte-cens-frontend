import { useId } from 'react'
import { CONTROL, FieldError, FieldLabel } from './Field'

// Campo de texto con etiqueta y error accesible (aria-invalid + aria-describedby).
export default function Input({ label, error, id, className, ...rest }) {
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
        aria-describedby={error ? errId : undefined}
        {...rest}
      />
      <FieldError id={errId}>{error}</FieldError>
    </div>
  )
}
