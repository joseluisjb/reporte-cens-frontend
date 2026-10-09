import { IDENTIFICADOR } from './authConfig'

export const MSG_PASSWORD_VACIA = 'Ingresa tu contraseña.'

// Valida el formulario de login antes de enviarlo (RF31). Devuelve { campo: 'mensaje' } o {}.
export function validarLogin({ identificador, password }) {
  const errores = {}
  const id = identificador.trim()
  if (!id) errores.identificador = IDENTIFICADOR.msgVacio
  else if (!IDENTIFICADOR.regla.test(id)) errores.identificador = IDENTIFICADOR.msgInvalido
  if (!password) errores.password = MSG_PASSWORD_VACIA
  return errores
}
