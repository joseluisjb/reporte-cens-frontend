import { createContext, useContext } from 'react'

export const AuthContext = createContext(null)

// const { user, logout } = useAuth()
// user = { nombre, correo, rol }  (rol es uno de ROLES)
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
