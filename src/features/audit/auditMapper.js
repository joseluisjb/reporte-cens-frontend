// Traduce el log de auditoría (RF30) del backend al formato que usa la interfaz.
// Si el backend cambia un nombre de campo, se corrige solo aquí.
//
//   Backend (contrato 0.6)                       Interfaz
//   RegistroAuditoria                       →    { id, fechaHora (Date), usuarioId, usuario (nombre),
//   { id, fecha_hora, usuario_id, usuario,         rol (TEXTO: 'Administrador'…), accion (texto legible),
//     rol (código), accion, tipo_accion,           tipoAccion: { codigo, descripcion }, modulo,
//     modulo, detalle }                            detalle ('' si no hay) }
//
// - `rol` llega como CÓDIGO (`ADMINISTRADOR`): se traduce con `rolATexto` (igual que los usuarios).
// - Las acciones sin usuario (la actualización mensual programada) llegan con `usuario: 'Sistema'` y con
//   `usuario_id` y `rol` en null; aquí quedan en null.
// - El detalle no trae contraseñas ni datos personales completos (lo garantiza el backend); aquí tampoco se arma nada con ellos.
import { rolATexto } from '../auth/roles'

// Valores del contrato (`TipoAccion` y `Modulo`). El backend manda el código estable; el texto es de la interfaz.
export const TIPOS_ACCION = {
  inicio_sesion: 'Inicio de sesión',
  cierre_sesion: 'Cierre de sesión',
  consulta: 'Consulta',
  calculo: 'Cálculo',
  generacion: 'Generación de archivo',
  exportacion: 'Exportación',
  modificacion: 'Modificación',
  correccion: 'Corrección',
  eliminacion: 'Eliminación',
  creacion: 'Creación',
  edicion: 'Edición',
  desactivacion: 'Desactivación',
}

export const MODULOS_AUDITORIA = ['Seguridad', 'Usuarios', 'Parametrización', 'Extracción']

// Un código desconocido se muestra tal cual: mejor ver el código que ocultar el dato.
export const descripcionTipoAccion = (codigo) => (Object.hasOwn(TIPOS_ACCION, codigo) ? TIPOS_ACCION[codigo] : codigo)

export function mapRegistroAuditoria(raw) {
  return {
    id: raw.id,
    fechaHora: new Date(raw.fecha_hora),
    usuarioId: raw.usuario_id,
    usuario: raw.usuario,
    rol: rolATexto(raw.rol), // null se queda null
    accion: raw.accion,
    tipoAccion: { codigo: raw.tipo_accion, descripcion: descripcionTipoAccion(raw.tipo_accion) },
    modulo: raw.modulo,
    detalle: raw.detalle ?? '',
  }
}

// El backend nombra `tipo_accion`; el formulario lo llama `tipoAccion`. `usuario` se queda igual (es el id).
const CAMPOS = { tipo_accion: 'tipoAccion' }

export function mapAuditFieldErrors(fieldErrors = {}) {
  return Object.fromEntries(Object.entries(fieldErrors).map(([campo, mensaje]) => [CAMPOS[campo] ?? campo, mensaje]))
}
