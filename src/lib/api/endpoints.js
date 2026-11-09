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
  // Iteración 2 · propuesto (contrato 0.9): el backend aún no los tiene; hoy responden los mocks.
  // Pendientes en docs/PENDIENTES_BACKEND.md, sección 5.
  obligaciones: '/obligaciones/', // propuesto (contrato 0.9) · solo Analista
  obligacionesResumen: '/obligaciones/resumen/', // propuesto (contrato 0.9) · solo Analista
  obligacion: (id) => `/obligaciones/${id}/`, // propuesto (contrato 0.9) · solo Analista
  obligacionLineaTiempo: (id) => `/obligaciones/${id}/linea-tiempo/`, // propuesto (contrato 0.9) · solo Analista
  catalogo: (nombre) => `/catalogos/${nombre}/`, // propuesto (contrato 0.9) · los dos roles
  panelResumen: '/panel/resumen/', // propuesto (contrato 0.9) · solo Analista
  entidad: '/entidad/', // propuesto (contrato 0.9) · GET de los dos roles; PUT solo Administrador
  estadosTU: '/estados/', // propuesto (contrato 0.9) · solo Administrador (Tabla 4b con su uso en CENS)
  homologacionEstados: '/homologacion-estados/', // propuesto (contrato 0.9.1) · solo Administrador
  homologacionEstado: (estadoSac) => `/homologacion-estados/${estadoSac}/`, // propuesto (contrato 0.9.1) · PUT solo Administrador
  ciclos: '/ciclos/', // propuesto (contrato 0.9) · solo Analista (GET historial, POST ejecutar)
  ciclo: (corteId) => `/ciclos/${corteId}/`, // propuesto (contrato 0.9) · solo Analista
  matrizEstados: '/matriz-estados/', // propuesto (contrato 0.9) · solo Analista
  refinanciaciones: '/refinanciaciones/', // propuesto (contrato 0.9) · solo Analista (GET y POST)
  validacionesCorte: (id) => `/extracciones/${id}/validaciones/`, // propuesto (contrato 0.9) · los dos roles
  generarArchivo: (id) => `/extracciones/${id}/archivo/`, // propuesto (contrato 0.9) · los dos roles
  archivos: '/archivos/', // propuesto (contrato 0.9) · los dos roles
  archivoDescarga: (id) => `/archivos/${id}/descarga/`, // propuesto (contrato 0.9) · los dos roles (text/plain)
  resultadosArchivo: (id) => `/archivos/${id}/resultados/`, // propuesto (contrato 0.9) · solo Analista (GET ver, POST multipart cargar)
  // Novedades urgentes, eliminaciones y rectificaciones (pantalla 14 · RF24, RF50, RF55) · solo Analista
  novedades: '/novedades/', // propuesto (contrato 0.9)
  novedadGestionar: (id) => `/novedades/${id}/gestionar/`, // propuesto (contrato 0.9)
  novedadRechazar: (id) => `/novedades/${id}/rechazar/`, // propuesto (contrato 0.9)
  eliminaciones: '/eliminaciones/', // propuesto (contrato 0.9)
  eliminacionReactivar: (id) => `/eliminaciones/${id}/reactivar/`, // propuesto (contrato 0.9)
  rectificaciones: '/rectificaciones/', // propuesto (contrato 0.9.2: acepta novedad_id)
  rectificacionConfirmar: (id) => `/rectificaciones/${id}/confirmar/`, // propuesto (contrato 0.9)
  // Solo existe en los mocks (modo demostración). El backend real NO lo tendrá.
  demoSwitchProfile: '/demo/switch-profile/',
}
