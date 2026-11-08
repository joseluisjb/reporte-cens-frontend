// Validaciones para Novedades Urgentes (RF24, RF50, RF55).
export const MSG_UPDATES = {
  referencia: 'Ingresa el número de obligación o la identificación del titular.',
  motivo: 'Explica el motivo de la novedad.',
  motivoEliminacion: 'Selecciona el motivo de la eliminación (Tabla 28).',
  corte: 'Selecciona el corte a rectificar.',
  campo: 'Ingresa el campo a corregir.',
  valorCorregido: 'Ingresa el valor corregido.',
  justificacion: 'Escribe la justificación de la corrección.',
  medio: 'Selecciona el medio de actualización.',
  transaccionTu: 'Ingresa el número de confirmación de TransUnion.',
  activacionTu: 'Ingresa el número de confirmación de activación de TransUnion.',
}

export function validarNovedad(valores) {
  const errores = {}

  if (!valores.referencia?.trim()) {
    errores.referencia = MSG_UPDATES.referencia
  }

  if (!valores.motivo?.trim()) {
    errores.motivo = MSG_UPDATES.motivo
  }

  if (valores.tipo === 'Eliminación' && !valores.motivoEliminacion) {
    errores.motivoEliminacion = MSG_UPDATES.motivoEliminacion
  }

  if (valores.tipo === 'Corrección') {
    if (!valores.corteId) {
      errores.corteId = MSG_UPDATES.corte
    }
    if (!valores.campo?.trim()) {
      errores.campo = MSG_UPDATES.campo
    }
    if (valores.valorCorregido === undefined || valores.valorCorregido === null || valores.valorCorregido === '') {
      errores.valorCorregido = MSG_UPDATES.valorCorregido
    }
    if (!valores.justificacion?.trim()) {
      errores.justificacion = MSG_UPDATES.justificacion
    }
    if (!valores.medio) {
      errores.medio = MSG_UPDATES.medio
    }
  }

  return errores
}

export function validarGestion(valores) {
  const errores = {}
  if (!valores.numeroTransaccionTu?.trim()) {
    errores.numeroTransaccionTu = MSG_UPDATES.transaccionTu
  }
  return errores
}

export function validarReactivacion(valores) {
  const errores = {}
  if (!valores.numeroActivacionTu?.trim()) {
    errores.numeroActivacionTu = MSG_UPDATES.activacionTu
  }
  return errores
}
