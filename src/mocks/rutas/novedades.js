// Novedades urgentes, eliminaciones y rectificaciones (pantalla 14, RF24, RF50, RF55).
// SOLO Analista de Cartera.
import { http, HttpResponse } from 'msw'
import { esFechaISO, MSG_AUDIT } from '../../features/audit/auditValidation'
import { ENDPOINTS } from '../../lib/api/endpoints'
import { CATALOGOS } from '../datos/catalogos'
import { db, persistir } from '../db'
import { leerPaginacion } from './extracciones'
import { aEntero, ahoraBogotaISO, error, espera, exigirSesion, hoyLocalISO, leerCuerpo, SOLO_ANALISTA, url } from '../utilidades'

const TIPOS_VALIDOS = ['INCLUSION', 'ACTUALIZACION', 'CORRECCION', 'ELIMINACION']
const ESTADOS_VALIDOS = ['PENDIENTE', 'GESTIONADA', 'RECHAZADA']
const SUJETOS_VALIDOS = ['OBLIGACION', 'TITULAR']
const MEDIOS_VALIDOS = ['ACTUALIZACION_LINEA', 'PROCESO_ESPECIAL']

// `fecha_gestion` y `fecha_activacion` son obligatorias en el contrato (400 por campo si faltan).
const fechaValida = (valor) => typeof valor === 'string' && esFechaISO(valor.trim())

export const novedadesHandlers = [
  // Listar novedades
  http.get(url(ENDPOINTS.novedades), async ({ request }) => {
    await espera()
    const { respuesta } = exigirSesion(SOLO_ANALISTA)
    if (respuesta) return respuesta

    const reqUrl = new URL(request.url)
    const estado = reqUrl.searchParams.get('estado')
    const tipo = reqUrl.searchParams.get('tipo')

    if (estado && !ESTADOS_VALIDOS.includes(estado)) {
      return error(400, { estado: ['Estado no válido.'] })
    }
    if (tipo && !TIPOS_VALIDOS.includes(tipo)) {
      return error(400, { tipo: ['Tipo no válido.'] })
    }

    let lista = [...db.novedades]
    if (estado) lista = lista.filter((n) => n.estado === estado)
    if (tipo) lista = lista.filter((n) => n.tipo === tipo)

    lista.sort((a, b) => b.id - a.id)
    return HttpResponse.json(lista)
  }),

  // Registrar novedad
  http.post(url(ENDPOINTS.novedades), async ({ request }) => {
    await espera()
    const { respuesta, usuario } = exigirSesion(SOLO_ANALISTA)
    if (respuesta) return respuesta

    const cuerpo = await leerCuerpo(request)
    const errores = {}

    if (!cuerpo.tipo || !TIPOS_VALIDOS.includes(cuerpo.tipo)) {
      errores.tipo = ['Selecciona un tipo de novedad válido.']
    }
    if (!cuerpo.sujeto || !SUJETOS_VALIDOS.includes(cuerpo.sujeto)) {
      errores.sujeto = ['Selecciona el sujeto de la novedad (Obligación o Titular).']
    }
    if (!cuerpo.referencia?.trim()) {
      errores.referencia = ['Ingresa el número de obligación o la identificación del titular.']
    }
    if (!cuerpo.motivo?.trim()) {
      errores.motivo = ['Explica el motivo de la novedad.']
    }
    if (cuerpo.tipo === 'ELIMINACION' && !cuerpo.motivo_eliminacion) {
      errores.motivo_eliminacion = ['Selecciona el motivo de la eliminación.']
    }

    if (Object.keys(errores).length) return error(400, errores)

    const obligacion = cuerpo.obligacion_id ? db.obligaciones.find((o) => o.id === Number(cuerpo.obligacion_id)) : null

    const motivoElimObj = cuerpo.motivo_eliminacion
      ? (CATALOGOS['motivos-eliminacion']?.find((m) => m.codigo === cuerpo.motivo_eliminacion) ?? {
          codigo: cuerpo.motivo_eliminacion,
          descripcion: 'Motivo de eliminación',
        })
      : null

    // Solo los campos de `Novedad` en el contrato. Los datos de una corrección van en POST /rectificaciones/.
    const nuevoId = db.novedades.reduce((max, n) => Math.max(max, n.id), 0) + 1
    const novedad = {
      id: nuevoId,
      tipo: cuerpo.tipo,
      sujeto: cuerpo.sujeto,
      obligacion_id: obligacion ? obligacion.id : null,
      referencia: cuerpo.referencia.trim(),
      motivo: cuerpo.motivo.trim(),
      motivo_eliminacion: motivoElimObj,
      valores_enviados: cuerpo.valores_enviados ?? null,
      fecha_deteccion: hoyLocalISO(),
      origen: 'MANUAL',
      estado: 'PENDIENTE',
      numero_transaccion_tu: null,
      fecha_gestion: null,
      motivo_rechazo: null,
      registrada_por: usuario?.nombre ?? 'Analista',
    }

    db.novedades.unshift(novedad)

    persistir()
    return HttpResponse.json(novedad, { status: 201 })
  }),

  // Gestionar novedad en TransUnion (RF24, RF50)
  http.post(url(ENDPOINTS.novedadGestionar(':id')), async ({ params, request }) => {
    await espera()
    const { respuesta } = exigirSesion(SOLO_ANALISTA)
    if (respuesta) return respuesta

    const id = aEntero(params.id)
    const novedad = db.novedades.find((n) => n.id === id)
    if (!novedad) return error(404, { detail: 'Novedad no encontrada.' })
    if (novedad.estado !== 'PENDIENTE') {
      return error(409, { detail: 'La novedad no está pendiente.' })
    }

    const cuerpo = await leerCuerpo(request)
    const errores = {}
    if (!cuerpo.numero_transaccion_tu?.trim()) errores.numero_transaccion_tu = ['Ingresa el número de transacción de TransUnion.']
    if (!fechaValida(cuerpo.fecha_gestion)) errores.fecha_gestion = [MSG_AUDIT.fechaInvalida]
    if (Object.keys(errores).length) return error(400, errores)

    novedad.estado = 'GESTIONADA'
    novedad.numero_transaccion_tu = cuerpo.numero_transaccion_tu.trim()
    novedad.fecha_gestion = cuerpo.fecha_gestion.trim()

    // Si es eliminación, crea la eliminación en la base y bloquea la obligación (RF50)
    if (novedad.tipo === 'ELIMINACION') {
      const ob = db.obligaciones.find((o) => o.id === novedad.obligacion_id || o.numero === novedad.referencia)
      if (ob) ob.eliminada = true

      // Como el mockup v3 (submitGestion): una obligación ya eliminada no se repite en la lista.
      const numero = ob ? ob.numero : novedad.referencia
      const yaEliminada = db.eliminaciones.some((e) => e.bloqueada && e.numero_obligacion === numero)
      if (!yaEliminada) {
        const elimId = db.eliminaciones.reduce((max, e) => Math.max(max, e.id), 0) + 1
        db.eliminaciones.unshift({
          id: elimId,
          obligacion_id: ob ? ob.id : null,
          numero_obligacion: ob ? ob.numero : novedad.referencia,
          fecha: novedad.fecha_gestion,
          motivo: novedad.motivo_eliminacion ?? { codigo: '14', descripcion: 'Por error entidad' },
          numero_transaccion_tu: novedad.numero_transaccion_tu,
          bloqueada: true,
          fecha_activacion: null,
          numero_activacion_tu: null,
        })
      }
    }

    persistir()
    return HttpResponse.json(novedad)
  }),

  // Rechazar novedad
  http.post(url(ENDPOINTS.novedadRechazar(':id')), async ({ params, request }) => {
    await espera()
    const { respuesta } = exigirSesion(SOLO_ANALISTA)
    if (respuesta) return respuesta

    const id = aEntero(params.id)
    const novedad = db.novedades.find((n) => n.id === id)
    if (!novedad) return error(404, { detail: 'Novedad no encontrada.' })
    if (novedad.estado !== 'PENDIENTE') {
      return error(409, { detail: 'La novedad no está pendiente.' })
    }

    const cuerpo = await leerCuerpo(request)
    if (!cuerpo.motivo_rechazo?.trim()) {
      return error(400, { motivo_rechazo: ['Ingresa el motivo del rechazo.'] })
    }

    novedad.estado = 'RECHAZADA'
    novedad.motivo_rechazo = cuerpo.motivo_rechazo.trim()
    persistir()
    return HttpResponse.json(novedad)
  }),

  // Listar eliminaciones (RF50): página { total, resultados }; paginación inválida → { detail } (0.9.3).
  http.get(url(ENDPOINTS.eliminaciones), async ({ request }) => {
    await espera()
    const { respuesta } = exigirSesion(SOLO_ANALISTA)
    if (respuesta) return respuesta

    const { limite, desplazamiento, error: errorPaginacion } = leerPaginacion(new URL(request.url).searchParams)
    if (errorPaginacion) return error(400, { detail: errorPaginacion })

    return HttpResponse.json({ total: db.eliminaciones.length, resultados: db.eliminaciones.slice(desplazamiento, desplazamiento + limite) })
  }),

  // Reactivar eliminación (RF50)
  http.post(url(ENDPOINTS.eliminacionReactivar(':id')), async ({ params, request }) => {
    await espera()
    const { respuesta } = exigirSesion(SOLO_ANALISTA)
    if (respuesta) return respuesta

    const id = aEntero(params.id)
    const elim = db.eliminaciones.find((e) => e.id === id)
    if (!elim) return error(404, { detail: 'Eliminación no encontrada.' })
    if (!elim.bloqueada) {
      return error(409, { detail: 'La obligación ya fue reactivada.' })
    }

    const cuerpo = await leerCuerpo(request)
    const errores = {}
    if (!cuerpo.numero_activacion_tu?.trim()) errores.numero_activacion_tu = ['Ingresa el número de la activación en TransUnion.']
    if (!fechaValida(cuerpo.fecha_activacion)) errores.fecha_activacion = [MSG_AUDIT.fechaInvalida]
    if (Object.keys(errores).length) return error(400, errores)

    elim.bloqueada = false
    elim.fecha_activacion = cuerpo.fecha_activacion.trim()
    elim.numero_activacion_tu = cuerpo.numero_activacion_tu.trim()

    // Desbloquear la obligación
    const ob = db.obligaciones.find((o) => o.id === elim.obligacion_id || o.numero === elim.numero_obligacion)
    if (ob) ob.eliminada = false

    persistir()
    return HttpResponse.json(elim)
  }),

  // Listar rectificaciones (RF55)
  http.get(url(ENDPOINTS.rectificaciones), async () => {
    await espera()
    const { respuesta } = exigirSesion(SOLO_ANALISTA)
    if (respuesta) return respuesta
    return HttpResponse.json(db.rectificaciones)
  }),

  // Crear rectificación (RF55)
  http.post(url(ENDPOINTS.rectificaciones), async ({ request }) => {
    await espera()
    const { respuesta, usuario } = exigirSesion(SOLO_ANALISTA)
    if (respuesta) return respuesta

    const cuerpo = await leerCuerpo(request)
    const errores = {}

    const obId = aEntero(cuerpo.obligacion_id)
    const corteId = aEntero(cuerpo.corte_id)

    if (!obId) errores.obligacion_id = ['Selecciona la obligación.']
    if (!corteId) errores.corte_id = ['Selecciona el corte a rectificar.']
    if (!cuerpo.campo?.trim()) errores.campo = ['Ingresa el campo a corregir.']
    if (cuerpo.valor_corregido === undefined || cuerpo.valor_corregido === null || cuerpo.valor_corregido === '') {
      errores.valor_corregido = ['Ingresa el valor corregido.']
    }
    if (!cuerpo.justificacion?.trim()) errores.justificacion = ['Escribe la justificación de la corrección.']
    if (!cuerpo.medio || !MEDIOS_VALIDOS.includes(cuerpo.medio)) {
      errores.medio = ['Selecciona el medio (Actualización en Línea o Proceso especial masivo).']
    }

    const novedadId = aEntero(cuerpo.novedad_id)
    if (cuerpo.novedad_id != null && !db.novedades.some((n) => n.id === novedadId)) errores.novedad_id = ['Novedad no encontrada.']

    if (Object.keys(errores).length) return error(400, errores)

    const ob = db.obligaciones.find((o) => o.id === obId)
    if (!ob) return error(404, { detail: 'Obligación no encontrada.' })

    const corte = db.cortes.find((c) => c.id === corteId)
    if (!corte) return error(404, { detail: 'Corte no encontrado.' })
    if (!corte.estado?.startsWith('ENVIADO')) {
      return error(409, { detail: 'Solo se rectifican cortes ya enviados a TransUnion.' })
    }

    const rectId = db.rectificaciones.reduce((max, r) => Math.max(max, r.id), 0) + 1
    const rect = {
      id: rectId,
      novedad_id: novedadId,
      obligacion_id: ob.id,
      numero_obligacion: ob.numero,
      corte_id: corte.id,
      fecha_corte: corte.fecha_corte,
      campo: cuerpo.campo.trim(),
      // El backend toma el valor anterior del corte afectado; el mock no guarda el detalle por corte.
      valor_anterior: null,
      valor_corregido: String(cuerpo.valor_corregido).trim(),
      justificacion: cuerpo.justificacion.trim(),
      medio: cuerpo.medio,
      estado: 'REGISTRADA',
      confirmacion_tu: null,
      registrada_por: usuario?.nombre ?? 'Analista',
      fecha_registro: ahoraBogotaISO(),
    }

    db.rectificaciones.unshift(rect)
    persistir()
    return HttpResponse.json(rect, { status: 201 })
  }),

  // Confirmar rectificación (RF55)
  http.post(url(ENDPOINTS.rectificacionConfirmar(':id')), async ({ params, request }) => {
    await espera()
    const { respuesta } = exigirSesion(SOLO_ANALISTA)
    if (respuesta) return respuesta

    const id = aEntero(params.id)
    const rect = db.rectificaciones.find((r) => r.id === id)
    if (!rect) return error(404, { detail: 'Rectificación no encontrada.' })
    if (rect.estado === 'CONFIRMADA') {
      return error(409, { detail: 'La rectificación ya está confirmada.' })
    }

    const cuerpo = await leerCuerpo(request)
    if (!cuerpo.confirmacion_tu?.trim()) {
      return error(400, { confirmacion_tu: ['Ingresa el número de confirmación de TransUnion.'] })
    }

    rect.estado = 'CONFIRMADA'
    rect.confirmacion_tu = cuerpo.confirmacion_tu.trim()
    persistir()
    return HttpResponse.json(rect)
  }),
]
