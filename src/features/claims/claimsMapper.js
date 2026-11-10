// Mappers para Reclamos Habeas Data (RF23, pantalla 13).
export const RESOLUCIONES = ['Procedente', 'No procedente', 'Desistido por el titular']

export function mapReclamo(r) {
  if (!r) return null
  return {
    id: r.id,
    obligacionId: r.obligacion_id,
    numeroObligacion: r.numero_obligacion,
    nombreTitular: r.nombre_titular,
    tipologia: r.tipologia
      ? {
          codigo: r.tipologia.codigo,
          descripcion: r.tipologia.descripcion,
          confirmado: r.tipologia.confirmado ?? false,
        }
      : null,
    tipologiaCodigo: r.tipologia?.codigo ?? '',
    tipologiaDescripcion: r.tipologia?.descripcion ?? '',
    fechaRadicacion: r.fecha_radicacion,
    observacion: r.observacion || '',
    estado: r.estado === 'EN_RECLAMO' ? 'En reclamo' : 'Cerrado',
    estadoCodigo: r.estado,
    radicadoEnTu: Boolean(r.radicado_en_tu),
    fechaLimiteRespuesta: r.fecha_limite_respuesta,
    vencido: Boolean(r.vencido),
    resultado: r.resultado || '',
    fechaCierre: r.fecha_cierre || null,
    observacionCierre: r.observacion_cierre || '',
    cerradoEnArchivo: Boolean(r.cerrado_en_archivo),
    registradoPor: r.registrado_por,
    fechaRegistro: r.fecha_registro,
  }
}

export function aPeticionReclamo(valores) {
  return {
    obligacion_id: Number(valores.obligacionId),
    tipologia: String(valores.tipologia ?? '').trim(),
    fecha_radicacion: String(valores.fechaRadicacion ?? '').trim(),
    observacion: valores.observacion?.trim() || null,
  }
}

export function aPeticionCerrarReclamo(valores) {
  return {
    resultado: String(valores.resultado ?? '').trim(),
    fecha_cierre: String(valores.fechaCierre ?? '').trim(),
    observacion_cierre: valores.observacionCierre?.trim() || null,
  }
}

export function mapReclamoFieldErrors(erroresBackend = {}) {
  const mapeados = {}
  for (const [campo, mensajes] of Object.entries(erroresBackend)) {
    const primerMensaje = Array.isArray(mensajes) ? mensajes[0] : String(mensajes)
    if (campo === 'obligacion_id') mapeados.obligacionId = primerMensaje
    else if (campo === 'tipologia') mapeados.tipologia = primerMensaje
    else if (campo === 'fecha_radicacion') mapeados.fechaRadicacion = primerMensaje
    else if (campo === 'observacion') mapeados.observacion = primerMensaje
    else if (campo === 'resultado') mapeados.resultado = primerMensaje
    else if (campo === 'fecha_cierre') mapeados.fechaCierre = primerMensaje
    else if (campo === 'observacion_cierre') mapeados.observacionCierre = primerMensaje
    else mapeados[campo] = primerMensaje
  }
  return mapeados
}
