// Traduce el catálogo de estados de TransUnion y la homologación del SAC (RF48, contrato 0.9.1) al formato
// de la interfaz. Si el backend cambia un nombre de campo, se corrige solo aquí.
//   EstadoCatalogoTU → { codigo, nombre, usado, esCierre, confirmado }
//   HomologacionEstado → { estadoSac, prioridad, descripcion, accion ('ESTADO'|'CIERRE'|null),
//                          estadoTu (string|null), confirmado, actualizadoPor, fechaActualizacion (Date|null) }
// `accion` null = sin homologar: sus obligaciones se bloquean en la validación del corte (RF53).

export const mapEstadoTU = (raw) => ({
  codigo: raw.codigo,
  nombre: raw.nombre,
  usado: raw.usado,
  esCierre: raw.es_cierre,
  confirmado: raw.confirmado,
})

export const mapHomologacion = (raw) => ({
  estadoSac: raw.estado_sac,
  prioridad: raw.prioridad,
  descripcion: raw.descripcion ?? null,
  accion: raw.accion ?? null,
  estadoTu: raw.estado_tu ?? null,
  confirmado: raw.confirmado,
  actualizadoPor: raw.actualizado_por ?? null,
  fechaActualizacion: raw.fecha_actualizacion ? new Date(raw.fecha_actualizacion) : null,
})

// Errores del backend ({ accion: '...', estado_tu: '...' }) → nombres del formulario.
export const mapHomologacionFieldErrors = (fe = {}) => ({ accion: fe.accion, estadoTu: fe.estado_tu })
