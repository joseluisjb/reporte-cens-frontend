// Rutas de extracción de cartera y ciclo de corte (RF1–RF5, RF7, RF44) del backend simulado.
// Ambos roles (Analista y Administrador). Siguen el contrato 0.5: donde el backend de hoy se aparta del
// manual de TransUnion (sector Servicios) o tiene un defecto, el mock hace lo previsto:
//  - A2: el corte incluye obligaciones Saldadas (estado 02). A4: estado de la obligación (Tabla 4b).
//    Ver mocks/datos/obligaciones.js y docs/contrato/DISCREPANCIAS.md. (A3, el tipo de identificación de la
//    Tabla 2, aplica a los endpoints que devuelven `tipo_id_tu`, que son del historial y aún no se simulan;
//    el catálogo ya está en features/extraction/catalogosTU.js.)
//  - A9: la fecha de corte debe ser posterior a la del último corte ENVIADO (409).
//  - S: un id no numérico responde 404 'Corte no encontrado.' (el backend de hoy da 500) y `limite` /
//    `desplazamiento` se validan (el backend de hoy no).
//  - Y: `ejecutada_por` lleva el nombre de quien generó el corte (hoy el backend siempre da null).
//  - AA: en registrar-envio el 404 se comprueba antes que la fecha (el backend hace lo contrario).
// Síncrono: generar un corte responde 201 con el corte ya en BORRADOR.
import { http, HttpResponse } from 'msw'
import { ENDPOINTS } from '../../lib/api/endpoints'
import { enmascararIdentificacion } from '../../lib/format'
import { generarObligaciones, totalesCorte } from '../datos/obligaciones'
import { validarCorte } from '../datos/validaciones'
import { db, persistir } from '../db'
import { ahoraBogotaISO, aEntero, error, espera, exigirSesion, hoyLocalISO, idDeRuta, leerCuerpo, url } from '../utilidades'

const sinCorte = () => error(404, { detail: 'Corte no encontrado.' })
const LIMITE_MAXIMO = 100

// CorteResumen, con las claves en el orden del contrato. El grupo sale de la FOTO guardada en el corte.
function aResumen(corte) {
  const { totalObligaciones, saldoConsolidado } = totalesCorte(corte)
  return {
    id: corte.id,
    fecha_corte: corte.fecha_corte,
    fecha_ejecucion: corte.fecha_ejecucion,
    grupo: corte.grupo_id == null ? null : { id: corte.grupo_id, nombre: corte.grupo_nombre },
    obligaciones: totalObligaciones,
    saldo_consolidado: saldoConsolidado,
    estado: corte.estado,
    ejecutada_por: corte.ejecutada_por,
  }
}

// Cortes visibles (sin ANULADO), del más reciente al más antiguo según fecha_ejecucion.
const masReciente = (a, b) => (a.fecha_ejecucion < b.fecha_ejecucion ? 1 : a.fecha_ejecucion > b.fecha_ejecucion ? -1 : b.id - a.id)
const cortesVisibles = () => db.cortes.filter((c) => c.estado !== 'ANULADO').toSorted(masReciente)
const buscarCorte = (idTexto) => db.cortes.find((c) => c.id === idDeRuta(idTexto))

// 'YYYY-MM-DD' que además existe en el calendario (2026-02-30 no).
function esFechaISO(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false
  const [a, m, d] = valor.split('-').map(Number)
  const fecha = new Date(Date.UTC(a, m - 1, d))
  return fecha.getUTCFullYear() === a && fecha.getUTCMonth() === m - 1 && fecha.getUTCDate() === d
}

// Mensaje de error de una fecha, o null si está bien. Si falta (o es null) y no es obligatoria, está bien.
function errorDeFecha(valor, { obligatoria, mensajeFalta, mensajeInvalida }) {
  if (valor === undefined || valor === null || (typeof valor === 'string' && !valor.trim())) return obligatoria ? mensajeFalta : null
  return esFechaISO(typeof valor === 'string' ? valor.trim() : valor) ? null : mensajeInvalida
}

const MSG_NO_ENTEROS = 'Los parámetros limite y desplazamiento deben ser enteros.' // texto del backend
const MSG_FUERA_DE_RANGO = 'El límite debe ser mayor que 0 y el desplazamiento no puede ser negativo.' // propuesta del contrato 0.4

// `limite` y `desplazamiento` del GET de obligaciones → { limite, desplazamiento } o { error } con el mensaje.
// Sin valor usan los predeterminados (20 y 0); un `limite` mayor que 100 se recorta a 100.
export function leerPaginacion(params) {
  const pedir = (nombre, porDefecto) => {
    const texto = params.get(nombre)
    return texto === null ? porDefecto : aEntero(texto)
  }
  const limite = pedir('limite', 20)
  const desplazamiento = pedir('desplazamiento', 0)
  if (limite === null || desplazamiento === null) return { error: MSG_NO_ENTEROS }
  if (limite < 1 || desplazamiento < 0) return { error: MSG_FUERA_DE_RANGO }
  return { limite: Math.min(limite, LIMITE_MAXIMO), desplazamiento }
}

export const extraccionesHandlers = [
  http.get(url(ENDPOINTS.extracciones), async () => {
    await espera()
    const { respuesta } = exigirSesion()
    return respuesta ?? HttpResponse.json(cortesVisibles().map(aResumen))
  }),

  // Antes que `/:id/`, o 'ultima' se tomaría por un id.
  http.get(url(ENDPOINTS.extraccionUltima), async () => {
    await espera()
    const { respuesta } = exigirSesion()
    if (respuesta) return respuesta
    const ultimo = cortesVisibles()[0]
    return ultimo ? HttpResponse.json(aResumen(ultimo)) : new HttpResponse(null, { status: 204 })
  }),

  http.get(url(ENDPOINTS.extraccion(':id')), async ({ params }) => {
    await espera()
    const { respuesta } = exigirSesion()
    if (respuesta) return respuesta
    const corte = buscarCorte(params.id)
    return corte ? HttpResponse.json(aResumen(corte)) : sinCorte()
  }),

  http.post(url(ENDPOINTS.extracciones), async ({ request }) => {
    await espera()
    const { respuesta, usuario } = exigirSesion()
    if (respuesta) return respuesta
    const cuerpo = await leerCuerpo(request)

    // Campos
    const errores = {}
    const errorFecha = errorDeFecha(cuerpo.fecha_corte, {
      obligatoria: true,
      mensajeFalta: 'Selecciona una fecha de corte.',
      mensajeInvalida: 'La fecha de corte no es válida.',
    })
    if (errorFecha) errores.fecha_corte = [errorFecha]
    const tieneGrupo = cuerpo.grupo_id !== undefined && cuerpo.grupo_id !== null
    const grupoId = tieneGrupo ? aEntero(cuerpo.grupo_id) : null
    if (tieneGrupo && (grupoId === null || grupoId < 1)) errores.grupo_id = ['El grupo de conceptos no es válido.']
    if (Object.keys(errores).length) return error(400, errores)

    const fechaCorte = cuerpo.fecha_corte.trim()
    if (fechaCorte > hoyLocalISO()) return error(400, { detail: 'La fecha de corte no puede ser futura.' })

    // Grupo
    let grupo = null
    if (tieneGrupo) {
      grupo = db.grupos.find((g) => g.id === grupoId)
      if (!grupo) return error(404, { detail: 'Grupo no encontrado.' })
      if (!grupo.activo) return error(409, { detail: 'El grupo está inactivo.' })
    }

    // Reglas del ciclo. Un ANULADO de la misma fecha también bloquea (diferencia AA del contrato).
    const mismaFecha = db.cortes.find((c) => c.fecha_corte === fechaCorte)
    if (mismaFecha && mismaFecha.estado !== 'BORRADOR') {
      return error(409, { detail: 'Ya existe un corte con esa fecha en un estado que no permite reemplazo.' })
    }
    const otroBorrador = db.cortes.find((c) => c.estado === 'BORRADOR' && c.fecha_corte !== fechaCorte)
    if (otroBorrador) {
      return error(409, { detail: `Ya existe un corte en BORRADOR con fecha ${otroBorrador.fecha_corte}. Elimínelo o complételo antes de generar otro.` })
    }
    const ultimaEnviada = db.cortes.filter((c) => c.estado === 'ENVIADO').reduce((max, c) => (c.fecha_corte > max ? c.fecha_corte : max), '')
    if (ultimaEnviada && fechaCorte <= ultimaEnviada) {
      return error(409, { detail: 'La fecha de corte debe ser posterior a la del último corte enviado.' })
    }

    const datos = {
      fecha_ejecucion: ahoraBogotaISO(),
      grupo_id: grupo ? grupo.id : null,
      grupo_nombre: grupo ? grupo.nombre : null,
      ejecutada_por: usuario.nombre,
    }
    let corte = mismaFecha // un BORRADOR de la misma fecha se reemplaza y conserva su id
    if (corte) Object.assign(corte, datos)
    else {
      corte = { id: db.siguienteCorteId++, fecha_corte: fechaCorte, estado: 'BORRADOR', fecha_envio: null, observacion: null, ...datos }
      db.cortes.push(corte)
    }
    persistir()
    return HttpResponse.json(aResumen(corte), { status: 201 })
  }),

  // Solo un BORRADOR se elimina. Las obligaciones no se guardan (se generan al pedirlas): basta quitar el corte.
  http.delete(url(ENDPOINTS.extraccion(':id')), async ({ params }) => {
    await espera()
    const { respuesta } = exigirSesion()
    if (respuesta) return respuesta
    const corte = buscarCorte(params.id)
    if (!corte) return sinCorte()
    if (corte.estado !== 'BORRADOR') return error(409, { detail: 'Solo se puede eliminar un corte en estado BORRADOR.' })
    db.cortes = db.cortes.filter((c) => c.id !== corte.id)
    persistir()
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(url(ENDPOINTS.validarExtraccion(':id')), async ({ params }) => {
    await espera()
    const { respuesta } = exigirSesion()
    if (respuesta) return respuesta
    const corte = buscarCorte(params.id)
    if (!corte) return sinCorte()
    if (corte.estado !== 'BORRADOR') return error(409, { detail: 'El corte no está en estado BORRADOR.' })
    const { errores, advertencias } = validarCorte(corte, generarObligaciones(corte))
    if (errores.length) return error(409, { detail: 'El corte tiene errores correctivos que deben resolverse.', errores })
    corte.estado = 'VALIDADO'
    persistir()
    return HttpResponse.json({ ...aResumen(corte), advertencias })
  }),

  http.post(url(ENDPOINTS.registrarEnvio(':id')), async ({ params, request }) => {
    await espera()
    const { respuesta } = exigirSesion()
    if (respuesta) return respuesta
    const corte = buscarCorte(params.id)
    if (!corte) return sinCorte()
    const cuerpo = await leerCuerpo(request) // el cuerpo es opcional
    const errorFecha = errorDeFecha(cuerpo.fecha_envio, { obligatoria: false, mensajeInvalida: 'La fecha de envío no es válida.' })
    if (errorFecha) return error(400, { fecha_envio: [errorFecha] })
    const fechaEnvio = typeof cuerpo.fecha_envio === 'string' && cuerpo.fecha_envio.trim() ? cuerpo.fecha_envio.trim() : hoyLocalISO()
    if (fechaEnvio > hoyLocalISO()) return error(400, { detail: 'La fecha de envío no puede ser futura.' })
    if (corte.estado !== 'VALIDADO') return error(409, { detail: 'El corte no está en estado VALIDADO.' })
    corte.estado = 'ENVIADO'
    corte.fecha_envio = fechaEnvio
    persistir()
    return HttpResponse.json(aResumen(corte))
  }),

  http.get(url(ENDPOINTS.obligacionesCorte(':id')), async ({ params, request }) => {
    await espera()
    const { respuesta } = exigirSesion()
    if (respuesta) return respuesta
    const corte = buscarCorte(params.id)
    if (!corte) return sinCorte()
    const pagina = leerPaginacion(new URL(request.url).searchParams)
    if (pagina.error) return error(400, { detail: pagina.error })
    const filas = generarObligaciones(corte).toSorted((a, b) => (a.numero_obligacion < b.numero_obligacion ? -1 : 1))
    // Como el backend, la identificación sale enmascarada (la completa solo la usan las reglas de validar).
    const resultados = filas
      .slice(pagina.desplazamiento, pagina.desplazamiento + pagina.limite)
      .map((f) => ({ ...f, numero_identificacion: enmascararIdentificacion(f.numero_identificacion) }))
    return HttpResponse.json({ total: filas.length, resultados })
  }),
]
