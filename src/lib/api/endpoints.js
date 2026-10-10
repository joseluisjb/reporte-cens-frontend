// Rutas del contrato `docs/contrato/openapi.yaml` (versión 0.2). La autenticación (Dilan) y los
// usuarios (José Luis) aún no existen en el backend; si cambian, se corrigen solo aquí.
export const ENDPOINTS = {
  csrf: '/auth/csrf/',
  login: '/auth/login/',
  logout: '/auth/logout/',
  me: '/auth/me/',
  changePassword: '/auth/change-password/',
  passwordReset: '/auth/password-reset/',
  passwordResetConfirm: '/auth/password-reset/confirm/',
  users: '/users/',
  user: (id) => `/users/${id}/`,
  // Solo existe en los mocks (modo demostración). El backend real NO lo tendrá.
  demoSwitchProfile: '/demo/switch-profile/',
}
