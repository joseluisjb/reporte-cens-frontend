// Validaciones en el cliente para conceptos de energía (RF35) y grupos (RF43).
// Funciones puras: reciben valores y devuelven { [campo]: 'mensaje' } o {}.
// Coinciden con los mensajes y límites del backend y los mocks.

export function validarConcepto(valores, { editando = false } = {}) {
  const errores = {}

  if (!editando) {
    const rawCodigo = valores.codigo
    if (rawCodigo === undefined || rawCodigo === null || (typeof rawCodigo === 'string' && !rawCodigo.trim())) {
      errores.codigo = 'Ingresa el código del concepto.'
    } else {
      const entero = Number(rawCodigo)
      if (!Number.isInteger(entero) || entero < 1 || entero > 9999) {
        errores.codigo = 'El código debe ser un número entero entre 1 y 9999.'
      }
    }
  }

  const descripcion = typeof valores.descripcion === 'string' ? valores.descripcion.trim() : ''
  if (!descripcion) {
    errores.descripcion = 'Ingresa la descripción.'
  } else if (descripcion.length > 60) {
    errores.descripcion = 'La descripción admite máximo 60 caracteres.'
  }

  const observacion = typeof valores.observacion === 'string' ? valores.observacion.trim() : ''
  if (observacion.length > 200) {
    errores.observacion = 'La observación admite máximo 200 caracteres.'
  }

  return errores
}

export function validarGrupo(valores) {
  const errores = {}

  const nombre = typeof valores.nombre === 'string' ? valores.nombre.trim() : ''
  if (!nombre) {
    errores.nombre = 'Ingresa el nombre del grupo.'
  } else if (nombre.length > 60) {
    errores.nombre = 'El nombre admite máximo 60 caracteres.'
  }

  const conceptos = Array.isArray(valores.conceptos) ? valores.conceptos : []
  if (conceptos.length === 0) {
    errores.conceptos = 'Selecciona al menos un concepto.'
  } else if (new Set(conceptos).size !== conceptos.length) {
    errores.conceptos = 'No repitas conceptos.'
  }

  return errores
}
