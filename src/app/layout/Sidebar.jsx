import { NavLink } from 'react-router-dom'
import rayo from '../../assets/brand/rayo-blanco.png'
import { Icon } from '../../components/ui'
import { cx } from '../../components/ui/cx'
import { NAV_ITEMS, SECCIONES, puedeAbrir } from '../navigation'

const ITEM =
  'flex w-full items-center gap-2.5 px-5 py-3 text-left text-sm font-medium text-white hover:bg-black/10 focus-visible:outline-white'

// Solo las opciones que el rol puede abrir: Inicio (sin sección) y luego un grupo por sección, en el
// orden de la maqueta v3. Una sección sin opciones para el rol no se muestra.
const gruposDelRol = (rol) => {
  const items = NAV_ITEMS.filter((i) => puedeAbrir(i, rol))
  return [
    { titulo: null, items: items.filter((i) => !i.section) },
    ...SECCIONES.map((titulo) => ({ titulo, items: items.filter((i) => i.section === titulo) })),
  ].filter((g) => g.items.length)
}

const idSeccion = (titulo) => `menu-${titulo.toLowerCase().replaceAll(' ', '-')}`

function ItemMenu({ item, onNavigate }) {
  return (
    <li>
      <NavLink
        to={item.path}
        onClick={onNavigate}
        className={({ isActive }) => cx(ITEM, isActive && 'bg-black/20 font-semibold')}
      >
        <Icon name={item.icon} />
        <span>{item.label}</span>
      </NavLink>
    </li>
  )
}

// Barra lateral. Cada rol ve solo las opciones que puede abrir (y los títulos de sección que las
// contienen). En pantallas angostas es un panel que se abre desde la barra superior.
export default function Sidebar({ rol, open, onNavigate, onLogout }) {
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
        {gruposDelRol(rol).map(({ titulo, items }) => (
          <div key={titulo ?? 'inicio'}>
            {titulo && (
              <p id={idSeccion(titulo)} className="px-5 pt-3 pb-1 text-[11px] font-semibold tracking-wider uppercase">
                {titulo}
              </p>
            )}
            <ul aria-labelledby={titulo ? idSeccion(titulo) : undefined} className="flex flex-col gap-1">
              {items.map((i) => (
                <ItemMenu key={i.path} item={i} onNavigate={onNavigate} />
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <button type="button" onClick={onLogout} className={cx(ITEM, 'cursor-pointer')}>
        <Icon name="logout" />
        <span>Cerrar sesión</span>
      </button>
    </aside>
  )
}
