// Recuperación de contraseña (RF29). Maqueta 3. Paso 1: pedir el enlace.
// Importante: la respuesta es siempre la misma exista o no el correo; nunca se revela si existe.
// Usa el formulario reutilizable de RF31 (`useFormulario`).
import { useState } from 'react'
import { Alert, Button, Input, TextLink } from '../../components/ui'
import { useFormulario } from '../../lib/useFormulario'
import { usePageTitle } from '../../lib/usePageTitle'
import { IDENTIFICADOR } from './authConfig'
import AuthCard from './AuthCard'
import { requestPasswordReset } from './authService'

function validarCorreo({ correo }) {
  const valor = correo.trim()
  if (!valor) return { correo: IDENTIFICADOR.msgVacio }
  if (!IDENTIFICADOR.regla.test(valor)) return { correo: IDENTIFICADOR.msgInvalido }
  return {}
}

export default function RecoverPasswordPage() {
  usePageTitle('Recuperar contraseña')
  const [enviado, setEnviado] = useState(false)
  const form = useFormulario({
    valoresIniciales: { correo: '' },
    validar: validarCorreo,
    traducirErrores: (fe) => ({ correo: fe.email }),
    onSubmit: async ({ correo }) => {
      await requestPasswordReset(correo.trim())
      setEnviado(true)
    },
  })

  if (enviado) {
    return (
      <AuthCard icon="checkCircle" iconClass="text-citrico" iconSize={48} title="Enlace enviado" narrow>
        <p className="mb-6 text-center text-muted">
          Si el correo está registrado, recibirás un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada.
        </p>
        <div className="text-center">
          <TextLink to="/login">← Volver al inicio de sesión</TextLink>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      icon="mail"
      title="Recuperar contraseña"
      subtitle="Ingresa tu correo corporativo y te enviaremos un enlace para restablecer tu contraseña."
      narrow
    >
      <form {...form.formProps}>
        <Input
          className="mb-5"
          label={IDENTIFICADOR.etiquetaCorporativo}
          required
          type={IDENTIFICADOR.tipoInput}
          placeholder={IDENTIFICADOR.placeholder}
          autoComplete={IDENTIFICADOR.autoComplete}
          {...form.campo('correo')}
        />
        {form.errorGeneral && (
          <div className="mb-4">
            <Alert>{form.errorGeneral}</Alert>
          </div>
        )}
        <Button type="submit" size="lg" block loading={form.enviando}>
          Enviar enlace de recuperación
        </Button>
      </form>
      <TextLink to="/login" block>
        ← Volver al inicio de sesión
      </TextLink>
    </AuthCard>
  )
}
