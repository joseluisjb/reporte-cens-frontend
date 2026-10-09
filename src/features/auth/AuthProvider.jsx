// Sesión de la aplicación (RF25). La sesión real es una cookie HttpOnly que maneja el navegador;
// aquí solo se guarda QUIÉN es el usuario (que responde el backend) y el estado de carga.
//
// status: 'cargando' (preguntando al backend si hay sesión) | 'autenticado' | 'anonimo'
// `initialUser` es solo para pruebas: arranca ya autenticado sin consultar al backend.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { setAuthHandlers } from '../../lib/api'
import { useToast } from '../../components/ui'
import { AuthContext } from './authContext'
import { demoSwitchProfile, getCurrentUser, login as loginRequest, logout as logoutRequest } from './authService'

export default function AuthProvider({ initialUser = null, children }) {
  const toast = useToast()
  const [user, setUser] = useState(initialUser)
  const [status, setStatus] = useState(initialUser ? 'autenticado' : 'cargando')
  // Por qué se salió: 'manual' | 'inactividad' | 'expirada' | null. El login lo muestra, y tras una
  // salida manual no "devuelve" a la pantalla de la que saliste.
  const [motivoSalida, setMotivoSalida] = useState(null)
  const userRef = useRef(user)
  useEffect(() => {
    userRef.current = user
  }, [user])

  // Al abrir la app (o recargar) se pregunta si la cookie de sesión sigue vigente.
  useEffect(() => {
    if (initialUser) return undefined
    let cancelado = false
    getCurrentUser()
      .then((u) => {
        if (cancelado) return
        setUser(u)
        setStatus(u ? 'autenticado' : 'anonimo')
      })
      .catch(() => !cancelado && setStatus('anonimo'))
    return () => {
      cancelado = true
    }
  }, [initialUser])

  // Cualquier 401 en la app (sesión vencida o invalidada) devuelve al login.
  useEffect(() => {
    setAuthHandlers({
      onUnauthorized: () => {
        if (userRef.current) setMotivoSalida('expirada')
        setUser(null)
        setStatus('anonimo')
      },
      // El backend dijo "no tienes permiso" (ej. se le quitó el rol). El guard por URL ya cuida
      // las pantallas; esto avisa cuando es una acción concreta.
      onForbidden: (e) => toast.error(e.message),
    })
    return () => setAuthHandlers({})
  }, [toast])

  const login = useCallback(async (identificador, password) => {
    const u = await loginRequest(identificador, password)
    setMotivoSalida(null)
    setUser(u)
    setStatus('autenticado')
    return u
  }, [])

  const logout = useCallback(async (motivo) => {
    setMotivoSalida(motivo === 'inactividad' ? 'inactividad' : 'manual')
    try {
      await logoutRequest()
    } finally {
      // Aunque el backend no responda, en este equipo la sesión local se cierra.
      setUser(null)
      setStatus('anonimo')
    }
  }, [])

  // Solo modo demostración con mocks (ver SwitchProfileModal).
  const cambiarPerfilDemo = useCallback(async (rol) => {
    const u = await demoSwitchProfile(rol)
    setUser(u)
    return u
  }, [])

  const value = useMemo(
    () => ({ user, status, motivoSalida, login, logout, cambiarPerfilDemo }),
    [user, status, motivoSalida, login, logout, cambiarPerfilDemo],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
