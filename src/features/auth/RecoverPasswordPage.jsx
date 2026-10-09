// Recuperación de contraseña (RF29). Maqueta 3. Paso 1: pedir el enlace.
// Importante: la respuesta es siempre la misma exista o no el correo; nunca se revela si existe.
import { useRef, useState } from 'react'
import { Alert, Button, Input, TextLink } from '../../components/ui'
import { usePageTitle } from '../../lib/usePageTitle'
import { IDENTIFICADOR } from './authConfig'
import AuthCard from './AuthCard'
import { requestPasswordReset } from './authService'

export default function RecoverPasswordPage() {
  usePageTitle('Recuperar contraseña')
  const [correo, setCorreo] = useState('')
  const [error, setError] = useState('')
  const [errorGeneral, setErrorGeneral] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const inputRef = useRef(null)

  const enviar = async (e) => {
    e.preventDefault()
    const valor = correo.trim()
    const invalido = !valor ? IDENTIFICADOR.msgVacio : !IDENTIFICADOR.regla.test(valor) ? IDENTIFICADOR.msgInvalido : ''
    setError(invalido)
    setErrorGeneral('')
    if (invalido) return inputRef.current?.focus()

    setEnviando(true)
    try {
      await requestPasswordReset(valor)
      setEnviado(true)
    } catch (err) {
      setErrorGeneral(err.message)
      setEnviando(false)
    }
  }

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
      <form onSubmit={enviar} noValidate>
        <Input
          ref={inputRef}
          className="mb-5"
          label={IDENTIFICADOR.etiquetaCorporativo}
          type={IDENTIFICADOR.tipoInput}
          placeholder={IDENTIFICADOR.placeholder}
          autoComplete={IDENTIFICADOR.autoComplete}
          value={correo}
          onChange={(e) => {
            setCorreo(e.target.value)
            setError('')
            setErrorGeneral('')
          }}
          error={error}
        />
        {errorGeneral && (
          <div className="mb-4">
            <Alert>{errorGeneral}</Alert>
          </div>
        )}
        <Button type="submit" size="lg" block loading={enviando}>
          Enviar enlace de recuperación
        </Button>
      </form>
      <TextLink to="/login" block>
        ← Volver al inicio de sesión
      </TextLink>
    </AuthCard>
  )
}
