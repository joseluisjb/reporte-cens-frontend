// Validaciones para Reclamos Habeas Data (RF23, pantalla 13).
import { esFechaISO } from '../audit/auditValidation'

export const MSG_CLAIMS = {
  obligacion: 'Selecciona la obligación en reclamo.',
  tipologia: 'Selecciona la tipología del reclamo.',
  fechaRadicacion: 'Selecciona la fecha del reclamo.',
  fechaInvalida: 'Fecha no válida.',
  resultado: 'Selecciona el resultado del reclamo.',
  fechaCierre: 'Selecciona la fecha de cierre.',
  fechaCierreAnterior: 'La fecha de cierre no puede ser anterior a la de radicación.',
}

export function validarReclamo(valores) {
  const errores = {}

  if (!valores.obligacionId) {
    errores.obligacionId = MSG_CLAIMS.obligacion
  }

  if (!valores.tipologia?.trim()) {
    errores.tipologia = MSG_CLAIMS.tipologia
  }

  if (!valores.fechaRadicacion?.trim()) {
    errores.fechaRadicacion = MSG_CLAIMS.fechaRadicacion
  } else if (!esFechaISO(valores.fechaRadicacion.trim())) {
    errores.fechaRadicacion = MSG_CLAIMS.fechaInvalida
  }

  return errores
}

export function validarCierre(valores, reclamo) {
  const errores = {}

  if (!valores.resultado?.trim()) {
    errores.resultado = MSG_CLAIMS.resultado
  }

  if (!valores.fechaCierre?.trim()) {
    errores.fechaCierre = MSG_CLAIMS.fechaCierre
  } else if (!esFechaISO(valores.fechaCierre.trim())) {
    errores.fechaCierre = MSG_CLAIMS.fechaInvalida
  } else if (reclamo?.fechaRadicacion && valores.fechaCierre.trim() < reclamo.fechaRadicacion) {
    errores.fechaCierre = MSG_CLAIMS.fechaCierreAnterior
  }

  return errores
}
