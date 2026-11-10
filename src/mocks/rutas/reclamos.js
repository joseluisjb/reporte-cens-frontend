// Reclamos Habeas Data (pantalla 13, RF23) del backend simulado. Solo Analista de Cartera.
// Contrato 0.9.4: la marca ante TransUnion se pide con el proceso «Marcación de obligaciones
// (Reclamos Batch)» (Manual, p. 57). Generar el insumo deja `marcacion_generada` o
// `desmarcacion_generada` en true; que TransUnion lo aplique lo dicen sus archivos de radicación y
// de cierre, que todavía no se cargan.
import { http, HttpResponse } from 'msw'
import { esFechaISO } from '../../features/audit/auditValidation'
import { ENDPOINTS } from '../../lib/api/endpoints'
import { CATALOGOS } from '../datos/catalogos'
import { db, persistir } from '../db'
import { aEntero, ahoraBogotaISO, error, espera, exigirSesion, hoyLocalISO, idDeRuta, leerCuerpo, SOLO_ANALISTA, url } from '../utilidades'

const ESTADOS_VALIDOS = ['EN_RECLAMO', 'CERRADO']
const DIAS_HABILES_RESPUESTA = 15

// 15 días hábiles desde la radicación, sin sábados ni domingos. POR CONFIRMAR con jurídica (contrato,
// `fecha_limite_respuesta`): no descuenta los festivos de Colombia ni dice desde qué día se cuenta.
function fechaLimite(fechaISO) {
  const [a, m, d] = fechaISO.split('-').map(Number)
  const fecha = new Date(Date.UTC(a, m - 1, d))
  for (let habiles = 0; habiles < DIAS_HABILES_RESPUESTA; ) {
    fecha.setUTCDate(fecha.getUTCDate() + 1)
    const dia = fecha.getUTCDay()
    if (dia !== 0 && dia !== 6) habiles += 1
  }
  return fecha.toISOString().slice(0, 10)
}

// `vencido` se calcula al responder: sigue EN_RECLAMO después de la fecha límite.
const conVencido = (r) => ({ ...r, vencido: r.estado === 'EN_RECLAMO' && hoyLocalISO() > r.fecha_limite_respuesta })

const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '')

// Línea del insumo: número|tipología|fecha. POR CONFIRMAR con TransUnion: el Manual (p. 57)
// describe el proceso, no la estructura del archivo.
const lineaInsumo = (r, fecha) => `${r.numero_obligacion}|${r.tipologia.codigo}|${fecha.replace(/-/g, '')}\r\n`

const INSUMOS = {
  marcacion: {
    incluye: (r) => r.estado === 'EN_RECLAMO' && !r.marcacion_generada,
    marcar: (r) => (r.marcacion_generada = true),
    fecha: (r) => r.fecha_radicacion,
    archivo: 'Reclamos_Marcacion_TransUnion.txt',
  },
  desmarcacion: {
    incluye: (r) => r.estado === 'CERRADO' && !r.desmarcacion_generada,
    marcar: (r) => (r.desmarcacion_generada = true),
    fecha: (r) => r.fecha_cierre,
    archivo: 'Reclamos_Desmarcacion_TransUnion.txt',
  },
}

export const reclamosHandlers = [
  http.get(url(ENDPOINTS.reclamos), async ({ request }) => {
    await espera()
    const { respuesta } = exigirSesion(SOLO_ANALISTA)
    if (respuesta) return respuesta
    const estado = new URL(request.url).searchParams.get('estado')
    if (estado && !ESTADOS_VALIDOS.includes(estado)) return error(400, { estado: ['Estado no válido.'] })
    const lista = db.reclamos.filter((r) => !estado || r.estado === estado).sort((a, b) => b.id - a.id)
    return HttpResponse.json(lista.map(conVencido))
  }),

  http.post(url(ENDPOINTS.reclamos), async ({ request }) => {
    await espera()
    const { respuesta, usuario } = exigirSesion(SOLO_ANALISTA)
    if (respuesta) return respuesta
    const cuerpo = await leerCuerpo(request)
    const obligacionId = aEntero(cuerpo.obligacion_id)
    const tipologia = CATALOGOS['tipologias-reclamo'].find((t) => t.codigo === texto(cuerpo.tipologia))
    const fechaRadicacion = texto(cuerpo.fecha_radicacion)
    const observacion = texto(cuerpo.observacion)

    const errores = {}
    if (!obligacionId) errores.obligacion_id = ['Selecciona la obligación en reclamo.']
    if (!tipologia) errores.tipologia = ['Selecciona una tipología válida de la Ley 1266.']
    if (!esFechaISO(fechaRadicacion)) errores.fecha_radicacion = ['Selecciona la fecha del reclamo.']
    else if (fechaRadicacion > hoyLocalISO()) errores.fecha_radicacion = ['La fecha de radicación no puede ser futura.']
    if (observacion.length > 500) errores.observacion = ['La observación no puede pasar de 500 caracteres.']
    if (Object.keys(errores).length) return error(400, errores)

    const obligacion = db.obligaciones.find((o) => o.id === obligacionId)
    if (!obligacion) return error(400, { obligacion_id: ['La obligación no existe.'] }) // como el backend
    if (db.reclamos.some((r) => r.obligacion_id === obligacion.id && r.estado === 'EN_RECLAMO')) {
      return error(409, { detail: `La obligación ${obligacion.numero} ya tiene un reclamo abierto.` })
    }

    const reclamo = {
      id: Math.max(0, ...db.reclamos.map((r) => r.id)) + 1,
      obligacion_id: obligacion.id,
      numero_obligacion: obligacion.numero,
      nombre_titular: obligacion.titular,
      tipologia,
      fecha_radicacion: fechaRadicacion,
      observacion: observacion || null,
      estado: 'EN_RECLAMO',
      marcacion_generada: false,
      desmarcacion_generada: false,
      fecha_limite_respuesta: fechaLimite(fechaRadicacion),
      vencido: false,
      resultado: null,
      fecha_cierre: null,
      observacion_cierre: null,
      registrado_por: usuario.nombre,
      fecha_registro: ahoraBogotaISO(),
    }
    db.reclamos.unshift(reclamo)
    obligacion.en_reclamo = true // se sigue reportando; solo cambia la marca (RF23)
    persistir()
    return HttpResponse.json(conVencido(reclamo), { status: 201 })
  }),

  http.post(url(ENDPOINTS.reclamoCerrar(':id')), async ({ params, request }) => {
    await espera()
    const { respuesta } = exigirSesion(SOLO_ANALISTA)
    if (respuesta) return respuesta
    const reclamo = db.reclamos.find((r) => r.id === idDeRuta(params.id))
    if (!reclamo) return error(404, { detail: 'Reclamo no encontrado.' })
    if (reclamo.estado === 'CERRADO') return error(409, { detail: 'El reclamo ya está cerrado.' })

    const cuerpo = await leerCuerpo(request)
    const resultado = texto(cuerpo.resultado)
    const fechaCierre = texto(cuerpo.fecha_cierre)
    const observacionCierre = texto(cuerpo.observacion_cierre)
    const errores = {}
    if (!resultado) errores.resultado = ['Selecciona el resultado del reclamo.']
    else if (resultado.length > 30) errores.resultado = ['El resultado no puede pasar de 30 caracteres.']
    if (!esFechaISO(fechaCierre)) errores.fecha_cierre = ['Selecciona la fecha de cierre.']
    else if (fechaCierre < reclamo.fecha_radicacion) errores.fecha_cierre = ['La fecha de cierre no puede ser anterior a la de radicación.']
    if (observacionCierre.length > 500) errores.observacion_cierre = ['La observación no puede pasar de 500 caracteres.']
    if (Object.keys(errores).length) return error(400, errores)

    Object.assign(reclamo, {
      estado: 'CERRADO',
      resultado,
      fecha_cierre: fechaCierre,
      observacion_cierre: observacionCierre || null,
      desmarcacion_generada: false, // entra en el siguiente archivo de desmarcación
    })
    const sigueEnReclamo = db.reclamos.some((r) => r.obligacion_id === reclamo.obligacion_id && r.estado === 'EN_RECLAMO')
    const obligacion = db.obligaciones.find((o) => o.id === reclamo.obligacion_id)
    if (obligacion && !sigueEnReclamo) obligacion.en_reclamo = false
    persistir()
    return HttpResponse.json(conVencido(reclamo))
  }),

  http.get(url(ENDPOINTS.reclamosInsumo), async ({ request }) => {
    await espera()
    const { respuesta } = exigirSesion(SOLO_ANALISTA)
    if (respuesta) return respuesta
    const insumo = INSUMOS[new URL(request.url).searchParams.get('tipo')]
    if (!insumo) return error(400, { tipo: ['Usa marcacion o desmarcacion.'] })

    const incluidos = db.reclamos.filter(insumo.incluye).sort((a, b) => a.id - b.id)
    const contenido = incluidos.map((r) => lineaInsumo(r, insumo.fecha(r))).join('')
    incluidos.forEach(insumo.marcar)
    persistir()
    return new HttpResponse(contenido, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${insumo.archivo}"`,
      },
    })
  }),
]
