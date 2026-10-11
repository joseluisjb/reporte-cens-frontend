// Traduce los cortes de extracción y sus obligaciones (RF1–RF5, RF7, RF44) del backend al formato
// que usa la interfaz. Si el backend cambia un nombre de campo, se corrige solo aquí.
//
//   Backend (contrato 0.4)                          Interfaz
//   CorteResumen                               →    { id, fechaCorte ('YYYY-MM-DD'), fechaEjecucion (Date|null),
//   { id, fecha_corte, fecha_ejecucion,               grupo ({ id, nombre }|null), totalObligaciones,
//     grupo, obligaciones, saldo_consolidado,         saldoConsolidado (COP), estado, ejecutadaPor (string|null),
//     estado, ejecutada_por }                         esBorrador, esValidado, esEnviado }
//   CorteValidado                              →    { corte: <corte>, advertencias: [{ regla, mensaje }] }
//   { ...CorteResumen, advertencias }
//   ObligacionCorte                            →    { numeroObligacion, nombreTitular, identificacion (ENMASCARADA),
//   { numero_obligacion, nombre_titular,              estado: { codigo, descripcion },
//     numero_identificacion, estado_tu,               edadMora: { codigo, descripcion },
//     edad_mora, dias_mora, cuotas_mora,              diasMora, cuotasMora, valorMora, valorSaldo, nCreditos }
//     valor_mora, valor_saldo, n_creditos }
//
// - `fecha_corte` se deja como texto 'YYYY-MM-DD': con `new Date()` se correría un día en hora de
//   Colombia. Hoy el backend puede mandarla como fecha-hora (diferencia V): se toman los 10 primeros
//   caracteres. Las pantallas la muestran con `formatearFechaISO`.
// - `fecha_ejecucion` sí es fecha-hora: llega como `Date` (se muestra con `formatearFechaHora`).
// - `ejecutada_por` hoy llega siempre `null` en el backend real (diferencia Y).
// - DATO PERSONAL (Habeas Data): `numero_identificacion` ya llega enmascarado desde el backend; el
//   mapper lo vuelve a enmascarar por si acaso y NUNCA lo entrega completo a las pantallas: solo expone
//   `identificacion` enmascarada (últimos 4 dígitos).
import { enmascararIdentificacion } from '../../lib/format'
import { descripcionEdadMora, descripcionEstado } from './catalogosTU'

export function mapCorte(raw) {
  return {
    id: raw.id,
    fechaCorte: raw.fecha_corte ? String(raw.fecha_corte).slice(0, 10) : null,
    fechaEjecucion: raw.fecha_ejecucion ? new Date(raw.fecha_ejecucion) : null,
    grupo: raw.grupo ? { id: raw.grupo.id, nombre: raw.grupo.nombre } : null,
    totalObligaciones: raw.obligaciones,
    saldoConsolidado: raw.saldo_consolidado,
    estado: raw.estado,
    ejecutadaPor: raw.ejecutada_por ?? null,
    esBorrador: raw.estado === 'BORRADOR',
    esValidado: raw.estado === 'VALIDADO',
    esEnviado: raw.estado === 'ENVIADO',
  }
}

export function mapCorteValidado(raw) {
  return {
    corte: mapCorte(raw),
    advertencias: (raw.advertencias ?? []).map(({ regla, mensaje }) => ({ regla, mensaje })),
  }
}

export function mapObligacionCorte(raw) {
  return {
    numeroObligacion: raw.numero_obligacion,
    nombreTitular: raw.nombre_titular,
    identificacion: enmascararIdentificacion(raw.numero_identificacion),
    estado: { codigo: raw.estado_tu, descripcion: descripcionEstado(raw.estado_tu) },
    edadMora: { codigo: raw.edad_mora, descripcion: descripcionEdadMora(raw.edad_mora) },
    diasMora: raw.dias_mora,
    cuotasMora: raw.cuotas_mora,
    valorMora: raw.valor_mora,
    valorSaldo: raw.valor_saldo,
    nCreditos: raw.n_creditos,
  }
}

// El backend nombra los campos en snake_case; el formulario los llama en camelCase.
const CAMPOS = { fecha_corte: 'fechaCorte', grupo_id: 'grupoId', fecha_envio: 'fechaEnvio' }

export function mapCorteFieldErrors(fieldErrors = {}) {
  return Object.fromEntries(Object.entries(fieldErrors).map(([campo, mensaje]) => [CAMPOS[campo] ?? campo, mensaje]))
}
