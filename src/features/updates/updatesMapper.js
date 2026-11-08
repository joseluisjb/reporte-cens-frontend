// Mappers para Novedades Urgentes, Eliminaciones y Rectificaciones (RF24, RF50, RF55).
export const TIPOS_NOVEDAD = ['Inclusión', 'Actualización', 'Corrección', 'Eliminación']
export const SUJETOS_NOVEDAD = ['Obligación', 'Titular']
export const MEDIOS_RECTIFICACION = ['Actualización en Línea', 'Proceso especial masivo']

const TIPO_A_BACKEND = {
  Inclusión: 'INCLUSION',
  Actualización: 'ACTUALIZACION',
  Corrección: 'CORRECCION',
  Eliminación: 'ELIMINACION',
}

const TIPO_A_UI = {
  INCLUSION: 'Inclusión',
  ACTUALIZACION: 'Actualización',
  CORRECCION: 'Corrección',
  ELIMINACION: 'Eliminación',
}

const SUJETO_A_BACKEND = {
  Obligación: 'OBLIGACION',
  Titular: 'TITULAR',
}

const SUJETO_A_UI = {
  OBLIGACION: 'Obligación',
  TITULAR: 'Titular',
}

const ESTADO_A_UI = {
  PENDIENTE: 'Pendiente',
  GESTIONADA: 'Gestionada',
  RECHAZADA: 'Rechazada',
}

const MEDIO_A_BACKEND = {
  'Actualización en Línea': 'ACTUALIZACION_LINEA',
  'Proceso especial masivo': 'PROCESO_ESPECIAL',
}

const MEDIO_A_UI = {
  ACTUALIZACION_LINEA: 'Actualización en Línea',
  PROCESO_ESPECIAL: 'Proceso especial masivo',
}

const ORIGEN_A_UI = {
  MANUAL: 'Manual',
  AUTOMATICA: 'Automática',
}

export function mapNovedad(n) {
  if (!n) return null
  return {
    id: n.id,
    tipo: TIPO_A_UI[n.tipo] || n.tipo,
    tipoCodigo: n.tipo,
    sujeto: SUJETO_A_UI[n.sujeto] || n.sujeto,
    sujetoCodigo: n.sujeto,
    obligacionId: n.obligacion_id,
    referencia: n.referencia,
    motivo: n.motivo,
    motivoEliminacion: n.motivo_eliminacion,
    valoresEnviados: n.valores_enviados,
    fechaDeteccion: n.fecha_deteccion,
    origen: ORIGEN_A_UI[n.origen] || n.origen,
    estado: ESTADO_A_UI[n.estado] || n.estado,
    estadoCodigo: n.estado,
    numeroTransaccionTu: n.numero_transaccion_tu,
    fechaGestion: n.fecha_gestion,
    motivoRechazo: n.motivo_rechazo,
    registradaPor: n.registrada_por,
    corteId: n.corte_id,
    fechaCorte: n.fecha_corte,
    medio: MEDIO_A_UI[n.medio] || n.medio,
    campo: n.campo,
    valorAnterior: n.valor_anterior,
    valorCorregido: n.valor_corregido,
    justificacion: n.justificacion,
  }
}

export function aPeticionNovedad(valores) {
  const payload = {
    tipo: TIPO_A_BACKEND[valores.tipo] || valores.tipo,
    sujeto: SUJETO_A_BACKEND[valores.sujeto] || valores.sujeto,
    referencia: valores.referencia?.trim(),
    motivo: valores.motivo?.trim(),
  }

  if (valores.obligacionId) {
    payload.obligacion_id = Number(valores.obligacionId)
  }
  if (valores.tipo === 'Eliminación' || valores.tipo === 'ELIMINACION') {
    payload.motivo_eliminacion = valores.motivoEliminacion
  }
  if (valores.tipo === 'Corrección' || valores.tipo === 'CORRECCION') {
    if (valores.corteId) payload.corte_id = Number(valores.corteId)
    if (valores.medio) payload.medio = MEDIO_A_BACKEND[valores.medio] || valores.medio
    if (valores.campo) payload.campo = valores.campo.trim()
    if (valores.valorAnterior != null) payload.valor_anterior = String(valores.valorAnterior)
    if (valores.valorCorregido != null) payload.valor_corregido = String(valores.valorCorregido)
    if (valores.justificacion) payload.justificacion = valores.justificacion.trim()
  }
  if (valores.valoresEnviados) {
    payload.valores_enviados = valores.valoresEnviados.trim()
  }

  return payload
}

export function mapEliminacion(e) {
  if (!e) return null
  return {
    id: e.id,
    obligacionId: e.obligacion_id,
    numeroObligacion: e.numero_obligacion,
    fecha: e.fecha,
    motivo: e.motivo,
    numeroTransaccionTu: e.numero_transaccion_tu,
    bloqueada: Boolean(e.bloqueada),
    fechaActivacion: e.fecha_activacion,
    numeroActivacionTu: e.numero_activacion_tu,
  }
}

export function mapRectificacion(r) {
  if (!r) return null
  return {
    id: r.id,
    novedadId: r.novedad_id,
    obligacionId: r.obligacion_id,
    numeroObligacion: r.numero_obligacion,
    corteId: r.corte_id,
    fechaCorte: r.fecha_corte,
    campo: r.campo,
    valorAnterior: r.valor_anterior,
    valorCorregido: r.valor_corregido,
    justificacion: r.justificacion,
    medio: MEDIO_A_UI[r.medio] || r.medio,
    medioCodigo: r.medio,
    estado: r.estado === 'CONFIRMADA' ? 'Confirmada' : 'Registrada',
    estadoCodigo: r.estado,
    confirmacionTu: r.confirmacion_tu,
    registradaPor: r.registrada_por,
    fechaRegistro: r.fecha_registro,
  }
}
