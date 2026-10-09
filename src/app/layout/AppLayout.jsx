import { Suspense, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Icon, Spinner, useToast } from '../../components/ui'
import { useAuth } from '../../features/auth/authContext'
import ProfileMenu from './ProfileMenu'
import Sidebar from './Sidebar'

// Estructura de toda pantalla interna: barra lateral + barra superior + contenido.
// Las páginas se dibujan en <Outlet />.
export default function AppLayout() {
  const { user, logout } = useAuth()
  const toast = useToast()
  const { pathname } = useLocation()
  const [menuAbierto, setMenuAbierto] = useState(false)

  useEffect(() => {
    if (!menuAbierto) return undefined
    const onKey = (e) => e.key === 'Escape' && setMenuAbierto(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuAbierto])

  // Al quedar sin usuario, RequireAuth lleva solo a /login.
  const cerrarSesion = async () => {
    await logout()
    toast.success('Sesión cerrada correctamente.')
  }

  return (
    <div className="flex min-h-screen bg-fondo">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-300 focus:rounded-md focus:bg-white focus:px-3 focus:py-2"
      >
        Saltar al contenido
      </a>
      {menuAbierto && (
        <div className="fixed inset-0 z-40 bg-slate-900/45 md:hidden" onClick={() => setMenuAbierto(false)} />
      )}
      <Sidebar
        rol={user.rol}
        open={menuAbierto}
        onNavigate={() => setMenuAbierto(false)}
        onLogout={cerrarSesion}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-white px-4 py-3 md:justify-end md:px-8">
          <button
            type="button"
            aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuAbierto}
            aria-controls="sidebar"
            onClick={() => setMenuAbierto((o) => !o)}
            className="flex cursor-pointer rounded-md p-2 text-ink hover:bg-slate-100 md:hidden"
          >
            <Icon name={menuAbierto ? 'close' : 'menu'} size={22} />
          </button>
          <ProfileMenu user={user} onLogout={cerrarSesion} />
        </header>
        <main id="contenido" key={pathname} className="p-5 md:p-8">
          <Suspense
            fallback={
              <div role="status" aria-label="Cargando" className="flex justify-center p-12">
                <Spinner className="size-6" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
