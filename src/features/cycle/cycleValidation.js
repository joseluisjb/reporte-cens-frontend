// Validación de la fecha de corte de la actualización mensual (pantalla 10). La usan el formulario y el
// backend simulado, para que digan lo mismo. El backend además exige que sea posterior al último corte
// ENVIADO y que exista un corte en BORRADOR de esa fecha (eso solo lo sabe él: 400 y 409).
import { formatearFechaISO, pad } from '../../lib/format'

export const MSG_CICLO = {
  falta: 'Selecciona una fecha de corte.',
  invalida: 'La fecha de corte no es válida.',
  finDeMes: (sugerida) => `El corte es el último día del mes. Para ese mes sería el ${formatearFechaISO(sugerida)}.`,
  anterior: (ultimaEnviada) => `La fecha de corte debe ser posterior al último corte enviado (${formatearFechaISO(ultimaEnviada)}).`,
}

// '2026-10-31' válida (también el día: 2026-02-30 no existe) → [año, mes, día]; si no, null.
function partes(fecha) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha ?? '')
  if (!m) return null
  const [anio, mes, dia] = m.slice(1).map(Number)
  const d = new Date(Date.UTC(anio, mes - 1, dia))
  return d.getUTCFullYear() === anio && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia ? [anio, mes, dia] : null
}

// Último día del mes de la fecha ('2026-10-15' → '2026-10-31').
export function finDeMes(fecha) {
  const [anio, mes] = partes(fecha)
  return `${anio}-${pad(mes)}-${pad(new Date(Date.UTC(anio, mes, 0)).getUTCDate())}`
}

// Corte del mes siguiente ('2026-09-30' → '2026-10-31'): la fecha que propone el formulario.
export function corteSiguiente(fecha) {
  const [anio, mes] = partes(fecha)
  return finDeMes(mes === 12 ? `${anio + 1}-01-01` : `${anio}-${pad(mes + 1)}-01`)
}

// Mensaje de error de la fecha de corte, o '' si sirve.
export function errorFechaCorte(fecha) {
  const texto = typeof fecha === 'string' ? fecha.trim() : ''
  if (!texto) return MSG_CICLO.falta
  if (!partes(texto)) return MSG_CICLO.invalida
  const ultimo = finDeMes(texto)
  return ultimo === texto ? '' : MSG_CICLO.finDeMes(ultimo)
}

// Para useFormulario: { fechaCorte: mensaje } o {}.
export const validarCiclo = ({ fechaCorte }) => {
  const error = errorFechaCorte(fechaCorte)
  return error ? { fechaCorte: error } : {}
}
