import { Icon } from '../../components/ui'
import { cx } from '../../components/ui/cx'
import { REGLAS_PASSWORD } from './authConfig'

// Lista de requisitos de la contraseña; cada uno se marca al cumplirse mientras se escribe.
export default function PasswordRequirements({ password, id }) {
  return (
    <ul id={id} aria-label="Requisitos de la contraseña" className="mt-3 mb-6 flex flex-col gap-1.5 rounded-ctl bg-slate-50 px-3.5 py-3">
      {REGLAS_PASSWORD.map((r) => {
        const cumple = r.cumple(password)
        return (
          <li key={r.id} className={cx('flex items-center gap-2 text-[13px]', cumple ? 'text-bosque-d' : 'text-muted')}>
            <Icon name="check" size={14} strokeWidth={3} className={cumple ? 'text-bosque' : 'text-slate-300'} />
            {r.texto}
            <span className="sr-only">{cumple ? ' (cumplido)' : ' (pendiente)'}</span>
          </li>
        )
      })}
    </ul>
  )
}
