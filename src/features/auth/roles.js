// Roles del sistema (RF27). El rol real lo define el backend; aquí solo se nombran.
export const ROLES = {
  ANALISTA: 'Analista de Cartera',
  ADMIN: 'Administrador',
}

// Códigos con que el backend nombra los roles (contrato 0.2). Dentro de la interfaz `user.rol` es el
// texto de ROLES; la traducción ocurre solo en userMapper y en los servicios.
export const CODIGOS_ROL = {
  ANALISTA: 'ANALISTA_CARTERA',
  ADMIN: 'ADMINISTRADOR',
}

// Código del backend → texto de la interfaz. Un valor desconocido se devuelve igual: así nunca
// coincide con ROLES.ADMIN por accidente (mínimo privilegio) y no se concede acceso de más.
export function rolATexto(codigo) {
  const clave = Object.keys(CODIGOS_ROL).find((k) => CODIGOS_ROL[k] === codigo)
  return clave ? ROLES[clave] : codigo
}

// Texto de la interfaz → código del backend. Un texto desconocido se envía igual: el backend responde 400.
export function rolACodigo(texto) {
  const clave = Object.keys(ROLES).find((k) => ROLES[k] === texto)
  return clave ? CODIGOS_ROL[clave] : texto
}
