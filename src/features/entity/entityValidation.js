// Validación pura de los datos de la entidad ante TransUnion (RF57). Mismas reglas y mensajes que el
// backend (contrato 0.9, `PUT /entidad/`): tipo y código de entidad, 3 dígitos; sucursal, 6 letras
// mayúsculas o dígitos. Mientras TransUnion no los asigne se usa el marcador del mismo largo
// (XXX, XXX, XXXXXX).
export const MARCADOR = Object.freeze({ tipoEntidad: 'XXX', codigoEntidad: 'XXX', codigoSucursal: 'XXXXXX' })

export const MSG_ENTIDAD = {
  tipoEntidad: 'El tipo de entidad debe tener 3 dígitos (o XXX mientras TransUnion no los asigne).',
  codigoEntidad: 'El código de entidad debe tener 3 dígitos (o XXX mientras TransUnion no los asigne).',
  codigoSucursal: 'El código de sucursal debe tener 6 caracteres (o XXXXXX mientras TransUnion no los asigne).',
}

const TRES_DIGITOS = /^(\d{3}|XXX)$/
const SUCURSAL = /^[A-Z0-9]{6}$/

// Como se envía: sin espacios y en mayúsculas (la sucursal admite letras).
export const normalizarEntidad = (valores) => ({
  tipoEntidad: String(valores.tipoEntidad ?? '').trim().toUpperCase(),
  codigoEntidad: String(valores.codigoEntidad ?? '').trim().toUpperCase(),
  codigoSucursal: String(valores.codigoSucursal ?? '').trim().toUpperCase(),
})

// (valores) → { campo: 'mensaje' } o {}.
export function validarEntidad(valores) {
  const v = normalizarEntidad(valores)
  const errores = {}
  if (!TRES_DIGITOS.test(v.tipoEntidad)) errores.tipoEntidad = MSG_ENTIDAD.tipoEntidad
  if (!TRES_DIGITOS.test(v.codigoEntidad)) errores.codigoEntidad = MSG_ENTIDAD.codigoEntidad
  if (!SUCURSAL.test(v.codigoSucursal)) errores.codigoSucursal = MSG_ENTIDAD.codigoSucursal
  return errores
}

export const tieneMarcador = (valor) => /^X+$/.test(valor)
