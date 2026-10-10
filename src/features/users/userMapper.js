// Traduce el usuario del backend (estilo Django) al formato que usa la interfaz.
// Si el backend cambia un nombre de campo, se corrige solo aquí.
//
//   Backend (contrato 0.2)                      Interfaz
//   { id, nombre, email, rol (código),     →    { id, nombre, correo, rol (texto), activo, estado,
//     is_active, last_login,                      ultimoAcceso (Date|null), debeCambiarPassword }
//     must_change_password }
// El rol llega como código (`ANALISTA_CARTERA`) y la interfaz usa el texto de ROLES (ver roles.js).
import { rolATexto } from '../auth/roles'

export function mapUser(raw) {
  return {
    id: raw.id,
    nombre: raw.nombre,
    correo: raw.email,
    rol: rolATexto(raw.rol),
    activo: Boolean(raw.is_active),
    estado: raw.is_active ? 'Activo' : 'Inactivo',
    ultimoAcceso: raw.last_login ? new Date(raw.last_login) : null,
    debeCambiarPassword: Boolean(raw.must_change_password),
  }
}

// El backend nombra el campo `email`; el formulario lo llama `correo`.
export function mapUserFieldErrors(fieldErrors = {}) {
  const { email, ...resto } = fieldErrors
  return email ? { ...resto, correo: email } : resto
}
