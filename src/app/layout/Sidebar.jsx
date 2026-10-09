import { NavLink } from 'react-router-dom'
import { Icon } from '../../components/ui'
import { cx } from '../../components/ui/cx'
import { ROLES } from '../../features/auth/roles'
import { NAV_ITEMS } from '../navigation'

const ITEM =
  'flex w-full items-center gap-2.5 px-5 py-3 text-left text-sm font-medium text-white opacity-90 hover:bg-white/8 hover:opacity-100 focus-visible:outline-white'

// Barra lateral. Muestra solo las opciones que el rol puede abrir.
// En pantallas angostas es un panel que se abre desde la barra superior.
export default function Sidebar({ rol, open, onNavigate, onLogout }) {
  const items = NAV_ITEMS.filter((i) => !i.adminOnly || rol === ROLES.ADMIN)
  return (
    <aside
      id="sidebar"
      className={cx(
        'flex w-65 shrink-0 flex-col bg-bosque py-6 text-white',
        'max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:transition-transform',
        open ? 'max-md:translate-x-0' : 'max-md:invisible max-md:-translate-x-full',
        'md:sticky md:top-0 md:h-screen md:self-start',
      )}
    >
      <div className="font-hd px-6 pb-8 text-2xl font-bold">
        Nexo<b className="text-citrico">Volt</b>
      </div>
      <nav aria-label="Navegación principal" className="flex flex-1 flex-col gap-1 overflow-auto">
        {items.map((i) => (
          <NavLink
            key={i.path}
            to={i.path}
            onClick={onNavigate}
            className={({ isActive }) => cx(ITEM, isActive && 'bg-white/16 font-semibold opacity-100')}
          >
            <Icon name={i.icon} />
            <span>{i.label}</span>
            {i.adminOnly && (
              <span className="ml-auto shrink-0 rounded-full bg-citrico px-1.5 py-0.5 text-[10px] font-bold text-bosque">
                ADMIN
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <button type="button" onClick={onLogout} className={cx(ITEM, 'cursor-pointer')}>
        <Icon name="logout" />
        <span>Cerrar sesión</span>
      </button>
    </aside>
  )
}
