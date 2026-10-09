const pad = (n) => String(n).padStart(2, '0')

// 30/09/2026 08:14 (formato de la maqueta). Sin fecha devuelve "—".
export function formatearFechaHora(fecha) {
  if (!fecha) return '—'
  return `${pad(fecha.getDate())}/${pad(fecha.getMonth() + 1)}/${fecha.getFullYear()} ${pad(fecha.getHours())}:${pad(fecha.getMinutes())}`
}
