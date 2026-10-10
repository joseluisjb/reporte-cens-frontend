import { NavLink } from 'react-router-dom'
import rayo from '../../assets/brand/rayo-blanco.png'
import { Icon } from '../../components/ui'
import { cx } from '../../components/ui/cx'
import { ROLES } from '../../features/auth/roles'
import { NAV_ITEMS } from '../navigation'

const ITEM =
  'flex w-full items-center gap-2.5 px-5 py-3 text-left text-sm font-medium text-white hover:bg-black/10 focus-visible:outline-white'

// Barra lateral. Muestra solo las opciones que el rol puede abrir.
// En pantallas angostas es un panel que se abre desde la barra superior.
export default function Sidebar({ rol, open, onNavigate, onLogout }) {
  const items = NAV_ITEMS.filter((i) => !i.adminOnly || rol === ROLES.ADMIN)
  return (
    <aside
      id="sidebar"
      className={cx(
        'flex w-65 shrink-0 flex-col bg-bosque-d py-6 text-white',
        'max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:transition-transform',
        open ? 'max-md:translate-x-0' : 'max-md:invisible max-md:-translate-x-full',
        'md:sticky md:top-0 md:h-screen md:self-start',
      )}
    >
      <div className="flex items-center gap-2.5 px-6 pb-8 font-hd text-2xl font-bold">
        <img src={rayo} alt="" width="67" height="151" className="h-8 w-auto" />
        <span>
          Nexo<b className="text-citrico">Volt</b>
        </span>
      </div>
      <nav aria-label="Navegación principal" className="flex flex-1 flex-col gap-1 overflow-auto">
        {items.map((i) => (
          <NavLink
            key={i.path}
            to={i.path}
            onClick={onNavigate}
            className={({ isActive }) => cx(ITEM, isActive && 'bg-black/20 font-semibold opacity-100')}
          >
            <Icon name={i.icon} />
            <span>{i.label}</span>
            {i.adminOnly && (
              <span className="ml-auto shrink-0 rounded-full bg-citrico px-1.5 py-0.5 text-[10px] font-bold text-[#064e24]">
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
