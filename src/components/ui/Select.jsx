import { useId } from 'react'
import Icon from './Icon'
import { describedByIds } from './cx'
import { CONTROL, FieldError, FieldLabel } from './Field'

export default function Select({ label, error, describedBy, id, className, children, ...rest }) {
  const auto = useId()
  const selId = id ?? auto
  const errId = `${selId}-err`
  return (
    <div className={className}>
      {label && <FieldLabel htmlFor={selId}>{label}</FieldLabel>}
      <div className="relative">
        <select
          id={selId}
          className={`${CONTROL} appearance-none pr-10`}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedByIds(error && errId, describedBy)}
          {...rest}
        >
          {children}
        </select>
        <Icon
          name="chevron"
          size={16}
          className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-muted"
        />
      </div>
      <FieldError id={errId}>{error}</FieldError>
    </div>
  )
}
