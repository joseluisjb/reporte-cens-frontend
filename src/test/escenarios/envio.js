// Contrato 0.9 (RF20, RF54, RF57): registrar el envío de un corte exige que su último archivo plano sea apto
// para envío. Las pruebas de la Iteración 1 registraban el envío sin archivo; ahora dejan antes uno apto
// (FICTICIO, con los datos de entidad de prueba 001 y 123) para el corte.
import { db } from '../../mocks/db'

export function conArchivoApto(corteId) {
  const corte = db.cortes.find((c) => c.id === corteId)
  const archivo = {
    id: Math.max(0, ...db.archivos.map((a) => a.id)) + 1,
    corte_id: corteId,
    fecha_corte: corte.fecha_corte,
    nombre: `SSR001123${corte.fecha_corte.replaceAll('-', '')}`,
    tipo_reporte: '01',
    fecha_generacion: new Date().toISOString(),
    generado_por: 'Juan Pérez',
    n_registros: 1,
    total_registros: 3,
    n_excluidas: 0,
    saldo_total: 0,
    longitud_registro_tipo2: 930,
    apto_envio: true,
    motivo_no_apto: null,
    enviado: false,
    fecha_envio: null,
    estado_corte: corte.estado,
    tiene_resultados: false,
  }
  db.archivos.push(archivo)
  return archivo
}
