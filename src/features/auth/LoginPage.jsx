// Inicio de sesión (RF25), fiel a la maqueta. Textos del campo de usuario en authConfig.js.
import { useRef, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Alert, Button, Input, PasswordField, TextLink } from '../../components/ui'
import { RUTA_INICIAL } from '../../app/navigation'
import { usePageTitle } from '../../lib/usePageTitle'
import { IDENTIFICADOR, MSG_SALIDA } from './authConfig'
import { useAuth } from './authContext'
import { RUTA_CAMBIO_PASSWORD } from './RequireAuth'
import { validarLogin } from './loginValidation'

function PanelMarca() {
  return (
    <div className="hidden w-2/5 shrink-0 flex-col items-start justify-center bg-bosque p-14 text-white min-[901px]:flex">
      <div className="flex w-full max-w-105 flex-col items-start">
        <span className="mb-2 font-hd text-xl font-bold">Sistema Empresarial CENS</span>
        <p className="mb-10 font-hd text-4xl leading-tight font-bold">Gestión y Control de Cartera</p>
        <svg width="220" height="220" viewBox="0 0 240 240" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="120" cy="120" r="104" strokeDasharray="4 6" strokeOpacity="0.3" />
          <circle cx="120" cy="120" r="88" strokeOpacity="0.8" />
          <path d="M 68 152 A 64 64 0 1 1 172 152" strokeOpacity="0.4" />
          <polygon points="126,68 98,124 122,124 114,172 146,112 122,112" />
        </svg>
      </div>
    </div>
  )
}

export default function LoginPage() {
  usePageTitle('Iniciar sesión')
  const { user, login, motivoSalida } = useAuth()
  const location = useLocation()
  const [valores, setValores] = useState({ identificador: '', password: '' })
  const [errores, setErrores] = useState({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [enviando, setEnviando] = useState(false)
  const idRef = useRef(null)
  const passRef = useRef(null)

  // Si ya hay sesión (o se acaba de iniciar), se sale del login hacia donde corresponda.
  if (user) {
    const destino = user.debeCambiarPassword ? RUTA_CAMBIO_PASSWORD : (location.state?.from?.pathname ?? RUTA_INICIAL)
    return <Navigate to={destino} replace />
  }

  const cambiar = (campo) => (e) => {
    setValores((v) => ({ ...v, [campo]: e.target.value }))
    setErrores((er) => ({ ...er, [campo]: undefined }))
    setErrorGeneral('')
  }

  const enviar = async (e) => {
    e.preventDefault()
    const encontrados = validarLogin(valores)
    setErrores(encontrados)
    setErrorGeneral('')
    if (encontrados.identificador) return idRef.current?.focus()
    if (encontrados.password) return passRef.current?.focus()

    setEnviando(true)
    try {
      await login(valores.identificador.trim(), valores.password)
    } catch (err) {
      setErrorGeneral(err.message)
      setValores((v) => ({ ...v, password: '' }))
      setEnviando(false)
      passRef.current?.focus()
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      <PanelMarca />
      <div className="flex flex-1 items-center justify-center p-8">
        <form onSubmit={enviar} noValidate className="flex w-full max-w-95 flex-col" aria-label="Iniciar sesión">
          <h1 className="sr-only">Iniciar sesión en NexoVolt</h1>
          <div aria-hidden="true" className="mb-8 font-hd text-[34px] font-bold text-bosque">
            Nexo<span className="text-citrico">Volt</span>
          </div>
          {MSG_SALIDA[motivoSalida] && (
            <div className="mb-5">
              <Alert tone="aviso">{MSG_SALIDA[motivoSalida]}</Alert>
            </div>
          )}
          <Input
            ref={idRef}
            label={IDENTIFICADOR.etiqueta}
            type={IDENTIFICADOR.tipoInput}
            placeholder={IDENTIFICADOR.placeholder}
            autoComplete={IDENTIFICADOR.autoComplete}
            value={valores.identificador}
            onChange={cambiar('identificador')}
            error={errores.identificador}
          />
          <PasswordField
            ref={passRef}
            className="mt-5"
            label="Contraseña"
            placeholder="••••••••••••"
            autoComplete="current-password"
            value={valores.password}
            onChange={cambiar('password')}
            error={errores.password}
          />
          {errorGeneral && (
            <div className="mt-4">
              <Alert>{errorGeneral}</Alert>
            </div>
          )}
          <Button type="submit" size="lg" block loading={enviando} className="mt-6">
            Iniciar sesión
          </Button>
          <TextLink to="/recuperar" block>
            ¿Olvidaste tu contraseña?
          </TextLink>
        </form>
      </div>
    </div>
  )
}
