// Rutas del backend. PROPUESTAS: Dilan (autenticación) y José Luis (usuarios) aún no las han
// implementado. Cuando las confirmen, se corrigen solo aquí. Ver README, sección "Contrato propuesto".
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
