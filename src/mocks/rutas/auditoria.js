// Ruta del log de auditoría (RF30) del backend simulado. SOLO Administrador (el Analista recibe 403).
// Igual que el backend real (contrato 0.6). Responde `{ total, resultados }`, más reciente
// primero, con los filtros `desde`, `hasta`, `usuario`, `tipo_accion` y `modulo` y los mismos 400 del contrato.
import { http, HttpResponse } from 'msw'
import { MODULOS_AUDITORIA, TIPOS_ACCION } from '../../features/audit/auditMapper'
import { esFechaISO, MSG_AUDIT } from '../../features/audit/auditValidation'
import { ENDPOINTS } from '../../lib/api/endpoints'
import { registrosAuditoria } from '../datos/auditoria'
import { aEntero, error, espera, exigirSesion, url } from '../utilidades'
import { leerPaginacion } from './extracciones'

const MSG_USUARIO = 'Indica el id numérico del usuario.'
const MSG_TIPO = 'Tipo de acción no válido.'
const MSG_MODULO = 'Módulo no válido.'

// Lee los filtros de la consulta → { filtros } o { errores } ({ campo: ['mensaje'] }, como DRF).
// Un filtro vacío (`?desde=`) se ignora, igual que si no viniera.
export function leerFiltros(params) {
  const valor = (nombre) => (params.get(nombre) ?? '').trim()
  const errores = {}
  const filtros = {}

  const desde = valor('desde')
  const hasta = valor('hasta')
  if (desde) {
    if (esFechaISO(desde)) filtros.desde = desde
    else errores.desde = [MSG_AUDIT.fechaInvalida]
  }
  if (hasta) {
    if (esFechaISO(hasta)) filtros.hasta = hasta
    else errores.hasta = [MSG_AUDIT.fechaInvalida]
  }
  if (filtros.desde && filtros.hasta && filtros.hasta < filtros.desde) errores.hasta = [MSG_AUDIT.hastaAnterior]

  const usuario = valor('usuario')
  if (usuario) {
    const id = aEntero(usuario)
    if (id === null || id < 1) errores.usuario = [MSG_USUARIO] // el backend exige un id de 1 en adelante
    else filtros.usuario = id
  }
  const tipo = valor('tipo_accion')
  if (tipo) {
    if (Object.hasOwn(TIPOS_ACCION, tipo)) filtros.tipo_accion = tipo
    else errores.tipo_accion = [MSG_TIPO]
  }
  const modulo = valor('modulo')
  if (modulo) {
    if (MODULOS_AUDITORIA.includes(modulo)) filtros.modulo = modulo
    else errores.modulo = [MSG_MODULO]
  }

  return Object.keys(errores).length ? { errores } : { filtros }
}

function cumple(registro, { desde, hasta, usuario, tipo_accion: tipo, modulo }) {
  const dia = registro.fecha_hora.slice(0, 10) // la fecha ya viene en hora de Colombia
  if (desde && dia < desde) return false
  if (hasta && dia > hasta) return false
  if (usuario !== undefined && registro.usuario_id !== usuario) return false
  if (tipo && registro.tipo_accion !== tipo) return false
  if (modulo && registro.modulo !== modulo) return false
  return true
}

export const auditoriaHandlers = [
  http.get(url(ENDPOINTS.auditoria), async ({ request }) => {
    await espera()
    const { respuesta } = exigirSesion(true)
    if (respuesta) return respuesta
    const params = new URL(request.url).searchParams
    const { filtros, errores } = leerFiltros(params)
    if (errores) return error(400, errores)
    const pagina = leerPaginacion(params)
    if (pagina.error) return error(400, { detail: pagina.error })

    const filas = registrosAuditoria()
      .filter((r) => cumple(r, filtros))
      .toSorted((a, b) => (a.fecha_hora < b.fecha_hora ? 1 : a.fecha_hora > b.fecha_hora ? -1 : b.id - a.id)) // más reciente primero
    return HttpResponse.json({ total: filas.length, resultados: filas.slice(pagina.desplazamiento, pagina.desplazamiento + pagina.limite) })
  }),
]
