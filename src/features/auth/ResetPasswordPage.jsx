// Restablecer la contraseña con el enlace del correo (RF29). Paso 2 de la recuperación.
// NO está en la maqueta ni en la asignación: es necesaria porque el enlace es de un solo uso y
// lleva un token (/restablecer?token=...). Pendiente de confirmar con el equipo y con José Luis.
import { useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Alert, Button, PasswordField, TextLink, useToast } from '../../components/ui'
import { usePageTitle } from '../../lib/usePageTitle'
import AuthCard from './AuthCard'
import PasswordRequirements from './PasswordRequirements'
import { confirmPasswordReset } from './authService'
import { validarRestablecer } from './passwordValidation'

const MSG_ENLACE_INVALIDO = 'El enlace no es válido o ya venció.'

function EnlaceInvalido({ mensaje }) {
  return (
    <AuthCard icon="warn" iconClass="text-error" title="Enlace no válido" narrow>
      <p className="mb-6 text-center text-muted">{mensaje}</p>
      <div className="text-center">
        <TextLink to="/recuperar">Solicitar un nuevo enlace</TextLink>
      </div>
    </AuthCard>
  )
}

export default function ResetPasswordPage() {
  usePageTitle('Restablecer contraseña')
  const [params] = useSearchParams()
  const token = params.get('token')
  const navigate = useNavigate()
  const toast = useToast()
  const [valores, setValores] = useState({ nueva: '', repetir: '' })
  const [errores, setErrores] = useState({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [tokenInvalido, setTokenInvalido] = useState('')
  const [enviando, setEnviando] = useState(false)
  const nuevaRef = useRef(null)
  const repetirRef = useRef(null)
  const enfocar = (campo) => ({ nueva: nuevaRef, repetir: repetirRef })[campo]?.current?.focus()

  if (!token) return <EnlaceInvalido mensaje={MSG_ENLACE_INVALIDO} />
  if (tokenInvalido) return <EnlaceInvalido mensaje={tokenInvalido} />

  const cambiar = (campo) => (e) => {
    setValores((v) => ({ ...v, [campo]: e.target.value }))
    setErrores((er) => ({ ...er, [campo]: undefined }))
    setErrorGeneral('')
  }

  const enviar = async (e) => {
    e.preventDefault()
    const encontrados = validarRestablecer(valores)
    setErrores(encontrados)
    setErrorGeneral('')
    const primero = ['nueva', 'repetir'].find((c) => encontrados[c])
    if (primero) return enfocar(primero)

    setEnviando(true)
    try {
      await confirmPasswordReset({ token, nueva: valores.nueva })
      toast.success('Contraseña restablecida. Inicia sesión con tu nueva contraseña.')
      navigate('/login', { replace: true })
    } catch (err) {
      setEnviando(false)
      if (err.fieldErrors?.token) return setTokenInvalido(err.fieldErrors.token)
      if (err.fieldErrors?.new_password) {
        setErrores({ nueva: err.fieldErrors.new_password })
        return enfocar('nueva')
      }
      setErrorGeneral(err.message)
    }
  }

  return (
    <AuthCard icon="lock" title="Restablecer contraseña" subtitle="Define una nueva contraseña para tu cuenta.">
      <form onSubmit={enviar} noValidate>
        <PasswordField
          ref={nuevaRef}
          describedBy="requisitos-password"
          className="mb-4.5"
          label="Nueva contraseña"
          required
          autoComplete="new-password"
          value={valores.nueva}
          onChange={cambiar('nueva')}
          error={errores.nueva}
        />
        <PasswordField
          ref={repetirRef}
          label="Confirmar nueva contraseña"
          required
          autoComplete="new-password"
          value={valores.repetir}
          onChange={cambiar('repetir')}
          error={errores.repetir}
        />
        <PasswordRequirements id="requisitos-password" password={valores.nueva} />
        {errorGeneral && (
          <div className="mb-4">
            <Alert>{errorGeneral}</Alert>
          </div>
        )}
        <Button type="submit" size="lg" block loading={enviando}>
          Guardar contraseña
        </Button>
      </form>
    </AuthCard>
  )
}
