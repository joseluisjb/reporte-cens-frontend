// Validación de los filtros del log de auditoría (RF30/RF31). Pura: recibe los valores del formulario y
// devuelve { campo: 'mensaje' } o {}. Los mensajes son los mismos que responde el contrato (400).
export const MSG_AUDIT = {
  fechaInvalida: 'Usa una fecha válida (AAAA-MM-DD).',
  hastaAnterior: 'La fecha final no puede ser anterior a la inicial.',
}

// 'YYYY-MM-DD' que además existe en el calendario (2026-02-30 no).
export function esFechaISO(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false
  const [a, m, d] = valor.split('-').map(Number)
  const fecha = new Date(Date.UTC(a, m - 1, d))
  return fecha.getUTCFullYear() === a && fecha.getUTCMonth() === m - 1 && fecha.getUTCDate() === d
}

export function validarFiltrosAuditoria({ desde = '', hasta = '' }) {
  const errores = {}
  const d = desde.trim()
  const h = hasta.trim()
  if (d && !esFechaISO(d)) errores.desde = MSG_AUDIT.fechaInvalida
  if (h && !esFechaISO(h)) errores.hasta = MSG_AUDIT.fechaInvalida
  if (!errores.desde && !errores.hasta && d && h && h < d) errores.hasta = MSG_AUDIT.hastaAnterior
  return errores
}
