// Traduce conceptos y grupos de conceptos del backend (RF35 y RF43) al formato que usa la interfaz.
// Si el backend cambia un nombre de campo, se corrige solo aquí.
//
//   Backend (contrato 0.2)                        Interfaz
//   Concepto                                 →    { codigo, descripcion, activo, estado ('Activo'|'Inactivo'),
//   { codigo, descripcion, activo,                  observacion ('' si no hay), fechaCreacion (Date|null) }
//     observacion, fecha_creacion? }
//   GrupoConcepto                            →    { id, nombre, activo, estado,
//   { id, nombre, activo,                           conceptos: [{ codigo, descripcion }],
//     conceptos: [{ codigo, descripcion }],         creado ('YYYY-MM-DD' | null) }
//     creado }
//
// - `fecha_creacion` aún no existe en el backend (diferencia B del contrato): se tolera que falte y
//   la interfaz recibe `fechaCreacion: null`.
// - `creado` se deja como texto 'YYYY-MM-DD': con `new Date()` se correría un día en hora de Colombia.
//   Las pantallas lo muestran con `formatearFechaISO`.
// - El backend nombra el booleano `activo` (no `is_active` como usuarios): diferencia F.
const estadoDe = (activo) => (activo ? 'Activo' : 'Inactivo')

export function mapConcepto(raw) {
  return {
    codigo: raw.codigo,
    descripcion: raw.descripcion,
    activo: Boolean(raw.activo),
    estado: estadoDe(raw.activo),
    observacion: raw.observacion ?? '',
    fechaCreacion: raw.fecha_creacion ? new Date(raw.fecha_creacion) : null,
  }
}

export function mapGrupo(raw) {
  return {
    id: raw.id,
    nombre: raw.nombre,
    activo: Boolean(raw.activo),
    estado: estadoDe(raw.activo),
    conceptos: raw.conceptos.map(({ codigo, descripcion }) => ({ codigo, descripcion })),
    creado: raw.creado ?? null,
  }
}
