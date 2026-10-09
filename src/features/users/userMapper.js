// Traduce el usuario del backend (estilo Django) al formato que usa la interfaz.
// Si el backend cambia un nombre de campo, se corrige solo aquí.
//
//   Backend (propuesto)                         Interfaz
//   { id, nombre, email, rol, is_active,   →    { id, nombre, correo, rol, activo, estado,
//     last_login, must_change_password }          ultimoAcceso (Date|null), debeCambiarPassword }
export function mapUser(raw) {
  return {
    id: raw.id,
    nombre: raw.nombre,
    correo: raw.email,
    rol: raw.rol,
    activo: Boolean(raw.is_active),
    estado: raw.is_active ? 'Activo' : 'Inactivo',
    ultimoAcceso: raw.last_login ? new Date(raw.last_login) : null,
    debeCambiarPassword: Boolean(raw.must_change_password),
  }
}
