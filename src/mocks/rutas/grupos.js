// Rutas de grupos de conceptos (RF43) del backend simulado, como las responde el backend real
// (reporte-cens-backend, rama dev). Lectura: Analista y Administrador. Escritura: solo Administrador
// (decisión del contrato, diferencia A). Validaciones en español (diferencia L) y códigos repetidos
// rechazados con 400 (diferencia O); el backend de hoy no hace ninguna de las dos cosas.
import { http, HttpResponse } from 'msw'
import { ENDPOINTS } from '../../lib/api/endpoints'
import { db, persistir } from '../db'
import { aEntero, error, espera, exigirSesion, hoyLocalISO, idDeRuta, leerCuerpo, url } from '../utilidades'

const sinGrupo = () => error(404, { detail: 'Grupo no encontrado.' })
const esCodigo = (v) => Number.isInteger(v) && v >= 1 && v <= 9999

// { id, nombre, activo, conceptos: [{ codigo, descripcion }] (por código), creado }
function aRespuesta({ id, nombre, activo, conceptos, creado }) {
  return {
    id,
    nombre,
    activo,
    conceptos: conceptos
      .toSorted((a, b) => a - b)
      .map((codigo) => ({ codigo, descripcion: db.conceptos.find((c) => c.codigo === codigo)?.descripcion ?? '' })),
    creado,
  }
}

// Lee el cuerpo y pasa los códigos de `conceptos` a entero como DRF ("30" → 30); lo que no sea entero
// se deja tal cual para que la validación lo rechace.
async function leerCuerpoGrupo(request) {
  const cuerpo = await leerCuerpo(request)
  return Array.isArray(cuerpo.conceptos) ? { ...cuerpo, conceptos: cuerpo.conceptos.map((c) => aEntero(c) ?? c) } : cuerpo
}

// Valida los campos presentes. En el POST, `nombre` y `conceptos` son obligatorios.
function validar(cuerpo, { crear }) {
  const errores = {}
  if (crear || cuerpo.nombre !== undefined) {
    const nombre = typeof cuerpo.nombre === 'string' ? cuerpo.nombre.trim() : ''
    if (!nombre) errores.nombre = ['Ingresa el nombre del grupo.']
    else if (nombre.length > 60) errores.nombre = ['El nombre admite máximo 60 caracteres.']
  }
  if (crear || cuerpo.conceptos !== undefined) {
    const { conceptos } = cuerpo
    if (!Array.isArray(conceptos) || conceptos.length === 0) errores.conceptos = ['Selecciona al menos un concepto.']
    else if (!conceptos.every(esCodigo)) errores.conceptos = ['Cada concepto debe ser un número entero entre 1 y 9999.']
    else if (new Set(conceptos).size !== conceptos.length) errores.conceptos = ['No repitas conceptos.']
  }
  if (cuerpo.activo !== undefined && typeof cuerpo.activo !== 'boolean') errores.activo = ['El estado debe ser verdadero o falso.']
  return errores
}

// 400 con el primer código que no existe o está inactivo, o null si todos sirven.
function errorDeConceptos(codigos) {
  const malo = codigos.find((codigo) => !db.conceptos.some((c) => c.codigo === codigo && c.activo))
  return malo === undefined ? null : error(400, { detail: `El concepto ${malo} no existe o no está activo.` })
}

// El nombre es único (comparación exacta tras recortar); `excluirId` deja fuera al propio grupo.
const nombreRepetido = (nombre, excluirId) => db.grupos.some((g) => g.id !== excluirId && g.nombre === nombre)
const errorNombreRepetido = () => error(409, { detail: 'El nombre de grupo ya existe.' })

export const gruposHandlers = [
  http.get(url(ENDPOINTS.gruposConceptos), async () => {
    await espera()
    const { respuesta } = exigirSesion()
    return respuesta ?? HttpResponse.json(db.grupos.toSorted((a, b) => a.id - b.id).map(aRespuesta))
  }),

  http.get(url(ENDPOINTS.grupoConceptos(':id')), async ({ params }) => {
    await espera()
    const { respuesta } = exigirSesion()
    if (respuesta) return respuesta
    const grupo = db.grupos.find((g) => g.id === idDeRuta(params.id))
    return grupo ? HttpResponse.json(aRespuesta(grupo)) : sinGrupo()
  }),

  http.post(url(ENDPOINTS.gruposConceptos), async ({ request }) => {
    await espera()
    const { respuesta } = exigirSesion(true)
    if (respuesta) return respuesta
    const cuerpo = await leerCuerpoGrupo(request)
    const errores = validar(cuerpo, { crear: true })
    if (Object.keys(errores).length) return error(400, errores)
    const errorConceptos = errorDeConceptos(cuerpo.conceptos)
    if (errorConceptos) return errorConceptos
    const nombre = cuerpo.nombre.trim()
    if (nombreRepetido(nombre)) return errorNombreRepetido()
    const nuevo = { id: db.siguienteGrupoId++, nombre, activo: cuerpo.activo ?? true, conceptos: [...cuerpo.conceptos], creado: hoyLocalISO() }
    db.grupos.push(nuevo)
    persistir()
    return HttpResponse.json(aRespuesta(nuevo), { status: 201 })
  }),

  http.patch(url(ENDPOINTS.grupoConceptos(':id')), async ({ request, params }) => {
    await espera()
    const { respuesta } = exigirSesion(true)
    if (respuesta) return respuesta
    const grupo = db.grupos.find((g) => g.id === idDeRuta(params.id))
    if (!grupo) return sinGrupo()
    const cuerpo = await leerCuerpoGrupo(request)
    const errores = validar(cuerpo, { crear: false })
    if (Object.keys(errores).length) return error(400, errores)
    const nombre = cuerpo.nombre?.trim()
    if (nombre !== undefined && nombreRepetido(nombre, grupo.id)) return errorNombreRepetido()
    if (cuerpo.conceptos !== undefined) {
      const errorConceptos = errorDeConceptos(cuerpo.conceptos)
      if (errorConceptos) return errorConceptos
      grupo.conceptos = [...cuerpo.conceptos] // reemplaza la lista completa
    }
    if (nombre !== undefined) grupo.nombre = nombre
    if (cuerpo.activo !== undefined) grupo.activo = cuerpo.activo
    persistir()
    return HttpResponse.json(aRespuesta(grupo))
  }),

  http.delete(url(ENDPOINTS.grupoConceptos(':id')), async ({ params }) => {
    await espera()
    const { respuesta } = exigirSesion(true)
    if (respuesta) return respuesta
    const grupo = db.grupos.find((g) => g.id === idDeRuta(params.id))
    if (!grupo) return sinGrupo()
    if (db.cortes.some((c) => c.grupo_id === grupo.id && c.estado === 'BORRADOR')) {
      return error(409, { detail: 'El grupo está asociado a un corte en estado BORRADOR.' })
    }
    db.grupos = db.grupos.filter((g) => g.id !== grupo.id)
    persistir()
    return new HttpResponse(null, { status: 204 })
  }),
]
