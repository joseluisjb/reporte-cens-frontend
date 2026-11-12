// Archivos planos generados (NV_ARCHIVO), FICTICIOS: los dos del ejemplo de `GET /archivos/` del
// contrato 0.9. Son una foto fija: `estado_corte` es el del ejemplo y no se recalcula con los cortes de
// la extracción (mocks/db.js), que siguen siendo los de la Iteración 1. El archivo del 31/08/2026 se
// generó con datos de entidad de prueba (001, 123), como el caso de prueba de RF57. Sus conteos cuadran
// con las obligaciones del mock a esa fecha (9 activas y la Castigada recuperada que cerró ese día), no
// con el ejemplo del contrato (9 y 11).

// Sucursal con que se generó cada archivo inicial (el contenido se arma la primera vez que se descarga).
// A1B2C3 es la sucursal de los mismos datos de prueba del contrato (001 / 123 / A1B2C3: ejemplo de
// PUT /entidad/, openapi.yaml L3362; el archivo del 31/08 «se generó con datos de entidad de prueba», L2445).
// El del 30/09 lleva el marcador XXXXXX (RF57). Son datos ficticios, no de CENS.
export const SUCURSAL_ARCHIVO_INICIAL = { 1: 'A1B2C3', 2: 'XXXXXX' }

export const archivosIniciales = () => [
  {
    id: 2,
    corte_id: 2,
    fecha_corte: '2026-09-30',
    nombre: 'SSRXXXXXX20260930',
    tipo_reporte: '01',
    fecha_generacion: '2026-10-01T09:20:00-05:00',
    generado_por: 'Juan Pérez',
    n_registros: 11,
    total_registros: 13,
    n_excluidas: 1,
    saldo_total: 21863586,
    longitud_registro_tipo2: 930,
    apto_envio: false,
    motivo_no_apto: 'Faltan los datos de la entidad ante TransUnion: el archivo sería rechazado.',
    enviado: false,
    fecha_envio: null,
    estado_corte: 'VALIDADO',
    tiene_resultados: false,
  },
  {
    id: 1,
    corte_id: 1,
    fecha_corte: '2026-08-31',
    nombre: 'SSR00112320260831',
    tipo_reporte: '01',
    fecha_generacion: '2026-09-01T09:20:00-05:00',
    generado_por: 'Carlos Sánchez',
    n_registros: 10,
    total_registros: 12,
    n_excluidas: 0,
    saldo_total: 19844130,
    longitud_registro_tipo2: 930,
    apto_envio: true,
    motivo_no_apto: null,
    enviado: true,
    fecha_envio: '2026-09-02',
    estado_corte: 'ENVIADO_CON_INCONSISTENCIAS',
    tiene_resultados: true,
  },
]
