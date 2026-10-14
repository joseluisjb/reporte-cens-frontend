// Rutas del contrato `docs/contrato/openapi.yaml` (versión 0.4). La autenticación (Dilan) y los
// usuarios (José Luis) aún no existen en el backend; si cambian, se corrigen solo aquí.
export const ENDPOINTS = {
  // Verifica que el servidor responde; sin sesión. Ya implementado en el backend.
  salud: '/salud/',
  csrf: '/auth/csrf/',
  login: '/auth/login/',
  logout: '/auth/logout/',
  me: '/auth/me/',
  changePassword: '/auth/change-password/',
  passwordReset: '/auth/password-reset/',
  passwordResetConfirm: '/auth/password-reset/confirm/',
  users: '/users/',
  user: (id) => `/users/${id}/`,
  // Conceptos de energía (RF35) y grupos de conceptos (RF43): ya implementados en el backend.
  conceptos: '/conceptos/',
  concepto: (codigo) => `/conceptos/${codigo}/`,
  gruposConceptos: '/grupos-conceptos/',
  grupoConceptos: (id) => `/grupos-conceptos/${id}/`,
  // Extracción de cartera y ciclo de corte (RF1–RF5, RF7, RF44): ya implementado en el backend.
  extracciones: '/extracciones/',
  extraccion: (id) => `/extracciones/${id}/`,
  extraccionUltima: '/extracciones/ultima/',
  validarExtraccion: (id) => `/extracciones/${id}/validar/`,
  registrarEnvio: (id) => `/extracciones/${id}/registrar-envio/`,
  obligacionesCorte: (id) => `/extracciones/${id}/obligaciones/`,
  // Auditoría (RF30). Implementado en el backend (contrato 0.6). Solo Administrador.
  auditoria: '/auditoria/',
  // Solo existe en los mocks (modo demostración). El backend real NO lo tendrá.
  demoSwitchProfile: '/demo/switch-profile/',
}
