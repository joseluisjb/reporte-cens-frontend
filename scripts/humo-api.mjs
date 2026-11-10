// Prueba de humo contra el backend real (solo lecturas): comprueba que responde y que lo que
// devuelve cumple el contrato `docs/contrato/openapi.yaml`. No crea, cambia ni borra datos.
//
// Uso (Node 20+, desde la raíz del proyecto):
//   npm run humo                                   sin credenciales: salud, sesión requerida y autenticación
//   HUMO_CORREO=... HUMO_CLAVE=... npm run humo    con sesión: además recorre las consultas de negocio
//                                                  (Iteraciones 1 y 2, según el rol de la cuenta)
//
// Variables de entorno (las credenciales NUNCA van en el código ni se imprimen):
//   HUMO_API_URL  base de la API (por defecto https://reporte-cens-backend.onrender.com/api)
//   HUMO_ORIGEN   origen de confianza que exige Django en peticiones HTTPS con CSRF
//                 (por defecto https://reporte-cens.onrender.com)
//   HUMO_CORREO / HUMO_CLAVE  opcionales
//
// Salida: una línea por comprobación (OK, PENDIENTE, OMITIDO o FALLA). PENDIENTE = la ruta todavía no
// existe en el backend (404 en una ruta del contrato 0.9 que el backend no publica). Código de salida 1 si hubo alguna FALLA.
import { expectCumpleContrato } from '../src/test/contrato.js'

const API = (process.env.HUMO_API_URL || 'https://reporte-cens-backend.onrender.com/api').replace(/\/+$/, '')
const ORIGEN = process.env.HUMO_ORIGEN || 'https://reporte-cens.onrender.com'
const CORREO = process.env.HUMO_CORREO
const CLAVE = process.env.HUMO_CLAVE
const TIEMPO_ESPERA_MS = 90000 // cubre el arranque en frío de Render (~20 s medido)

let fallas = 0
const galletas = new Map() // nombre → valor (csrftoken, sessionid)

const cabeceraCookie = () => [...galletas].map(([k, v]) => `${k}=${v}`).join('; ')
const resumir = (texto, max = 160) => {
  const una = String(texto).replace(/\s+/g, ' ').trim()
  return una.length > max ? `${una.slice(0, max)}…` : una
}

// Petición con timeout; guarda las cookies que el servidor fija y devuelve { status, data }.
async function pedir(metodo, ruta, { cuerpo } = {}) {
  const cabeceras = { Accept: 'application/json', Origin: ORIGEN, Referer: `${ORIGEN}/` }
  if (galletas.size) cabeceras.Cookie = cabeceraCookie()
  if (metodo !== 'GET' && galletas.has('csrftoken')) cabeceras['X-CSRFToken'] = galletas.get('csrftoken')
  if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json'
  const res = await fetch(`${API}${ruta}`, {
    method: metodo,
    headers: cabeceras,
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    redirect: 'manual',
    signal: AbortSignal.timeout(TIEMPO_ESPERA_MS),
  })
  for (const linea of res.headers.getSetCookie?.() ?? []) {
    const [par] = linea.split(';')
    const i = par.indexOf('=')
    if (i > 0) {
      const valor = par.slice(i + 1).trim()
      if (valor) galletas.set(par.slice(0, i).trim(), valor)
      else galletas.delete(par.slice(0, i).trim()) // cookie vaciada (logout)
    }
  }
  const texto = await res.text()
  let data = null
  if (texto) {
    try {
      data = JSON.parse(texto)
    } catch {
      data = texto // no es JSON (p. ej. la página HTML de un error)
    }
  }
  return { status: res.status, data }
}

function informar(estado, metodo, ruta, status, nota = '') {
  if (estado === 'FALLA') fallas += 1
  console.log(`${estado.padEnd(9)} ${metodo} ${ruta} -> ${status ?? '-'}${nota ? `  ${nota}` : ''}`)
}

// Hace la petición, exige uno de los estados esperados y valida el cuerpo contra el contrato.
// `rutaContrato` es la clave de `paths` (por ejemplo '/extracciones/{id}/obligaciones/').
async function comprobar(metodo, ruta, esperados, { rutaContrato = ruta, cuerpo, pendienteSi404 = false } = {}) {
  let r
  try {
    r = await pedir(metodo, ruta, { cuerpo })
  } catch (e) {
    informar('FALLA', metodo, ruta, null, `sin respuesta: ${e.name === 'TimeoutError' ? `más de ${TIEMPO_ESPERA_MS / 1000} s` : e.message}`)
    return null
  }
  if (pendienteSi404 && r.status === 404 && !esperados.includes(404)) {
    informar('PENDIENTE', metodo, ruta, 404, 'el backend todavía no publica esta ruta (docs/PENDIENTES_BACKEND.md, sección 5)')
    return null
  }
  if (!esperados.includes(r.status)) {
    informar('FALLA', metodo, ruta, r.status, `se esperaba ${esperados.join(' o ')}: ${resumir(JSON.stringify(r.data))}`)
    return null
  }
  try {
    expectCumpleContrato(metodo, rutaContrato, r.status, r.data)
  } catch (e) {
    informar('FALLA', metodo, ruta, r.status, `contrato: ${resumir(e.message.split('\n')[0])}`)
    return null
  }
  informar('OK', metodo, ruta, r.status)
  return r
}

async function sinCredenciales() {
  await comprobar('GET', '/salud/', [200])

  // Sin sesión el contrato espera 401; hoy el backend responde 403 (diferencia K).
  try {
    const r = await pedir('GET', '/conceptos/')
    if (r.status === 401) await comprobar('GET', '/conceptos/', [401])
    else if (r.status === 403 && r.data?.detail) informar('PENDIENTE', 'GET', '/conceptos/', 403, 'sin sesión responde 403 y el contrato espera 401 (diferencia K del contrato)')
    else informar('FALLA', 'GET', '/conceptos/', r.status, `sin sesión se esperaba 401: ${resumir(JSON.stringify(r.data))}`)
  } catch (e) {
    informar('FALLA', 'GET', '/conceptos/', null, `sin respuesta: ${e.message}`)
  }

  // Si no existe la autenticación, no hay nada más que probar.
  let r
  try {
    r = await pedir('GET', '/auth/csrf/')
  } catch (e) {
    informar('FALLA', 'GET', '/auth/csrf/', null, `sin respuesta: ${e.message}`)
    return false
  }
  if (r.status === 404) {
    informar('PENDIENTE', 'GET', '/auth/csrf/', 404, 'el backend aún no tiene autenticación (RF25, Dilan)')
    return false
  }
  return Boolean(await comprobar('GET', '/auth/csrf/', [204, 200]))
}

async function conSesion() {
  const login = await comprobar('POST', '/auth/login/', [200], { cuerpo: { email: CORREO, password: CLAVE } })
  if (!login) return
  const yo = await comprobar('GET', '/auth/me/', [200])
  await comprobar('GET', '/conceptos/', [200])
  await comprobar('GET', '/grupos-conceptos/', [200])
  const lista = await comprobar('GET', '/extracciones/', [200])
  await comprobar('GET', '/extracciones/ultima/', [200, 204])
  const cortes = Array.isArray(lista?.data) ? lista.data : lista?.data?.results
  const id = cortes?.[0]?.id
  if (id !== undefined) {
    await comprobar('GET', `/extracciones/${id}/obligaciones/?limite=5`, [200], { rutaContrato: '/extracciones/{id}/obligaciones/' })
  } else {
    console.log('OMITIDO   no hay cortes: se salta GET /extracciones/{id}/obligaciones/')
  }
  await iteracion2(yo?.data?.user?.rol, id)
  await comprobar('POST', '/auth/logout/', [204, 200])
}

// Iteración 2 (contrato 0.9): solo lecturas. Lo que es solo del Analista debe dar 403 al Administrador y
// al revés; las rutas que el backend aún no publica salen como PENDIENTE.
async function iteracion2(rol, corteId) {
  const analista = rol === 'ANALISTA_CARTERA'
  const soloAnalista = analista ? [200] : [403]
  const soloAdmin = analista ? [403] : [200]
  console.log(`--- Iteración 2 como ${analista ? 'Analista' : 'Administrador'}`)

  // Los dos roles.
  await comprobar('GET', '/entidad/', [200])
  await comprobar('GET', '/catalogos/modos-extincion/', [200], { rutaContrato: '/catalogos/{nombre}/', pendienteSi404: true })
  if (corteId !== undefined) {
    await comprobar('GET', `/extracciones/${corteId}/validaciones/`, [200], { rutaContrato: '/extracciones/{id}/validaciones/' })
  }
  const archivos = await comprobar('GET', '/archivos/', [200])
  const archivo = Array.isArray(archivos?.data) ? archivos.data[0] : undefined
  if (archivo) {
    await comprobar('GET', `/archivos/${archivo.id}/descarga/`, [200], { rutaContrato: '/archivos/{id}/descarga/' })
    await comprobar('GET', `/archivos/${archivo.id}/resultados/`, analista ? [200, 404] : [403], { rutaContrato: '/archivos/{id}/resultados/' })
  } else {
    console.log('OMITIDO   no hay archivos generados: se saltan la descarga y los resultados del cargue')
  }

  // Solo el Analista (HU-B y HU-C).
  const lista = await comprobar('GET', '/obligaciones/?limite=5', soloAnalista, { rutaContrato: '/obligaciones/' })
  await comprobar('GET', '/obligaciones/resumen/', soloAnalista)
  const obligacion = lista?.data?.resultados?.[0]
  if (analista && obligacion) {
    await comprobar('GET', `/obligaciones/${obligacion.obligacion_id}/`, [200], { rutaContrato: '/obligaciones/{id}/' })
    await comprobar('GET', `/obligaciones/${obligacion.obligacion_id}/linea-tiempo/`, [200], { rutaContrato: '/obligaciones/{id}/linea-tiempo/', pendienteSi404: true })
  } else if (analista) {
    console.log('OMITIDO   no hay obligaciones: se saltan el detalle y la línea de tiempo')
  }
  await comprobar('GET', '/matriz-estados/', soloAnalista)
  const ciclos = await comprobar('GET', '/ciclos/', soloAnalista)
  const ciclo = Array.isArray(ciclos?.data) ? ciclos.data[0] : undefined
  if (analista && ciclo) await comprobar('GET', `/ciclos/${ciclo.corte_id}/`, [200], { rutaContrato: '/ciclos/{corte_id}/' })
  await comprobar('GET', '/refinanciaciones/', soloAnalista, { pendienteSi404: true })
  await comprobar('GET', '/reclamos/', soloAnalista)
  await comprobar('GET', '/novedades/', soloAnalista)
  await comprobar('GET', '/eliminaciones/?limite=5', soloAnalista, { rutaContrato: '/eliminaciones/' })
  await comprobar('GET', '/rectificaciones/', soloAnalista)
  await comprobar('GET', '/panel/resumen/', soloAnalista, { pendienteSi404: true })

  // Solo el Administrador (RF48).
  await comprobar('GET', '/estados/', soloAdmin)
  await comprobar('GET', '/homologacion-estados/', soloAdmin)
}

console.log(`Prueba de humo: ${API} (origen ${ORIGEN})`)
const hayAuth = await sinCredenciales()
if (CORREO && CLAVE) {
  if (hayAuth) await conSesion()
  else console.log('OMITIDO   hay credenciales pero no hay autenticación disponible: se salta el recorrido con sesión')
} else if (hayAuth) {
  console.log('OMITIDO   sin HUMO_CORREO/HUMO_CLAVE: se salta el recorrido con sesión')
}
console.log(fallas ? `\n${fallas} comprobación(es) con FALLA` : '\nSin fallas')
process.exit(fallas ? 1 : 0)
