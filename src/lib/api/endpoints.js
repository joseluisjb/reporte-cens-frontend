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
  // Iteración 2 · implementada en el backend (main 8065be8, contrato 0.9.5); las diferencias abiertas están en
  // docs/PENDIENTES_BACKEND.md §5.1. Con VITE_USE_MOCKS=true siguen respondiendo los mocks.
  obligaciones: '/obligaciones/', // solo Analista
  obligacionesResumen: '/obligaciones/resumen/', // solo Analista
  obligacion: (id) => `/obligaciones/${id}/`, // solo Analista
  obligacionLineaTiempo: (id) => `/obligaciones/${id}/linea-tiempo/`, // solo Analista
  catalogo: (nombre) => `/catalogos/${nombre}/`, // los dos roles
  panelResumen: '/panel/resumen/', // solo Analista
  entidad: '/entidad/', // GET de los dos roles; PUT solo Administrador
  estadosTU: '/estados/', // solo Administrador (Tabla 4b con su uso en CENS)
  homologacionEstados: '/homologacion-estados/', // solo Administrador
  homologacionEstado: (estadoSac) => `/homologacion-estados/${estadoSac}/`, // PUT solo Administrador
  ciclos: '/ciclos/', // solo Analista (GET historial, POST ejecutar)
  ciclo: (corteId) => `/ciclos/${corteId}/`, // solo Analista
  matrizEstados: '/matriz-estados/', // solo Analista
  refinanciaciones: '/refinanciaciones/', // solo Analista (GET y POST)
  validacionesCorte: (id) => `/extracciones/${id}/validaciones/`, // los dos roles
  generarArchivo: (id) => `/extracciones/${id}/archivo/`, // los dos roles
  archivos: '/archivos/', // los dos roles
  archivoDescarga: (id) => `/archivos/${id}/descarga/`, // los dos roles (text/plain)
  resultadosArchivo: (id) => `/archivos/${id}/resultados/`, // solo Analista (GET ver, POST multipart cargar)
  // Reclamos Habeas Data (pantalla 13 · RF23) · solo Analista
  reclamos: '/reclamos/',
  reclamoCerrar: (id) => `/reclamos/${id}/cerrar/`,
  reclamosInsumo: '/reclamos/insumo/', // 0.9.4 · text/plain; deja marcados los reclamos incluidos
  // Novedades urgentes, eliminaciones y rectificaciones (pantalla 14 · RF24, RF50, RF55) · solo Analista
  novedades: '/novedades/',
  novedadGestionar: (id) => `/novedades/${id}/gestionar/`,
  novedadRechazar: (id) => `/novedades/${id}/rechazar/`,
  eliminaciones: '/eliminaciones/',
  eliminacionReactivar: (id) => `/eliminaciones/${id}/reactivar/`,
  rectificaciones: '/rectificaciones/', // 0.9.2: acepta novedad_id
  rectificacionConfirmar: (id) => `/rectificaciones/${id}/confirmar/`,
  // Solo existe en los mocks (modo demostración). El backend real NO lo tendrá.
  demoSwitchProfile: '/demo/switch-profile/',
}
