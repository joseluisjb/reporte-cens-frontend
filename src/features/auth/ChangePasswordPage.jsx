// Cambio obligatorio de la contraseña temporal en el primer ingreso (RF28). Maqueta 2.
// Estructura: Johan. Omar puede sustituir los campos por el formulario reutilizable de RF31;
// la validación está en passwordValidation.js y el envío en authService.changePassword.
import { useRef, useState } from 'react'
import { Alert, Button, PasswordField, useToast } from '../../components/ui'
import { usePageTitle } from '../../lib/usePageTitle'
import AuthCard from './AuthCard'
import { useAuth } from './authContext'
import PasswordRequirements from './PasswordRequirements'
import { changePassword } from './authService'
import { validarCambioPassword } from './passwordValidation'

const CAMPOS_BACKEND = { current_password: 'actual', new_password: 'nueva' }

export default function ChangePasswordPage() {
  usePageTitle('Cambio de contraseña')
  const { logout, refrescarUsuario } = useAuth()
  const toast = useToast()
  const [valores, setValores] = useState({ actual: '', nueva: '', repetir: '' })
  const [errores, setErrores] = useState({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [enviando, setEnviando] = useState(false)
  const actualRef = useRef(null)
  const nuevaRef = useRef(null)
  const repetirRef = useRef(null)
  const enfocar = (campo) => ({ actual: actualRef, nueva: nuevaRef, repetir: repetirRef })[campo]?.current?.focus()

  const cambiar = (campo) => (e) => {
    setValores((v) => ({ ...v, [campo]: e.target.value }))
    setErrores((er) => ({ ...er, [campo]: undefined }))
    setErrorGeneral('')
  }

  const enviar = async (e) => {
    e.preventDefault()
    const encontrados = validarCambioPassword(valores)
    setErrores(encontrados)
    setErrorGeneral('')
    const primero = ['actual', 'nueva', 'repetir'].find((c) => encontrados[c])
    if (primero) return enfocar(primero)

    setEnviando(true)
    try {
      await changePassword({ actual: valores.actual, nueva: valores.nueva })
      await refrescarUsuario() // la marca de primer ingreso cambia y el guard deja pasar al inicio
      toast.success('Contraseña actualizada correctamente.')
    } catch (err) {
      const deCampo = {}
      for (const [campoApi, campo] of Object.entries(CAMPOS_BACKEND)) {
        if (err.fieldErrors?.[campoApi]) deCampo[campo] = err.fieldErrors[campoApi]
      }
      setErrores(deCampo)
      if (!Object.keys(deCampo).length) setErrorGeneral(err.message)
      setEnviando(false)
      enfocar(Object.keys(deCampo)[0])
    }
  }

  return (
    <AuthCard
      icon="lock"
      title="Debes cambiar tu contraseña"
      subtitle="Por seguridad, debes definir una nueva contraseña antes de continuar."
    >
      <form onSubmit={enviar} noValidate>
        <PasswordField
          ref={actualRef}
          className="mb-4.5"
          label="Contraseña temporal"
          autoComplete="current-password"
          value={valores.actual}
          onChange={cambiar('actual')}
          error={errores.actual}
        />
        <PasswordField
          ref={nuevaRef}
          className="mb-4.5"
          label="Nueva contraseña"
          autoComplete="new-password"
          value={valores.nueva}
          onChange={cambiar('nueva')}
          error={errores.nueva}
        />
        <PasswordField
          ref={repetirRef}
          label="Confirmar nueva contraseña"
          autoComplete="new-password"
          value={valores.repetir}
          onChange={cambiar('repetir')}
          error={errores.repetir}
        />
        <PasswordRequirements password={valores.nueva} />
        {errorGeneral && (
          <div className="mb-4">
            <Alert>{errorGeneral}</Alert>
          </div>
        )}
        <Button type="submit" size="lg" block loading={enviando}>
          Guardar y continuar
        </Button>
      </form>
      <button
        type="button"
        onClick={() => logout()}
        className="mt-4 block w-full cursor-pointer text-center text-sm font-medium text-bosque hover:underline"
      >
        Cerrar sesión
      </button>
    </AuthCard>
  )
}
