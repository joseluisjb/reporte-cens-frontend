// Validación del registro manual de una refinanciación (pantalla 11, RF18). La usan el formulario y el
// backend simulado, para que digan lo mismo. El backend además comprueba que la obligación exista
// (404), que siga abierta y que la matriz permita cerrarla (409).
import { hoyISO } from '../../lib/format'

export const CUOTAS_MIN = 1
export const CUOTAS_MAX = 120

export const MSG_REFI = {
  obligacion: 'Selecciona la obligación original.',
  naturaleza: 'Selecciona la naturaleza de la reestructuración.',
  cuotas: `Ingresa un número de cuotas entre ${CUOTAS_MIN} y ${CUOTAS_MAX}.`,
  fecha: 'Selecciona la fecha de la refinanciación.',
  fechaInvalida: 'La fecha de la refinanciación no es válida.',
  fechaFutura: 'La fecha de la refinanciación no puede ser futura.',
}

// Cómo se cierra la original (RF18): en 07 si estaba en Dudoso recaudo (03) o Castigada (06), si no en
// 02. Desde 03 y 06 está por confirmar con TransUnion (P-TU-06).
export const ESTADOS_QUE_CIERRAN_EN_07 = ['03', '06']
export const estadoDeCierre = (estadoOriginal) => (ESTADOS_QUE_CIERRAN_EN_07.includes(estadoOriginal) ? '07' : '02')

const esFecha = (texto) => /^\d{4}-\d{2}-\d{2}$/.test(texto) && !Number.isNaN(Date.parse(texto))

// Entero en el rango, como texto del campo ('24') o número (24); si no, null.
export function cuotasValidas(valor) {
  const texto = String(valor ?? '').trim()
  if (!/^\d{1,3}$/.test(texto)) return null
  const n = Number(texto)
  return n >= CUOTAS_MIN && n <= CUOTAS_MAX ? n : null
}

export function errorFechaRefinanciacion(fecha, hoy = hoyISO()) {
  const texto = typeof fecha === 'string' ? fecha.trim() : ''
  if (!texto) return MSG_REFI.fecha
  if (!esFecha(texto)) return MSG_REFI.fechaInvalida
  return texto > hoy ? MSG_REFI.fechaFutura : ''
}

// Para useFormulario: { campo: mensaje } o {}.
export function validarRefinanciacion({ obligacionOriginalId, naturaleza, numeroCuotas, fecha }) {
  const errores = {}
  if (!obligacionOriginalId) errores.obligacionOriginalId = MSG_REFI.obligacion
  if (!naturaleza) errores.naturaleza = MSG_REFI.naturaleza
  if (cuotasValidas(numeroCuotas) === null) errores.numeroCuotas = MSG_REFI.cuotas
  const errorFecha = errorFechaRefinanciacion(fecha)
  if (errorFecha) errores.fecha = errorFecha
  return errores
}
