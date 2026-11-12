// Novedades urgentes, eliminaciones y rectificaciones (RF24, RF50, RF55) de la Iteración 2.
// Datos FICTICIOS tomados del mockup v3 (docs/iteracion2/NexoVolt_Mockups_Iteracion2_v3.html).
// La corrección n2 guarda su corte, medio y valores en la rectificación 1 (novedad_id: 2), como el contrato.
import { CATALOGOS } from './catalogos'

export const novedadesIniciales = () => [
  {
    id: 1,
    tipo: 'ACTUALIZACION',
    sujeto: 'OBLIGACION',
    obligacion_id: 4,
    referencia: '2260-5543',
    motivo: 'Pago del titular posterior al corte: se actualiza sin esperar al próximo reporte',
    motivo_eliminacion: null,
    valores_enviados: null,
    fecha_deteccion: '2026-09-29',
    origen: 'AUTOMATICA',
    estado: 'PENDIENTE',
    numero_transaccion_tu: null,
    fecha_gestion: null,
    motivo_rechazo: null,
    registrada_por: null,
  },
  {
    id: 2,
    tipo: 'CORRECCION',
    sujeto: 'OBLIGACION',
    obligacion_id: 2,
    referencia: '2258-7731',
    motivo: 'El corte 31/08/2026 reportó un valor en mora errado (rectificación)',
    motivo_eliminacion: null,
    valores_enviados: null,
    fecha_deteccion: '2026-09-30',
    origen: 'MANUAL',
    estado: 'PENDIENTE',
    numero_transaccion_tu: null,
    fecha_gestion: null,
    motivo_rechazo: null,
    registrada_por: 'Juan Pérez',
  },
  {
    id: 3,
    tipo: 'ACTUALIZACION',
    sujeto: 'OBLIGACION',
    obligacion_id: 6,
    referencia: '2262-3318',
    motivo: 'Cambio de dirección de contacto del titular',
    motivo_eliminacion: null,
    valores_enviados: null,
    fecha_deteccion: '2026-09-24',
    origen: 'MANUAL',
    estado: 'GESTIONADA',
    numero_transaccion_tu: 'TU-AL-001532',
    fecha_gestion: '2026-09-24',
    motivo_rechazo: null,
    registrada_por: 'Carlos Sánchez',
  },
]

export const eliminacionesIniciales = () => [
  {
    id: 1,
    // 2249-1180 no está entre las 12 obligaciones del mockup (ya se eliminó): sin obligacion_id, como
    // el ejemplo del contrato. Motivo 14 de la Tabla 28 («reportada por error» en el mockup v3, L708).
    obligacion_id: null,
    numero_obligacion: '2249-1180',
    fecha: '2026-09-15',
    motivo: CATALOGOS['motivos-eliminacion']?.find((m) => m.codigo === '14') ?? {
      codigo: '14',
      descripcion: 'Por error entidad',
    },
    numero_transaccion_tu: 'TU-AL-001198',
    bloqueada: true,
    fecha_activacion: null,
    numero_activacion_tu: null,
  },
]

export const rectificacionesIniciales = () => [
  {
    id: 1,
    novedad_id: 2,
    obligacion_id: 2,
    numero_obligacion: '2258-7731',
    corte_id: 1,
    fecha_corte: '2026-08-31',
    campo: 'valor_mora',
    valor_anterior: '140000',
    valor_corregido: '70000',
    justificacion: 'El corte 31/08/2026 reportó un valor en mora errado.',
    medio: 'ACTUALIZACION_LINEA',
    estado: 'REGISTRADA',
    confirmacion_tu: null,
    registrada_por: 'Juan Pérez',
    fecha_registro: '2026-09-30T11:00:00-05:00',
  },
]
