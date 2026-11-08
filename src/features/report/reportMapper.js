// Traduce los archivos planos para TransUnion (RF20, RF54, contrato 0.9) al formato de la interfaz.
// Si el backend cambia un nombre de campo, se corrige solo aquí.
//   Archivo → { id, corteId, fechaCorte ('YYYY-MM-DD'), nombre, tipoReporte, fechaGeneracion (Date),
//               generadoPor, nRegistros, totalRegistros, nExcluidas, saldoTotal, longitudRegistroTipo2,
//               aptoEnvio, motivoNoApto, enviado, fechaEnvio ('YYYY-MM-DD'|null), estadoCorte, tieneResultados }
import { soloFecha as fecha } from '../../lib/format'

export function mapArchivo(raw) {
  return {
    id: raw.id,
    corteId: raw.corte_id,
    fechaCorte: fecha(raw.fecha_corte),
    nombre: raw.nombre,
    tipoReporte: raw.tipo_reporte,
    fechaGeneracion: raw.fecha_generacion ? new Date(raw.fecha_generacion) : null,
    generadoPor: raw.generado_por ?? null,
    nRegistros: raw.n_registros,
    totalRegistros: raw.total_registros,
    nExcluidas: raw.n_excluidas,
    saldoTotal: raw.saldo_total,
    longitudRegistroTipo2: raw.longitud_registro_tipo2,
    aptoEnvio: raw.apto_envio,
    motivoNoApto: raw.motivo_no_apto ?? null,
    enviado: raw.enviado,
    fechaEnvio: fecha(raw.fecha_envio),
    estadoCorte: raw.estado_corte,
    tieneResultados: raw.tiene_resultados,
  }
}

// ValidacionesCorte (GET /extracciones/{id}/validaciones/) → { corteId, fechaCorte, estadoCorte, puedeGenerar,
// resultados: [{ regla, titulo, nivel, detalle, rf: [], porConfirmar, obligaciones: [{ id, numeroObligacion, campo, mensaje }] }] }
// `nivel`: 'ok' | 'correctiva' (bloquea) | 'advertencia' | 'informativa'.
export function mapValidaciones(raw) {
  return {
    corteId: raw.corte_id,
    fechaCorte: fecha(raw.fecha_corte),
    estadoCorte: raw.estado_corte,
    puedeGenerar: raw.puede_generar,
    resultados: raw.resultados.map((r) => ({
      regla: r.regla,
      titulo: r.titulo,
      nivel: r.nivel,
      detalle: r.detalle,
      rf: r.rf,
      porConfirmar: r.por_confirmar,
      obligaciones: r.obligaciones.map(mapObligacionReferida),
    })),
  }
}

const mapObligacionReferida = (o) => ({ id: o.obligacion_id ?? null, numeroObligacion: o.numero_obligacion, campo: o.campo ?? null, mensaje: o.mensaje })

// `errores` del 409 de validar o de generar (ReglaMensaje, contrato 0.9) → [{ regla, mensaje, id, numeroObligacion, campo }].
// Los errores sin obligación traen `id` y `numeroObligacion` en null.
export const mapErroresCorrectivos = (errores = []) =>
  errores.map((e) => ({ regla: e.regla, mensaje: e.mensaje, id: e.obligacion_id ?? null, numeroObligacion: e.numero_obligacion ?? null, campo: e.campo ?? null }))
