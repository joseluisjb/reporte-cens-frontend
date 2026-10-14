// Verificación de que las respuestas de los mocks cumplen el contrato `docs/contrato/openapi.yaml`.
// Solo lo importan las pruebas (nunca la app), así que no entra al paquete de producción.
//
// Cómo funciona: se registra TODO el contrato en Ajv con el id 'contrato'. Para validar una respuesta
// se toma un puntero JSON hacia su esquema (por ejemplo
// 'contrato#/paths/~1conceptos~1/get/responses/200/content/application~1json/schema') y Ajv resuelve
// los `$ref: '#/components/schemas/...'` internos por su cuenta. Lo único que se resuelve a mano es
// la respuesta reutilizable (`$ref: '#/components/responses/X'`), porque no es un esquema sino una
// respuesta completa. `nullable: true` (OpenAPI 3.0) lo entiende Ajv cuando el esquema trae `type`.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import { parse } from 'yaml'

const doc = parse(readFileSync(resolve(process.cwd(), 'docs/contrato/openapi.yaml'), 'utf-8'))

// strict:false por las palabras propias de OpenAPI (`example`, `x-roles`, `nullable` suelto...).
const ajv = new Ajv({ strict: false, allErrors: true })
addFormats(ajv)
ajv.addFormat('password', true) // OpenAPI lo usa como pista de interfaz; no hay nada que validar
ajv.addSchema({ ...doc, $id: 'contrato' })

const escapar = (clave) => clave.replaceAll('~', '~0').replaceAll('/', '~1') // RFC 6901
const desescapar = (clave) => clave.replaceAll('~1', '/').replaceAll('~0', '~')

// Sigue un puntero '#/a/b/c' dentro del contrato.
const enContrato = (puntero) => puntero.slice(2).split('/').reduce((nodo, clave) => nodo?.[desescapar(clave)], doc)

const validadores = new Map()

// Devuelve { validar, punteroEsquema } de la respuesta, o { sinCuerpo: true } si no declara contenido.
function validadorDe(metodo, ruta, status) {
  const clave = `${metodo} ${ruta} ${status}`
  if (validadores.has(clave)) return validadores.get(clave)

  let respuesta = doc.paths?.[ruta]?.[metodo]?.responses?.[String(status)]
  if (!respuesta) throw new Error(`El contrato no define ${metodo.toUpperCase()} ${ruta} con respuesta ${status}.`)

  let base = `#/paths/${escapar(ruta)}/${metodo}/responses/${status}`
  if (respuesta.$ref) {
    base = respuesta.$ref // '#/components/responses/Unauthorized'
    respuesta = enContrato(base)
  }
  const contenido = respuesta?.content?.['application/json']?.schema
  let resultado
  if (!contenido) resultado = { sinCuerpo: true }
  else {
    const validar = ajv.getSchema(`contrato${base}/content/application~1json/schema`)
    if (!validar) throw new Error(`No se pudo compilar el esquema de ${metodo.toUpperCase()} ${ruta} ${status}.`)
    resultado = { validar }
  }
  validadores.set(clave, resultado)
  return resultado
}

// Lanza un Error si `data` (el cuerpo de la respuesta) no cumple el contrato para ese método, ruta y
// estado. `ruta` es la clave exacta de `paths`, por ejemplo '/conceptos/{codigo}/'.
export function expectCumpleContrato(metodo, ruta, status, data) {
  const m = metodo.toLowerCase()
  const { validar, sinCuerpo } = validadorDe(m, ruta, status)
  const etiqueta = `${m.toUpperCase()} ${ruta} ${status}`
  if (sinCuerpo) {
    const vacio = data === undefined || data === null || data === ''
    if (!vacio) throw new Error(`${etiqueta}: el contrato no declara cuerpo y la respuesta trae ${JSON.stringify(data)}.`)
    return
  }
  if (!validar(data)) {
    throw new Error(`${etiqueta} no cumple el contrato: ${ajv.errorsText(validar.errors, { dataVar: 'cuerpo' })}\nRespuesta: ${JSON.stringify(data)}`)
  }
}

// Lo mismo para lo que ENVÍA el frontend: valida `data` contra el `requestBody` de la operación.
export function expectPeticionCumpleContrato(metodo, ruta, data) {
  const m = metodo.toLowerCase()
  const etiqueta = `${m.toUpperCase()} ${ruta} (petición)`
  if (!doc.paths?.[ruta]?.[m]?.requestBody?.content?.['application/json']?.schema) {
    throw new Error(`El contrato no define el cuerpo de ${etiqueta}.`)
  }
  const validar = ajv.getSchema(`contrato#/paths/${escapar(ruta)}/${m}/requestBody/content/application~1json/schema`)
  if (!validar(data)) {
    throw new Error(`${etiqueta} no cumple el contrato: ${ajv.errorsText(validar.errors, { dataVar: 'cuerpo' })}\nPetición: ${JSON.stringify(data)}`)
  }
}
