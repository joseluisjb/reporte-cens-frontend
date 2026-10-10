// Gestión de usuarios (RF28). Solo Administrador: un Analista recibe 403 del backend.
// Contrato: docs/contrato/openapi.yaml (0.2). El backend aún no implementa usuarios.
import { api, ENDPOINTS } from '../../lib/api'
import { rolACodigo } from '../auth/roles'
import { mapUser } from './userMapper'

export async function listUsers() {
  const { data } = await api.get(ENDPOINTS.users)
  return data.map(mapUser)
}

// Crea el usuario; el backend genera la contraseña temporal (debe cambiarla al primer ingreso) y la
// envía por correo, así que `temporary_password` llega en null. Si algún día llegara, la pantalla la
// muestra una sola vez (respaldo).
export async function createUser({ nombre, correo, rol }) {
  const { data } = await api.post(ENDPOINTS.users, { nombre, email: correo, rol: rolACodigo(rol) })
  return { user: mapUser(data.user), passwordTemporal: data.temporary_password ?? null }
}

export async function updateUser(id, { nombre, correo, rol }) {
  const { data } = await api.patch(ENDPOINTS.user(id), { nombre, email: correo, rol: rolACodigo(rol) })
  return mapUser(data)
}

export async function setUserActive(id, activo) {
  const { data } = await api.patch(ENDPOINTS.user(id), { is_active: activo })
  return mapUser(data)
}

// Cuenta los usuarios activos para la tarjeta del inicio (RF27, solo Administrador). Es una tarjeta
// secundaria: con skipAuthRedirect un fallo (401/403) no cierra la sesión ni muestra avisos.
export async function countActiveUsers() {
  const { data } = await api.get(ENDPOINTS.users, { skipAuthRedirect: true })
  return data.map(mapUser).filter((u) => u.activo).length
}
