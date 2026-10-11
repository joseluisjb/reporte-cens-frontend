const pad = (n) => String(n).padStart(2, '0')

// 30/09/2026 08:14 (formato de la maqueta). Sin fecha devuelve "—".
export function formatearFechaHora(fecha) {
  if (!fecha) return '—'
  return `${pad(fecha.getDate())}/${pad(fecha.getMonth() + 1)}/${fecha.getFullYear()} ${pad(fecha.getHours())}:${pad(fecha.getMinutes())}`
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const partesISO = (iso) => iso.split('-').map(Number) // '2026-09-30' → [2026, 9, 30]

// 1276016 → $1.276.016 (pesos colombianos, sin decimales, como la maqueta)
export const formatearCOP = (n) => '$' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')

// '2026-09-30' o Date → 30/09/2026. Sin fecha o nulo devuelve "—".
export function formatearFechaISO(iso) {
  if (!iso) return '—'
  if (iso instanceof Date) {
    if (isNaN(iso.getTime())) return '—'
    return `${pad(iso.getDate())}/${pad(iso.getMonth() + 1)}/${iso.getFullYear()}`
  }
  const str = String(iso).slice(0, 10)
  if (!str.includes('-')) return '—'
  const [a, m, d] = partesISO(str)
  if (!a || !m || !d) return '—'
  return `${pad(d)}/${pad(m)}/${a}`
}

// Fecha de hoy en hora local como 'YYYY-MM-DD' (evita que toISOString corra de día después de las 7 p. m. por UTC).
export function hoyISO() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// '2026-09-30' → 30 de septiembre de 2026
export function formatearFechaISOLarga(iso) {
  const [a, m, d] = partesISO(iso)
  return `${d} de ${MESES[m - 1]} de ${a}`
}

// plural(1, 'obligación', 'obligaciones') → '1 obligación'
export const plural = (n, singular, plural) => `${n} ${n === 1 ? singular : plural}`

// '1000000001' → '******0001'. Dato personal (Habeas Data): solo se ven los últimos 4 dígitos.
// Con 4 caracteres o menos se oculta todo; sin valor devuelve "—".
export function enmascararIdentificacion(numero) {
  const texto = String(numero ?? '').trim()
  if (!texto) return '—'
  if (texto.length <= 4) return '*'.repeat(texto.length)
  return '*'.repeat(texto.length - 4) + texto.slice(-4)
}
