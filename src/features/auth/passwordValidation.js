import { reglasIncumplidas } from './authConfig'

export const MSG = {
  actualVacia: 'Ingresa tu contraseña temporal.',
  nuevaVacia: 'Ingresa tu nueva contraseña.',
  nuevaDebil: 'La nueva contraseña no cumple los requisitos.',
  nuevaIgualActual: 'La nueva contraseña debe ser distinta de la temporal.',
  repetirVacia: 'Confirma tu nueva contraseña.',
  noCoinciden: 'Las contraseñas no coinciden.',
}

function validarNueva({ nueva, repetir }) {
  const errores = {}
  if (!nueva) errores.nueva = MSG.nuevaVacia
  else if (reglasIncumplidas(nueva).length) errores.nueva = MSG.nuevaDebil
  if (!repetir) errores.repetir = MSG.repetirVacia
  else if (nueva !== repetir) errores.repetir = MSG.noCoinciden
  return errores
}

// Cambio obligatorio de la contraseña temporal (RF28). Devuelve { campo: 'mensaje' } o {}.
export function validarCambioPassword({ actual, nueva, repetir }) {
  const errores = {}
  if (!actual) errores.actual = MSG.actualVacia
  Object.assign(errores, validarNueva({ nueva, repetir }))
  if (!errores.nueva && nueva === actual) errores.nueva = MSG.nuevaIgualActual
  return errores
}

// Restablecer contraseña con el enlace del correo (RF29).
export const validarRestablecer = validarNueva
