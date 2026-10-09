import { useEffect, useId, useRef, useState } from 'react'
import { Badge, Icon } from '../../components/ui'
import { ROLES } from '../../features/auth/roles'

const ITEM =
  'flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-green-50 hover:text-bosque focus-visible:bg-green-50 focus-visible:text-bosque'

// Menú de perfil de la barra superior. Teclado: flechas, Inicio/Fin, Escape.
// Aquí se enganchan después "Cambiar de perfil" (solo modo demo).
export default function ProfileMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const btnRef = useRef(null)
  const menuRef = useRef(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return undefined
    menuRef.current?.querySelector('[role=menuitem]')?.focus()

    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        btnRef.current?.focus()
        return
      }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return
      e.preventDefault()
      const items = [...menuRef.current.querySelectorAll('[role=menuitem]')]
      const i = items.indexOf(document.activeElement)
      const n =
        e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
      items[n].focus()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
        className="flex cursor-pointer items-center gap-3 rounded-[10px] border border-transparent px-2.5 py-1.5 text-right text-ink hover:bg-slate-100 aria-expanded:bg-slate-100"
      >
        <span className="flex flex-col items-end max-sm:hidden">
          <span className="text-sm font-semibold">{user.nombre}</span>
          <span className="text-xs text-muted">{user.rol}</span>
        </span>
        <span className="flex text-bosque">
          <Icon name="avatar" size={36} strokeWidth={1.5} />
        </span>
        <Icon name="chevron" size={16} />
      </button>
      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Menú de perfil"
          className="absolute top-[calc(100%+6px)] right-0 z-60 w-72.5 rounded-xl border border-line bg-white p-1.5 shadow-menu"
        >
          <div className="mb-1.5 flex flex-col items-start gap-0.5 border-b border-slate-100 p-3">
            <span className="text-[15px] font-bold">{user.nombre}</span>
            <span className="mb-1.5 text-xs text-muted">{user.correo}</span>
            <Badge tone={user.rol === ROLES.ADMIN ? 'admin' : 'ok'}>{user.rol}</Badge>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onLogout()
            }}
            className={`${ITEM} text-error-d hover:bg-red-50 hover:text-error-d focus-visible:bg-red-50 focus-visible:text-error-d`}
          >
            <Icon name="logout" />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}
