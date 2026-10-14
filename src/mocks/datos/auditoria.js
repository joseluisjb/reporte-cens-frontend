// Registros de auditoría FICTICIOS (RF30) para el backend simulado. Forma = `RegistroAuditoria` del contrato 0.6.
// Solo usan las acciones que registra el backend real (`EVENTOS` de config/bitacora.py), con sus textos y el
// formato de su `detalle`. Por eso no hay `generacion`, `exportacion` ni `correccion`: nadie las produce
// todavía (Iteración 2). El cierre de sesión siempre dice "Cierre manual", también por inactividad (diferencia AF).
// La actualización mensual programada llega como "Sistema", con `usuario_id` y `rol` en null.
// El `detalle` nunca lleva contraseñas ni datos de deudores (es lo que garantiza el contrato).
// Se generan ordenados del más antiguo al más reciente (id ascendente); el mock los entrega al revés.
import { CODIGOS_ROL } from '../../features/auth/roles'

// Mismos usuarios que mocks/db.js (id, nombre, rol).
const U = {
  juan: { id: 1, nombre: 'Juan Pérez', rol: CODIGOS_ROL.ANALISTA },
  rosa: { id: 2, nombre: 'Rosa Martínez', rol: CODIGOS_ROL.ADMIN },
  carlos: { id: 3, nombre: 'Carlos Sánchez', rol: CODIGOS_ROL.ANALISTA },
  pablo: { id: 5, nombre: 'Pablo Rincón', rol: CODIGOS_ROL.ADMIN },
  diana: { id: 6, nombre: 'Diana Niño', rol: CODIGOS_ROL.ANALISTA },
  sistema: { id: null, nombre: 'Sistema', rol: null },
}

// [fecha y hora (Bogotá), usuario, acción legible, tipo_accion, módulo, detalle]
const FILAS = [
  ['2026-09-28T07:55:00', U.pablo, 'Inicio de sesión', 'inicio_sesion', 'Seguridad', 'Acceso correcto'],
  ['2026-09-28T08:03:00', U.pablo, 'Usuario creado', 'creacion', 'Usuarios', 'Usuario dnino@example.com creado con rol ANALISTA_CARTERA'],
  ['2026-09-28T08:20:00', U.rosa, 'Inicio de sesión', 'inicio_sesion', 'Seguridad', 'Acceso correcto'],
  ['2026-09-28T08:41:00', U.rosa, 'Concepto creado', 'creacion', 'Parametrización', ''],
  ['2026-09-28T09:10:00', U.diana, 'Inicio de sesión', 'inicio_sesion', 'Seguridad', 'Acceso correcto'],
  ['2026-09-28T09:12:00', U.diana, 'Contraseña cambiada', 'edicion', 'Seguridad', ''],
  ['2026-09-28T17:30:00', U.rosa, 'Cierre de sesión', 'cierre_sesion', 'Seguridad', 'Cierre manual'],
  ['2026-09-29T07:58:00', U.juan, 'Inicio de sesión', 'inicio_sesion', 'Seguridad', 'Acceso correcto'],
  ['2026-09-29T08:12:00', U.juan, 'Consulta de deudores', 'consulta', 'Extracción', ''],
  ['2026-09-29T08:30:00', U.juan, 'Corte generado', 'calculo', 'Extracción', 'Fecha de corte 2026-08-31'],
  ['2026-09-29T08:45:00', U.juan, 'Corte validado', 'modificacion', 'Extracción', 'Fecha de corte 2026-08-31'],
  ['2026-09-29T09:40:00', U.juan, 'Envío registrado', 'modificacion', 'Extracción', 'Fecha de corte 2026-08-31'],
  ['2026-09-29T10:15:00', U.carlos, 'Inicio de sesión', 'inicio_sesion', 'Seguridad', 'Acceso correcto'],
  ['2026-09-29T10:32:00', U.carlos, 'Consulta de obligaciones', 'consulta', 'Extracción', ''],
  ['2026-09-29T11:00:00', U.carlos, 'Consulta de reporte enviado', 'consulta', 'Extracción', 'Fecha de corte 2026-08-31'],
  ['2026-09-29T11:45:00', U.rosa, 'Concepto editado', 'edicion', 'Parametrización', 'Campos: descripcion'],
  ['2026-09-29T12:05:00', U.rosa, 'Grupo de conceptos creado', 'creacion', 'Parametrización', ''],
  ['2026-09-29T12:20:00', U.rosa, 'Concepto desactivado', 'desactivacion', 'Parametrización', 'Campos: activo'],
  ['2026-09-29T17:40:00', U.carlos, 'Cierre de sesión', 'cierre_sesion', 'Seguridad', 'Cierre manual'],
  ['2026-09-30T07:51:00', U.pablo, 'Inicio de sesión', 'inicio_sesion', 'Seguridad', 'Acceso correcto'],
  ['2026-09-30T08:14:00', U.juan, 'Inicio de sesión', 'inicio_sesion', 'Seguridad', 'Acceso correcto'],
  ['2026-09-30T08:20:00', U.pablo, 'Usuario editado', 'edicion', 'Usuarios', "Usuario csanchez@example.com actualizado: ['nombre']"],
  ['2026-09-30T08:35:00', U.pablo, 'Usuario desactivado', 'desactivacion', 'Usuarios', "Usuario avargas@example.com actualizado: ['is_active']"],
  ['2026-09-30T09:02:00', U.rosa, 'Inicio de sesión', 'inicio_sesion', 'Seguridad', 'Acceso correcto'],
  ['2026-09-30T09:18:00', U.rosa, 'Grupo de conceptos eliminado', 'eliminacion', 'Parametrización', ''],
  ['2026-09-30T09:50:00', U.juan, 'Corte generado', 'calculo', 'Extracción', 'Fecha de corte 2026-09-30'],
  ['2026-09-30T10:05:00', U.juan, 'Corte eliminado', 'eliminacion', 'Extracción', 'Fecha: 2026-09-30, Grupo: Energía financiada'],
  ['2026-09-30T10:22:00', U.diana, 'Inicio de sesión', 'inicio_sesion', 'Seguridad', 'Acceso correcto'],
  ['2026-09-30T10:40:00', U.diana, 'Consulta de historial de deudor', 'consulta', 'Extracción', ''],
  ['2026-09-30T16:58:00', U.juan, 'Cierre de sesión', 'cierre_sesion', 'Seguridad', 'Cierre manual'],
  ['2026-10-01T02:00:00', U.sistema, 'Actualización mensual', 'calculo', 'Extracción', 'Obligaciones: 412, Saldo: 9876500.00, Grupo: todos'],
  ['2026-10-01T07:40:00', U.juan, 'Inicio de sesión', 'inicio_sesion', 'Seguridad', 'Acceso correcto'],
  ['2026-10-01T07:44:00', U.juan, 'Corte generado', 'calculo', 'Extracción', 'Fecha de corte 2026-09-30'],
  ['2026-10-01T08:05:00', U.pablo, 'Contraseña restablecida', 'edicion', 'Seguridad', 'Restablecimiento con enlace del correo'],
  ['2026-10-01T08:30:00', U.rosa, 'Inicio de sesión', 'inicio_sesion', 'Seguridad', 'Acceso correcto'],
  ['2026-10-01T08:52:00', U.rosa, 'Grupo de conceptos editado', 'edicion', 'Parametrización', 'Campos: nombre, conceptos'],
  ['2026-10-02T08:00:00', U.rosa, 'Usuario creado', 'creacion', 'Usuarios', 'Usuario mgomez@example.com creado con rol ANALISTA_CARTERA'],
  ['2026-10-02T08:10:00', U.rosa, 'Usuario activado', 'edicion', 'Usuarios', "Usuario dnino@example.com actualizado: ['is_active']"],
  ['2026-10-05T07:59:00', U.carlos, 'Inicio de sesión', 'inicio_sesion', 'Seguridad', 'Acceso correcto'],
  ['2026-10-05T08:25:00', U.carlos, 'Consulta de obligaciones', 'consulta', 'Extracción', ''],
  ['2026-10-06T08:15:00', U.pablo, 'Inicio de sesión', 'inicio_sesion', 'Seguridad', 'Acceso correcto'],
  ['2026-10-06T08:33:00', U.pablo, 'Concepto editado', 'edicion', 'Parametrización', 'Campos: observacion'],
  ['2026-10-06T08:40:00', U.pablo, 'Grupo de conceptos desactivado', 'desactivacion', 'Parametrización', 'Campos: activo'],
  ['2026-10-07T09:00:00', U.juan, 'Inicio de sesión', 'inicio_sesion', 'Seguridad', 'Acceso correcto'],
  ['2026-10-07T09:20:00', U.juan, 'Consulta de deudores', 'consulta', 'Extracción', ''],
  ['2026-10-08T02:00:00', U.sistema, 'Actualización mensual', 'calculo', 'Extracción', 'Obligaciones: 418, Saldo: 9912300.00, Grupo: todos'],
  ['2026-10-08T08:05:00', U.diana, 'Inicio de sesión', 'inicio_sesion', 'Seguridad', 'Acceso correcto'],
  ['2026-10-08T08:30:00', U.diana, 'Consulta de reporte enviado', 'consulta', 'Extracción', 'Fecha de corte 2026-09-30'],
  ['2026-10-09T08:00:00', U.rosa, 'Inicio de sesión', 'inicio_sesion', 'Seguridad', 'Acceso correcto'],
  ['2026-10-09T08:12:00', U.rosa, 'Concepto editado', 'edicion', 'Parametrización', 'Campos: descripcion, activo'],
  ['2026-10-09T17:20:00', U.rosa, 'Cierre de sesión', 'cierre_sesion', 'Seguridad', 'Cierre manual'],
]

// RegistroAuditoria[] (claves en el orden del contrato), del más antiguo al más reciente.
export function registrosAuditoria() {
  return FILAS.map(([fecha, u, accion, tipo, modulo, detalle], i) => ({
    id: i + 1,
    fecha_hora: `${fecha}-05:00`,
    usuario_id: u.id,
    usuario: u.nombre,
    rol: u.rol,
    accion,
    tipo_accion: tipo,
    modulo,
    detalle,
  }))
}

export const TOTAL_REGISTROS_AUDITORIA = FILAS.length
