import { NavLink } from 'react-router-dom'
import rayo from '../../assets/brand/rayo-blanco.png'
import { Icon } from '../../components/ui'
import { cx } from '../../components/ui/cx'
import { ROLES } from '../../features/auth/roles'
import { NAV_ITEMS, SECCIONES, esSoloDe, puedeAbrir, textoRoles } from '../navigation'

const ITEM =
  'flex w-full items-center gap-2.5 px-5 py-3 text-left text-sm font-medium text-white hover:bg-black/10 focus-visible:outline-white'
const ETIQUETA = 'ml-auto inline-flex shrink-0 items-center gap-0.5 rounded-full bg-citrico px-1.5 py-0.5 text-[10px] font-bold text-sobre-citrico'

// Inicio (sin sección) y luego un grupo por sección, en el orden de la maqueta v3.
const GRUPOS = [
  { titulo: null, items: NAV_ITEMS.filter((i) => !i.section) },
  ...SECCIONES.map((titulo) => ({ titulo, items: NAV_ITEMS.filter((i) => i.section === titulo) })),
].filter((g) => g.items.length)

const idSeccion = (titulo) => `menu-${titulo.toLowerCase().replaceAll(' ', '-')}`

// Etiqueta del ítem: ADMIN siempre en las del Administrador; ANALISTA solo cuando está bloqueada.
function Etiqueta({ item, bloqueado }) {
  const esDeAdmin = esSoloDe(item, ROLES.ADMIN)
  if (!esDeAdmin && !bloqueado) return null
  return (
    <span className={ETIQUETA}>
      {bloqueado && <Icon name="lock" size={10} strokeWidth={2.5} />}
      {esDeAdmin ? 'ADMIN' : 'ANALISTA'}
    </span>
  )
}

function ItemMenu({ item, rol, onNavigate }) {
  const bloqueado = !puedeAbrir(item, rol)
  return (
    <li>
      <NavLink
        to={item.path}
        onClick={onNavigate}
        className={({ isActive }) => cx(ITEM, isActive && 'bg-black/20 font-semibold')}
      >
        <Icon name={item.icon} />
        <span>{item.label}</span>
        {bloqueado && <span className="sr-only"> (solo para el rol {textoRoles(item.roles)})</span>}
        <Etiqueta item={item} bloqueado={bloqueado} />
      </NavLink>
    </li>
  )
}

// Barra lateral. Muestra todas las opciones; las que el rol no puede abrir salen bloqueadas (candado
// y etiqueta) y llevan a «Acceso restringido». A diferencia de la maqueta, el texto bloqueado no se
// atenúa: con opacidad, el blanco sobre bosque-d baja del contraste AA. En pantallas angostas es un
// panel que se abre desde la barra superior.
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
        {GRUPOS.map(({ titulo, items }) => (
          <div key={titulo ?? 'inicio'}>
            {titulo && (
              <p id={idSeccion(titulo)} className="px-5 pt-3 pb-1 text-[11px] font-semibold tracking-wider uppercase">
                {titulo}
              </p>
            )}
            <ul aria-labelledby={titulo ? idSeccion(titulo) : undefined} className="flex flex-col gap-1">
              {items.map((i) => (
                <ItemMenu key={i.path} item={i} rol={rol} onNavigate={onNavigate} />
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
