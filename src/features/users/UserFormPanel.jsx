// Panel lateral "Crear nuevo usuario" / "Editar usuario" (RF28).
// Estructura: Johan. Formulario y validaciones: Omar. Usa el formulario reutilizable de RF31
// (`useFormulario`): validar, enfocar el primer campo inválido, errores del servidor en su campo y envío.
// Se monta solo mientras está abierto, así cada apertura empieza con el formulario limpio.
import { Alert, Button, Input, Modal, Select } from '../../components/ui'
import { useFormulario } from '../../lib/useFormulario'
import { ROLES } from '../auth/roles'
import { createUser, updateUser } from './usersService'
import { mapUserFieldErrors } from './userMapper'
import { validarUsuario } from './userValidation'

export default function UserFormPanel({ usuario, esYo = false, onClose, onGuardado }) {
  const editando = Boolean(usuario)
  const form = useFormulario({
    valoresIniciales: {
      nombre: usuario?.nombre ?? '',
      correo: usuario?.correo ?? '',
      rol: usuario?.rol ?? ROLES.ANALISTA,
    },
    orden: ['nombre', 'correo', 'rol'],
    validar: validarUsuario,
    traducirErrores: mapUserFieldErrors,
    onSubmit: async (valores) => {
      const datos = { nombre: valores.nombre.trim(), correo: valores.correo.trim(), rol: valores.rol }
      if (editando) {
        onGuardado({ usuario: await updateUser(usuario.id, datos), creado: false })
      } else {
        const { user, passwordTemporal } = await createUser(datos)
        onGuardado({ usuario: user, creado: true, passwordTemporal })
      }
    },
  })

  return (
    <Modal
      side
      open
      onClose={onClose}
      title={editando ? 'Editar usuario' : 'Crear nuevo usuario'}
      footer={
        <Button type="submit" form="form-usuario" block loading={form.enviando}>
          {editando ? 'Guardar cambios' : 'Crear usuario'}
        </Button>
      }
    >
      <form id="form-usuario" {...form.formProps}>
        <Input label="Nombre completo" required autoComplete="off" {...form.campo('nombre')} />
        <Input className="mt-5" label="Correo corporativo" required type="email" autoComplete="off" {...form.campo('correo')} />
        <Select className="mt-5" label="Rol" required disabled={esYo} {...form.campo('rol')}>
          {Object.values(ROLES).map((r) => (
            <option key={r}>{r}</option>
          ))}
        </Select>
        {esYo && <p className="mt-1.5 text-[13px] text-muted">No puedes cambiar tu propio rol.</p>}
        {!editando && (
          <p className="mt-4.5 text-[13px] text-muted">
            Se generará una contraseña temporal que el usuario deberá cambiar en su primer ingreso.
          </p>
        )}
        {form.errorGeneral && (
          <div className="mt-4">
            <Alert>{form.errorGeneral}</Alert>
          </div>
        )}
      </form>
    </Modal>
  )
}
