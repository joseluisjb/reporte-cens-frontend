// Traduce los datos de la entidad ante TransUnion (RF57, contrato 0.9) al formato de la interfaz.
//   Entidad → { tipoEntidad, codigoEntidad, codigoSucursal, conMarcador, prefijoArchivo,
//               actualizadoPor (string|null), fechaActualizacion (Date|null) }
// Mientras TransUnion no asigne los datos llegan con el marcador XXX / XXX / XXXXXX y `conMarcador`
// en true: los archivos salen no aptos para envío.
export function mapEntidad(raw) {
  return {
    tipoEntidad: raw.tipo_entidad,
    codigoEntidad: raw.codigo_entidad,
    codigoSucursal: raw.codigo_sucursal,
    conMarcador: raw.con_marcador,
    prefijoArchivo: raw.prefijo_archivo,
    actualizadoPor: raw.actualizado_por ?? null,
    fechaActualizacion: raw.fecha_actualizacion ? new Date(raw.fecha_actualizacion) : null,
  }
}

// Errores del backend ({ tipo_entidad: '...' }) → nombres del formulario.
export const mapEntidadFieldErrors = (fe = {}) => ({
  tipoEntidad: fe.tipo_entidad,
  codigoEntidad: fe.codigo_entidad,
  codigoSucursal: fe.codigo_sucursal,
})
