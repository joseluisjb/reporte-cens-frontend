// Reclamos Habeas Data (pantalla 13, RF23) del backend simulado.
// SOLO Analista de Cartera.
import { http, HttpResponse } from 'msw'
import { esFechaISO } from '../../features/audit/auditValidation'
import { ENDPOINTS } from '../../lib/api/endpoints'
import { CATALOGOS } from '../datos/catalogos'
import { db, persistir } from '../db'
import {
  aEntero,
  ahoraBogotaISO,
  error,
  espera,
  exigirSesion,
  idDeRuta,
  SOLO_ANALISTA,
  url,
} from '../utilidades'

const ESTADOS_VALIDOS = ['EN_RECLAMO', 'CERRADO']

// Aproximación de 15 días hábiles (~22 días calendario)
function calcularFechaLimite(fechaISO) {
  try {
    const [y, m, d] = fechaISO.split('-').map(Number)
    const fecha = new Date(Date.UTC(y, m - 1, d))
    let habiles = 0
    while (habiles < 15) {
      fecha.setUTCDate(fecha.getUTCDate() + 1)
      const diaSemana = fecha.getUTCDay()
      if (diaSemana !== 0 && diaSemana !== 6) {
        habiles += 1
      }
    }
    const yy = fecha.getUTCFullYear()
    const mm = String(fecha.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(fecha.getUTCDate()).padStart(2, '0')
    return `${yy}-${mm}-${dd}`
  } catch {
    return null
  }
}

export const reclamosHandlers = [
  // Listar reclamos (filtro opcional: ?estado=EN_RECLAMO|CERRADO)
  http.get(url(ENDPOINTS.reclamos), async ({ request }) => {
    await espera()
    const { respuesta } = exigirSesion(SOLO_ANALISTA)
    if (respuesta) return respuesta

    const reqUrl = new URL(request.url)
    const estado = reqUrl.searchParams.get('estado')

    if (estado && !ESTADOS_VALIDOS.includes(estado)) {
      return error(400, { estado: ['Estado no válido.'] })
    }

    let lista = [...db.reclamos]
    if (estado) {
      lista = lista.filter((r) => r.estado === estado)
    }

    lista.sort((a, b) => b.id - a.id)
    return HttpResponse.json(lista)
  }),

  // Registrar un reclamo
  http.post(url(ENDPOINTS.reclamos), async ({ request }) => {
    await espera()
    const { respuesta, usuario } = exigirSesion(SOLO_ANALISTA)
    if (respuesta) return respuesta

    const cuerpo = await request.json().catch(() => ({}))
    const obligacionId = aEntero(cuerpo.obligacion_id)
    const tipologiaCodigo = typeof cuerpo.tipologia === 'string' ? cuerpo.tipologia.trim() : null
    const fechaRadicacion = typeof cuerpo.fecha_radicacion === 'string' ? cuerpo.fecha_radicacion.trim() : null
    const observacion = typeof cuerpo.observacion === 'string' ? cuerpo.observacion.trim() : ''

    const errores = {}
    if (!obligacionId) {
      errores.obligacion_id = ['Selecciona la obligación en reclamo.']
    }

    const tipologiaObj = CATALOGOS['tipologias-reclamo']?.find((t) => t.codigo === tipologiaCodigo)
    if (!tipologiaObj) {
      errores.tipologia = ['Selecciona una tipología válida de la Ley 1266.']
    }

    if (!fechaRadicacion || !esFechaISO(fechaRadicacion)) {
      errores.fecha_radicacion = ['Selecciona la fecha del reclamo.']
    }

    if (Object.keys(errores).length > 0) {
      return error(400, errores)
    }

    // Buscar obligación para número y titular
    const obligacion = db.obligaciones.find(
      (o) => o.id === obligacionId || o.obligacion_id === obligacionId
    )
    if (!obligacion) {
      return error(404, { detail: 'Obligación no encontrada.' })
    }

    const numeroObligacion = obligacion.numero_obligacion ?? obligacion.numeroObligacion ?? `OBL-${obligacionId}`

    // Segundo reclamo abierto sobre la misma obligación -> 409
    const tieneReclamoAbierto = db.reclamos.some(
      (r) => r.obligacion_id === obligacionId && r.estado === 'EN_RECLAMO'
    )
    if (tieneReclamoAbierto) {
      return error(409, {
        detail: `La obligación ${numeroObligacion} ya tiene un reclamo abierto.`,
      })
    }

    const siguienteId = db.reclamos.reduce((max, r) => Math.max(max, r.id || 0), 0) + 1
    const nombreTitular =
      obligacion.nombre_titular ??
      obligacion.titular?.nombre ??
      obligacion.nombre ??
      'TITULAR'

    const nuevoReclamo = {
      id: siguienteId,
      obligacion_id: obligacionId,
      numero_obligacion: numeroObligacion,
      nombre_titular: nombreTitular,
      tipologia: tipologiaObj,
      fecha_radicacion: fechaRadicacion,
      observacion: observacion || null,
      estado: 'EN_RECLAMO',
      radicado_en_tu: false,
      fecha_limite_respuesta: calcularFechaLimite(fechaRadicacion),
      vencido: false,
      resultado: null,
      fecha_cierre: null,
      observacion_cierre: null,
      cerrado_en_archivo: false,
      registrado_por: usuario?.nombre ?? 'Analista',
      fecha_registro: ahoraBogotaISO(),
    }

    db.reclamos.unshift(nuevoReclamo)
    obligacion.en_reclamo = true
    obligacion.enReclamo = true
    persistir()

    return HttpResponse.json(nuevoReclamo, { status: 201 })
  }),

  // Cerrar reclamo: POST /reclamos/{id}/cerrar/
  http.post(url(ENDPOINTS.reclamoCerrar(':id')), async ({ params, request }) => {
    await espera()
    const { respuesta } = exigirSesion(SOLO_ANALISTA)
    if (respuesta) return respuesta

    const id = idDeRuta(params.id)
    const reclamo = db.reclamos.find((r) => r.id === id)
    if (!reclamo) {
      return error(404, { detail: 'Reclamo no encontrado.' })
    }

    if (reclamo.estado === 'CERRADO') {
      return error(409, { detail: 'El reclamo ya está cerrado.' })
    }

    const cuerpo = await request.json().catch(() => ({}))
    const resultado = typeof cuerpo.resultado === 'string' ? cuerpo.resultado.trim() : ''
    const fechaCierre = typeof cuerpo.fecha_cierre === 'string' ? cuerpo.fecha_cierre.trim() : ''
    const observacionCierre = typeof cuerpo.observacion_cierre === 'string' ? cuerpo.observacion_cierre.trim() : ''

    const errores = {}
    if (!resultado) {
      errores.resultado = ['Selecciona el resultado del reclamo.']
    }

    if (!fechaCierre || !esFechaISO(fechaCierre)) {
      errores.fecha_cierre = ['Selecciona la fecha de cierre.']
    } else if (fechaCierre < reclamo.fecha_radicacion) {
      errores.fecha_cierre = ['La fecha de cierre no puede ser anterior a la de radicación.']
    }

    if (Object.keys(errores).length > 0) {
      return error(400, errores)
    }

    reclamo.estado = 'CERRADO'
    reclamo.resultado = resultado
    reclamo.fecha_cierre = fechaCierre
    reclamo.observacion_cierre = observacionCierre || null
    reclamo.cerrado_en_archivo = false

    // Si no quedan otros reclamos abiertos para esta obligación, se desmarca
    const otrosAbiertos = db.reclamos.some(
      (r) => r.id !== reclamo.id && r.obligacion_id === reclamo.obligacion_id && r.estado === 'EN_RECLAMO'
    )
    if (!otrosAbiertos) {
      const obligacion = db.obligaciones.find(
        (o) => o.id === reclamo.obligacion_id || o.obligacion_id === reclamo.obligacion_id
      )
      if (obligacion) {
        obligacion.en_reclamo = false
        obligacion.enReclamo = false
      }
    }

    persistir()
    return HttpResponse.json(reclamo, { status: 200 })
  }),

  // Generar insumo batch para TransUnion: GET /reclamos/insumo/?tipo=marcacion|desmarcacion
  http.get(url(ENDPOINTS.reclamosInsumo), async ({ request }) => {
    await espera()
    const { respuesta } = exigirSesion(SOLO_ANALISTA)
    if (respuesta) return respuesta

    const reqUrl = new URL(request.url)
    const tipo = reqUrl.searchParams.get('tipo')

    if (!['marcacion', 'desmarcacion'].includes(tipo)) {
      return error(400, { tipo: ['Usa marcacion o desmarcacion.'] })
    }

    if (tipo === 'marcacion') {
      const pendientes = db.reclamos.filter((r) => r.estado === 'EN_RECLAMO' && !r.radicado_en_tu)
      pendientes.sort((a, b) => a.id - b.id)

      let texto = ''
      for (const r of pendientes) {
        const f = r.fecha_radicacion.replace(/-/g, '')
        const tipCodigo = r.tipologia?.codigo ?? '01'
        texto += `${r.numero_obligacion}|${tipCodigo}|${f}\r\n`
        r.radicado_en_tu = true
      }

      persistir()
      return new HttpResponse(texto, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': 'attachment; filename="Reclamos_Marcacion_TransUnion.txt"',
        },
      })
    }

    // desmarcacion
    const pendientes = db.reclamos.filter((r) => r.estado === 'CERRADO' && !r.cerrado_en_archivo)
    pendientes.sort((a, b) => a.id - b.id)

    let texto = ''
    for (const r of pendientes) {
      const f = (r.fecha_cierre ?? r.fecha_radicacion).replace(/-/g, '')
      const tipCodigo = r.tipologia?.codigo ?? '01'
      texto += `${r.numero_obligacion}|${tipCodigo}|${f}\r\n`
      r.cerrado_en_archivo = true
    }

    persistir()
    return new HttpResponse(texto, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': 'attachment; filename="Reclamos_Desmarcacion_TransUnion.txt"',
      },
    })
  }),
]
