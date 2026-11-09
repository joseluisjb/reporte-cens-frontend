// Traduce las obligaciones de la Iteración 2 (pantalla 9, contrato 0.9) del backend al formato de la
// interfaz (camelCase). Si el backend cambia un nombre de campo, se corrige solo aquí.
//
//   ObligacionResumen   → { id, numeroObligacion, nombreTitular, identificacion (ENMASCARADA), estado, edadMora,
//                           diasMora, cuotasMora, valorMora, valorSaldo, cerrada, primerReporte, caducado,
//                           enReclamo, eliminada, requiereRevision }
//   ObligacionDetalle   → lo anterior + concepto, valores (RF52), exigibilidad (RF49), cierre, pagoMora,
//                           reestructuracion, refinanciadaEn, cuotasVencidas, pagos, posiblesTransiciones…
//   ResumenObligaciones → { fechaUltimoCiclo, total, abiertas, porEstado, eliminadas, porCuotasMora, financiacionesNuevas }
//   EventoObligacion    → { fecha, estado, edadMora, descripcion }
//
// - Las fechas ('YYYY-MM-DD') se dejan como texto: con `new Date()` se correrían un día en Colombia.
//   Se muestran con `formatearFechaISO`.
// - `estado` y `edadMora` llegan como { codigo, descripcion } (Tabla 4b y Tabla 9 de catalogosTU).
// - DATO PERSONAL (Habeas Data): `numero_identificacion` llega enmascarado; se vuelve a enmascarar y
//   NUNCA se entrega completo a las pantallas.
import { enmascararIdentificacion, soloFecha as fecha } from '../../lib/format'
import { descripcionEdadMora, descripcionEstado } from '../transunion/catalogosTU'

const conDescripcion = (codigo, describir) => (codigo ? { codigo, descripcion: describir(codigo) } : null)
const estado = (codigo) => conDescripcion(codigo, descripcionEstado)
const edadMora = (codigo) => conDescripcion(codigo, descripcionEdadMora)
const referencia = (raw) => (raw ? { id: raw.obligacion_id, numeroObligacion: raw.numero_obligacion } : null)
const codigoDescripcion = (raw) => (raw ? { codigo: raw.codigo, descripcion: raw.descripcion } : null)

export function mapObligacionResumen(raw) {
  return {
    id: raw.obligacion_id,
    numeroObligacion: raw.numero_obligacion,
    nombreTitular: raw.nombre_titular,
    identificacion: enmascararIdentificacion(raw.numero_identificacion),
    estado: estado(raw.estado_tu),
    edadMora: edadMora(raw.edad_mora),
    diasMora: raw.dias_mora,
    cuotasMora: raw.cuotas_mora,
    valorMora: raw.valor_mora,
    valorSaldo: raw.valor_saldo,
    cerrada: raw.cerrada,
    primerReporte: raw.primer_reporte,
    caducado: raw.caducado,
    enReclamo: raw.en_reclamo,
    eliminada: raw.eliminada,
    requiereRevision: raw.requiere_revision,
  }
}

function mapCierre(raw) {
  if (!raw) return null
  return {
    fechaCorte: fecha(raw.fecha_corte),
    fechaPago: fecha(raw.fecha_pago),
    modoExtincion: codigoDescripcion(raw.modo_extincion),
    tipoPago: codigoDescripcion(raw.tipo_pago),
  }
}

function mapPagoMora(raw) {
  if (!raw) return null
  return {
    fechaPago: fecha(raw.fecha_pago),
    modoExtincion: codigoDescripcion(raw.modo_extincion),
    tipoPago: codigoDescripcion(raw.tipo_pago),
    valorRealPagado: raw.valor_real_pagado,
  }
}

function mapReestructuracion(raw) {
  if (!raw) return null
  return {
    numeroReestructuraciones: raw.numero_reestructuraciones,
    naturaleza: { ...codigoDescripcion(raw.naturaleza), confirmado: raw.naturaleza.confirmado },
    obligacionAnterior: referencia(raw.obligacion_anterior),
  }
}

export function mapObligacionDetalle(raw) {
  return {
    ...mapObligacionResumen(raw),
    motivoRevision: raw.motivo_revision ?? null,
    concepto: { codigo: raw.concepto.codigo, descripcion: raw.concepto.descripcion ?? null },
    fechaIngreso: fecha(raw.fecha_ingreso),
    valorInicial: raw.valor_inicial,
    valorCuota: raw.valor_cuota,
    valorCuotaAntesCierre: raw.valor_cuota_antes_cierre ?? null,
    fechaExigibilidad: fecha(raw.fecha_exigibilidad),
    aniosMora: raw.anios_mora ?? null,
    atrasosPermitidos: raw.atrasos_permitidos,
    cuotasAtrasadas: raw.cuotas_atrasadas,
    cierre: mapCierre(raw.cierre),
    pagoMora: mapPagoMora(raw.pago_mora),
    reestructuracion: mapReestructuracion(raw.reestructuracion),
    refinanciadaEn: referencia(raw.refinanciada_en),
    movimientoPosteriorCierre: raw.movimiento_posterior_cierre,
    cuotasVencidas: raw.cuotas_vencidas.map((c) => ({ fechaVencimiento: fecha(c.fecha_vencimiento), valorPendiente: c.valor_pendiente, dias: c.dias })),
    pagos: raw.pagos.map((p) => ({ fechaCorte: fecha(p.fecha_corte), valor: p.valor, aplicadoA: p.aplicado_a, nota: p.nota ?? null })),
    posiblesTransiciones: raw.posibles_transiciones.map((r) => ({ rf: r.rf, texto: r.texto, porConfirmar: r.por_confirmar })),
    advertencias: raw.advertencias.map((a) => ({ regla: a.regla, mensaje: a.mensaje })),
  }
}

export function mapResumenCartera(raw) {
  const cuotas = raw.por_cuotas_mora
  return {
    fechaUltimoCiclo: fecha(raw.fecha_ultimo_ciclo),
    total: raw.total,
    abiertas: raw.abiertas,
    porEstado: raw.por_estado.map(mapConteoEstado),
    eliminadas: raw.eliminadas,
    porCuotasMora: { alDia: cuotas.al_dia, una: cuotas.una, dosATres: cuotas.dos_a_tres, cuatroOMas: cuotas.cuatro_o_mas },
    financiacionesNuevas: raw.financiaciones_nuevas.map((f) => ({ numeroObligacion: f.numero_obligacion, nombreTitular: f.nombre_titular })),
  }
}

export function mapEventoObligacion(raw) {
  return { fecha: fecha(raw.fecha), estado: estado(raw.estado_tu), edadMora: edadMora(raw.edad_mora), descripcion: raw.descripcion }
}

// Errores de los filtros de `GET /obligaciones/` → nombres que usa `listObligations`. La paginación
// inválida no llega por campo sino como `{ detail }` (contrato 0.9.3).
export const mapObligacionesFieldErrors = (fe = {}) => ({
  estado: fe.estado_tu,
  eliminadas: fe.eliminada,
  abierta: fe.abierta,
  cuotasMoraMin: fe.cuotas_mora_min,
  q: fe.q,
})

// ConteoEstado { estado_tu, cantidad } → { estado: { codigo, descripcion }, cantidad } (pantalla 9 y panel).
export const mapConteoEstado = (c) => ({ estado: estado(c.estado_tu), cantidad: c.cantidad })
