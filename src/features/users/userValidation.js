import { IDENTIFICADOR } from '../auth/authConfig'
import { ROLES } from '../auth/roles'

// Validación del formulario de usuario (RF28). Devuelve { campo: 'mensaje' } o {}.
// Omar (RF31): aquí se puede reemplazar por el formulario reutilizable; el resto no cambia.
export function validarUsuario({ nombre, correo, rol }) {
  const errores = {}
  if (!nombre.trim()) errores.nombre = 'Ingresa el nombre completo.'
  const c = correo.trim()
  if (!c) errores.correo = 'Ingresa el correo corporativo.'
  else if (!IDENTIFICADOR.regla.test(c)) errores.correo = IDENTIFICADOR.msgInvalido
  if (!Object.values(ROLES).includes(rol)) errores.rol = 'Selecciona un rol.'
  return errores
}
