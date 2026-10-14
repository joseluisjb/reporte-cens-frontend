// Cambio obligatorio de la contraseña temporal en el primer ingreso (RF28). Maqueta 2.
// Estructura: Johan. Usa el formulario reutilizable de RF31 (`useFormulario`); la validación está
// en passwordValidation.js y el envío en authService.changePassword.
import { Alert, Button, PasswordField, useToast } from '../../components/ui'
import { useFormulario } from '../../lib/useFormulario'
import { usePageTitle } from '../../lib/usePageTitle'
import AuthCard from './AuthCard'
import { useAuth } from './authContext'
import PasswordRequirements from './PasswordRequirements'
import { changePassword } from './authService'
import { validarCambioPassword } from './passwordValidation'

// Solo estos dos errores del servidor van a su campo; cualquier otro sale como aviso general.
const traducirErrores = (fe) => ({ actual: fe.current_password, nueva: fe.new_password })

export default function ChangePasswordPage() {
  usePageTitle('Cambio de contraseña')
  const { logout, refrescarUsuario } = useAuth()
  const toast = useToast()
  const form = useFormulario({
    valoresIniciales: { actual: '', nueva: '', repetir: '' },
    validar: validarCambioPassword,
    traducirErrores,
    onSubmit: async (valores) => {
      await changePassword({ actual: valores.actual, nueva: valores.nueva })
      await refrescarUsuario() // la marca de primer ingreso cambia y el guard deja pasar al inicio
      toast.success('Contraseña actualizada correctamente.')
    },
  })

  return (
    <AuthCard
      icon="lock"
      title="Debes cambiar tu contraseña"
      subtitle="Por seguridad, debes definir una nueva contraseña antes de continuar."
    >
      <form {...form.formProps}>
        <PasswordField
          className="mb-4.5"
          label="Contraseña temporal"
          required
          autoComplete="current-password"
          {...form.campo('actual')}
        />
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
          Guardar y continuar
        </Button>
      </form>
      <button
        type="button"
        onClick={() => logout()}
        className="mt-4 block w-full cursor-pointer text-center text-sm font-medium text-bosque-d hover:underline"
      >
        Cerrar sesión
      </button>
    </AuthCard>
  )
}
