import { Icon } from '../../components/ui'
import { cx } from '../../components/ui/cx'

// Tarjeta centrada de las pantallas de contraseña (cambio, recuperar, restablecer), como la maqueta.
export default function AuthCard({ icon, iconClass = 'text-bosque', iconSize = 40, title, subtitle, narrow = false, children }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F4F3F7] p-8">
      <div className={cx('w-full rounded-dlg bg-white p-10 shadow-[0_1px_3px_rgba(0,0,0,0.08)]', narrow ? 'max-w-105' : 'max-w-110')}>
        <span className={cx('mb-4 flex justify-center', iconClass)}>
          <Icon name={icon} size={iconSize} />
        </span>
        <h1 className="mb-2 text-center font-hd text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mb-7 text-center text-sm text-muted">{subtitle}</p>}
        {children}
      </div>
    </main>
  )
}
