// Prueba de humo contra el backend real (solo lecturas): comprueba que responde y que lo que
// devuelve cumple el contrato `docs/contrato/openapi.yaml`. No crea, cambia ni borra datos.
//
// Uso (Node 20+, desde la raíz del proyecto):
//   npm run humo                                   sin credenciales: salud, sesión requerida y autenticación
//   HUMO_CORREO=... HUMO_CLAVE=... npm run humo    con sesión: además recorre las consultas de negocio
//
// Variables de entorno (las credenciales NUNCA van en el código ni se imprimen):
//   HUMO_API_URL  base de la API (por defecto https://reporte-cens-backend.onrender.com/api)
//   HUMO_ORIGEN   origen de confianza que exige Django en peticiones HTTPS con CSRF
//                 (por defecto https://reporte-cens.onrender.com)
//   HUMO_CORREO / HUMO_CLAVE  opcionales
//
// Salida: una línea por comprobación (OK, PENDIENTE o FALLA). Código de salida 1 si hubo alguna FALLA.
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
async function comprobar(metodo, ruta, esperados, { rutaContrato = ruta, cuerpo } = {}) {
  let r
  try {
    r = await pedir(metodo, ruta, { cuerpo })
  } catch (e) {
    informar('FALLA', metodo, ruta, null, `sin respuesta: ${e.name === 'TimeoutError' ? `más de ${TIEMPO_ESPERA_MS / 1000} s` : e.message}`)
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
  await comprobar('GET', '/auth/me/', [200])
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
  await comprobar('POST', '/auth/logout/', [204, 200])
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
