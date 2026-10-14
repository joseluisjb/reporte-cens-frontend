// Restablecer la contraseña con el enlace del correo (RF29). Paso 2 de la recuperación.
// NO está en la maqueta ni en la asignación: es necesaria porque el enlace es de un solo uso y
// lleva un token (/restablecer?token=...). Pendiente de confirmar con el equipo y con José Luis.
// Usa el formulario reutilizable de RF31 (`useFormulario`).
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Alert, Button, PasswordField, TextLink, useToast } from '../../components/ui'
import { useFormulario } from '../../lib/useFormulario'
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
  const [tokenInvalido, setTokenInvalido] = useState('')
  const form = useFormulario({
    valoresIniciales: { nueva: '', repetir: '' },
    validar: validarRestablecer,
    traducirErrores: (fe) => ({ nueva: fe.new_password }),
    onSubmit: async (valores) => {
      try {
        await confirmPasswordReset({ token, nueva: valores.nueva })
      } catch (err) {
        // Un token vencido o ya usado no es un error del formulario: cambia la pantalla.
        if (err.fieldErrors?.token) return setTokenInvalido(err.fieldErrors.token)
        throw err
      }
      toast.success('Contraseña restablecida. Inicia sesión con tu nueva contraseña.')
      navigate('/login', { replace: true })
    },
  })

  if (!token) return <EnlaceInvalido mensaje={MSG_ENLACE_INVALIDO} />
  if (tokenInvalido) return <EnlaceInvalido mensaje={tokenInvalido} />

  return (
    <AuthCard icon="lock" title="Restablecer contraseña" subtitle="Define una nueva contraseña para tu cuenta.">
      <form {...form.formProps}>
        <PasswordField
          describedBy="requisitos-password"
          className="mb-4.5"
          label="Nueva contraseña"
          required
          autoComplete="new-password"
          {...form.campo('nueva')}
        />
        <PasswordField label="Confirmar nueva contraseña" required autoComplete="new-password" {...form.campo('repetir')} />
        <PasswordRequirements id="requisitos-password" password={form.valores.nueva} />
        {form.errorGeneral && (
          <div className="mb-4">
            <Alert>{form.errorGeneral}</Alert>
          </div>
        )}
        <Button type="submit" size="lg" block loading={form.enviando}>
          Guardar contraseña
        </Button>
      </form>
    </AuthCard>
  )
}
