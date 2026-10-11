// Configuración de autenticación en UN solo lugar.
// Cambiar el login de "correo" a "usuario" es editar IDENTIFICADOR; ninguna pantalla repite estos textos.

export const IDENTIFICADOR = {
  campo: 'email', // PROPUESTO: nombre del campo que se envía al backend (confirmar con Dilan)
  etiqueta: 'Correo electrónico',
  etiquetaCorporativo: 'Correo electrónico corporativo',
  placeholder: 'nombre@example.com',
  tipoInput: 'email',
  autoComplete: 'username',
  regla: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  msgVacio: 'Ingresa tu correo electrónico.',
  msgInvalido: 'Ingresa un correo válido, por ejemplo nombre@example.com.',
}

export const MSG_CREDENCIALES = 'Usuario o contraseña incorrectos.'

// Motivos por los que se vuelve al login sin que el usuario lo haya pedido. Se muestran en el login.
export const MSG_SALIDA = {
  inactividad: 'Tu sesión se cerró por inactividad. Inicia sesión de nuevo.',
  expirada: 'Tu sesión expiró. Inicia sesión de nuevo.',
}

// Reglas de contraseña de la maqueta (pantalla de cambio obligatorio). Confirmar con José Luis.
export const REGLAS_PASSWORD = [
  { id: 'largo', texto: 'Mínimo 8 caracteres', cumple: (p) => p.length >= 8 },
  { id: 'mayuscula', texto: 'Al menos una letra mayúscula', cumple: (p) => /[A-ZÁÉÍÓÚÑ]/.test(p) },
  { id: 'numero', texto: 'Al menos un número', cumple: (p) => /\d/.test(p) },
]

// Devuelve los textos de las reglas que NO se cumplen (lista vacía = contraseña válida).
export const reglasIncumplidas = (password) =>
  REGLAS_PASSWORD.filter((r) => !r.cumple(password)).map((r) => r.texto)
