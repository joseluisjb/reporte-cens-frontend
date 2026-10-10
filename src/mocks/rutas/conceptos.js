// Rutas de conceptos de energía (RF35) del backend simulado, como las responde el backend real
// (reporte-cens-backend, rama dev). Lectura: Analista y Administrador. Escritura: solo Administrador
// (decisión del contrato, diferencia A; el backend de hoy deja escribir también al Analista).
// Las validaciones salen en español (diferencia L: el backend de hoy responde en inglés).
// No hay GET de detalle ni DELETE. El concepto no trae fecha de creación (diferencia B).
import { http, HttpResponse } from 'msw'
import { ENDPOINTS } from '../../lib/api/endpoints'
import { db, persistir } from '../db'
import { aEntero, error, espera, exigirSesion, idDeRuta, leerCuerpo, url } from '../utilidades'

const esTexto = (v) => typeof v === 'string'

// Forma exacta de la respuesta: { codigo, descripcion, activo, observacion }.
const aRespuesta = ({ codigo, descripcion, activo, observacion }) => ({ codigo, descripcion, activo, observacion })

const sinConcepto = () => error(404, { detail: 'Concepto no encontrado.' })

// Valida los campos presentes. En el POST, `codigo` y `descripcion` son obligatorios.
function validar(cuerpo, { crear }) {
  const errores = {}
  if (crear) {
    const { codigo } = cuerpo
    const entero = aEntero(codigo) // como DRF: acepta 30 y "30", rechaza 30.5, true y texto
    if (codigo === undefined || codigo === null || (typeof codigo === 'string' && !codigo.trim())) errores.codigo = ['Ingresa el código del concepto.']
    else if (entero === null || entero < 1 || entero > 9999) errores.codigo = ['El código debe ser un número entero entre 1 y 9999.']
  }
  if (crear || cuerpo.descripcion !== undefined) {
    const descripcion = esTexto(cuerpo.descripcion) ? cuerpo.descripcion.trim() : ''
    if (!descripcion) errores.descripcion = ['Ingresa la descripción.']
    else if (descripcion.length > 60) errores.descripcion = ['La descripción admite máximo 60 caracteres.']
  }
  const { observacion } = cuerpo
  if (observacion !== undefined && observacion !== null) {
    if (!esTexto(observacion) || observacion.trim().length > 200) errores.observacion = ['La observación admite máximo 200 caracteres.']
  }
  if (cuerpo.activo !== undefined && typeof cuerpo.activo !== 'boolean') errores.activo = ['El estado debe ser verdadero o falso.']
  return errores
}

// Observación recortada; en blanco se guarda como null.
const observacionLimpia = (v) => (esTexto(v) && v.trim() ? v.trim() : null)

export const conceptosHandlers = [
  http.get(url(ENDPOINTS.conceptos), async ({ request }) => {
    await espera()
    const { respuesta } = exigirSesion()
    if (respuesta) return respuesta
    // `?activo=` solo vale si es exactamente 'true' o 'false'; cualquier otro valor se ignora.
    const filtro = new URL(request.url).searchParams.get('activo')
    const lista = db.conceptos
      .filter((c) => (filtro === 'true' ? c.activo : filtro === 'false' ? !c.activo : true))
      .toSorted((a, b) => a.codigo - b.codigo)
    return HttpResponse.json(lista.map(aRespuesta))
  }),

  http.post(url(ENDPOINTS.conceptos), async ({ request }) => {
    await espera()
    const { respuesta } = exigirSesion(true)
    if (respuesta) return respuesta
    const cuerpo = await leerCuerpo(request)
    const errores = validar(cuerpo, { crear: true })
    if (Object.keys(errores).length) return error(400, errores)
    const codigo = aEntero(cuerpo.codigo)
    if (db.conceptos.some((c) => c.codigo === codigo)) return error(409, { detail: 'El código de concepto ya existe.' })
    const nuevo = {
      codigo,
      descripcion: cuerpo.descripcion.trim(),
      activo: cuerpo.activo ?? true,
      observacion: observacionLimpia(cuerpo.observacion),
    }
    db.conceptos.push(nuevo)
    persistir()
    return HttpResponse.json(aRespuesta(nuevo), { status: 201 })
  }),

  http.patch(url(ENDPOINTS.concepto(':codigo')), async ({ request, params }) => {
    await espera()
    const { respuesta } = exigirSesion(true)
    if (respuesta) return respuesta
    const concepto = db.conceptos.find((c) => c.codigo === idDeRuta(params.codigo))
    if (!concepto) return sinConcepto()
    const cuerpo = await leerCuerpo(request)
    const errores = validar(cuerpo, { crear: false })
    if (Object.keys(errores).length) return error(400, errores)
    if (cuerpo.descripcion !== undefined) concepto.descripcion = cuerpo.descripcion.trim()
    if (cuerpo.activo !== undefined) concepto.activo = cuerpo.activo
    if (cuerpo.observacion !== undefined) concepto.observacion = observacionLimpia(cuerpo.observacion)
    persistir()
    return HttpResponse.json(aRespuesta(concepto))
  }),
]
