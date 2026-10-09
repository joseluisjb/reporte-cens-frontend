// TEMPORAL (paso 4): usuario ficticio para poder ver el layout.
// El paso 6 lo reemplaza por la sesión real (login, GET /me, cierre de sesión).
// En desarrollo, ?rol=analista muestra la vista de Analista de Cartera.
import { useMemo } from 'react'
import { AuthContext } from './authContext'
import { ROLES } from './roles'

const ADMIN = { nombre: 'Rosa Martínez', correo: 'rmartinez@cens.com.co', rol: ROLES.ADMIN }
const ANALISTA = { nombre: 'Juan Pérez', correo: 'jperez@cens.com.co', rol: ROLES.ANALISTA }

function usuarioInicial() {
  const analista = import.meta.env.DEV && new URLSearchParams(window.location.search).get('rol') === 'analista'
  return analista ? ANALISTA : ADMIN
}

export default function AuthProvider({ initialUser, children }) {
  const value = useMemo(
    () => ({ user: initialUser ?? usuarioInicial(), logout: () => {} }),
    [initialUser],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
