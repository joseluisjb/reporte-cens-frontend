// Inicio de sesión (RF25), fiel a la maqueta. Textos del campo de usuario en authConfig.js.
import { Navigate, useLocation } from 'react-router-dom'
import { Alert, Button, Input, PasswordField, TextLink } from '../../components/ui'
import { RUTA_INICIAL } from '../../app/navigation'
import logo from '../../assets/brand/logo-nexovolt.png'
import { useFormulario } from '../../lib/useFormulario'
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
  // Formulario reutilizable de RF31. Si las credenciales fallan, se limpia la contraseña y se
  // vuelve a ella; el hook muestra el mensaje como aviso general.
  const form = useFormulario({
    valoresIniciales: { identificador: '', password: '' },
    validar: validarLogin,
    onSubmit: async (valores) => {
      try {
        await login(valores.identificador.trim(), valores.password)
      } catch (err) {
        form.setValor('password', '')
        form.enfocar('password')
        throw err
      }
    },
  })

  // Si ya hay sesión (o se acaba de iniciar), se sale del login hacia donde corresponda.
  if (user) {
    const destino = user.debeCambiarPassword ? RUTA_CAMBIO_PASSWORD : (location.state?.from?.pathname ?? RUTA_INICIAL)
    return <Navigate to={destino} replace />
  }

  return (
    <main className="flex min-h-screen bg-white">
      <PanelMarca />
      <div className="flex flex-1 items-center justify-center p-8">
        <form {...form.formProps} className="flex w-full max-w-95 flex-col" aria-label="Iniciar sesión">
          <h1 className="sr-only">Iniciar sesión en NexoVolt</h1>
          <img src={logo} alt="NexoVolt, desarrollo de software" width="448" height="344" className="mx-auto mb-6 h-auto w-56" />
          {MSG_SALIDA[motivoSalida] && (
            <div className="mb-5">
              <Alert tone="aviso">{MSG_SALIDA[motivoSalida]}</Alert>
            </div>
          )}
          <Input
            label={IDENTIFICADOR.etiqueta}
            required
            type={IDENTIFICADOR.tipoInput}
            placeholder={IDENTIFICADOR.placeholder}
            autoComplete={IDENTIFICADOR.autoComplete}
            {...form.campo('identificador')}
          />
          <PasswordField
            className="mt-5"
            label="Contraseña"
            required
            autoComplete="current-password"
            {...form.campo('password')}
          />
          {form.errorGeneral && (
            <div className="mt-4">
              <Alert>{form.errorGeneral}</Alert>
            </div>
          )}
          <Button type="submit" size="lg" block loading={form.enviando} className="mt-6">
            Iniciar sesión
          </Button>
          <TextLink to="/recuperar" block>
            ¿Olvidaste tu contraseña?
          </TextLink>
        </form>
      </div>
    </main>
  )
}
