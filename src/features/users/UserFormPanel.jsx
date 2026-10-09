// Panel lateral "Crear nuevo usuario" / "Editar usuario" (RF28).
// Estructura: Johan. Formulario y validaciones: Omar (puede mejorar este archivo).
// Se monta solo mientras está abierto, así cada apertura empieza con el formulario limpio.
import { useRef, useState } from 'react'
import { Alert, Button, Input, Modal, Select } from '../../components/ui'
import { ROLES } from '../auth/roles'
import { createUser, updateUser } from './usersService'
import { mapUserFieldErrors } from './userMapper'
import { validarUsuario } from './userValidation'

export default function UserFormPanel({ usuario, esYo = false, onClose, onGuardado }) {
  const editando = Boolean(usuario)
  const [valores, setValores] = useState({
    nombre: usuario?.nombre ?? '',
    correo: usuario?.correo ?? '',
    rol: usuario?.rol ?? ROLES.ANALISTA,
  })
  const [errores, setErrores] = useState({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [enviando, setEnviando] = useState(false)
  const nombreRef = useRef(null)
  const correoRef = useRef(null)
  const rolRef = useRef(null)
  const enfocar = (campo) => ({ nombre: nombreRef, correo: correoRef, rol: rolRef })[campo]?.current?.focus()

  const cambiar = (campo) => (e) => {
    setValores((v) => ({ ...v, [campo]: e.target.value }))
    setErrores((er) => ({ ...er, [campo]: undefined }))
    setErrorGeneral('')
  }

  const enviar = async (e) => {
    e.preventDefault()
    const encontrados = validarUsuario(valores)
    setErrores(encontrados)
    setErrorGeneral('')
    const primero = ['nombre', 'correo', 'rol'].find((c) => encontrados[c])
    if (primero) return enfocar(primero)

    setEnviando(true)
    try {
      const datos = { nombre: valores.nombre.trim(), correo: valores.correo.trim(), rol: valores.rol }
      if (editando) {
        const guardado = await updateUser(usuario.id, datos)
        onGuardado({ usuario: guardado, creado: false })
      } else {
        const { user, passwordTemporal } = await createUser(datos)
        onGuardado({ usuario: user, creado: true, passwordTemporal })
      }
    } catch (err) {
      const deCampo = mapUserFieldErrors(err.fieldErrors)
      setErrores(deCampo)
      if (!Object.keys(deCampo).length) setErrorGeneral(err.message)
      setEnviando(false)
      enfocar(Object.keys(deCampo)[0])
    }
  }

  return (
    <Modal
      side
      open
      onClose={onClose}
      title={editando ? 'Editar usuario' : 'Crear nuevo usuario'}
      footer={
        <Button type="submit" form="form-usuario" block loading={enviando}>
          {editando ? 'Guardar cambios' : 'Crear usuario'}
        </Button>
      }
    >
      <form id="form-usuario" onSubmit={enviar} noValidate>
        <Input ref={nombreRef} label="Nombre completo" required autoComplete="off" value={valores.nombre} onChange={cambiar('nombre')} error={errores.nombre} />
        <Input ref={correoRef} className="mt-5" label="Correo corporativo" required type="email" autoComplete="off" value={valores.correo} onChange={cambiar('correo')} error={errores.correo} />
        <Select ref={rolRef} className="mt-5" label="Rol" required value={valores.rol} onChange={cambiar('rol')} error={errores.rol} disabled={esYo}>
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
        {errorGeneral && (
          <div className="mt-4">
            <Alert>{errorGeneral}</Alert>
          </div>
        )}
      </form>
    </Modal>
  )
}
