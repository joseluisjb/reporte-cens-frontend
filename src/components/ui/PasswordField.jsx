import { useId, useState } from 'react'
import Icon from './Icon'
import { CONTROL, FieldError, FieldLabel } from './Field'

// Campo de contraseña con botón mostrar/ocultar.
export default function PasswordField({ label, error, id, className, ...rest }) {
  const auto = useId()
  const inputId = id ?? auto
  const errId = `${inputId}-err`
  const [visible, setVisible] = useState(false)
  return (
    <div className={className}>
      {label && <FieldLabel htmlFor={inputId}>{label}</FieldLabel>}
      <div className="relative">
        <input
          id={inputId}
          type={visible ? 'text' : 'password'}
          className={`${CONTROL} pr-11`}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errId : undefined}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${label ? label.toLowerCase() : 'contraseña'}`}
          className="absolute top-1/2 right-2.5 flex -translate-y-1/2 cursor-pointer rounded-md p-1 text-slate-400 hover:text-slate-600"
        >
          <Icon name={visible ? 'eyeOff' : 'eye'} size={20} />
        </button>
      </div>
      <FieldError id={errId}>{error}</FieldError>
    </div>
  )
}
