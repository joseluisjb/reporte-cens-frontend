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
