// Catálogo de estados y homologación del SAC (RF48, pantalla 16) del backend simulado. Propuesta del
// contrato 0.9.1, solo del Administrador (el Analista recibe 403). El PUT reemplaza la acción, el estado de
// TransUnion y si CENS lo confirmó; la prioridad no se cambia. Mismas reglas que la pantalla
// (features/state-mapping/stateMappingValidation.js).
import { http, HttpResponse } from 'msw'
import { ACCIONES, validarHomologacion } from '../../features/state-mapping/stateMappingValidation'
import { ENDPOINTS } from '../../lib/api/endpoints'
import { ESTADOS_CATALOGO } from '../datos/homologacion'
import { db, persistir } from '../db'
import { ahoraBogotaISO, error, espera, exigirSesion, leerCuerpo, SOLO_ADMIN, url } from '../utilidades'

const porPrioridad = (a, b) => a.prioridad - b.prioridad

export const homologacionHandlers = [
  http.get(url(ENDPOINTS.estadosTU), async () => {
    await espera()
    const { respuesta } = exigirSesion(SOLO_ADMIN)
    return respuesta ?? HttpResponse.json(ESTADOS_CATALOGO)
  }),

  http.get(url(ENDPOINTS.homologacionEstados), async () => {
    await espera()
    const { respuesta } = exigirSesion(SOLO_ADMIN)
    return respuesta ?? HttpResponse.json(db.homologacionEstados.toSorted(porPrioridad))
  }),

  http.put(url(ENDPOINTS.homologacionEstado(':estadoSac')), async ({ params, request }) => {
    await espera()
    const { usuario, respuesta } = exigirSesion(SOLO_ADMIN)
    if (respuesta) return respuesta
    const actual = db.homologacionEstados.find((h) => h.estado_sac === params.estadoSac)
    if (!actual) return error(404, { detail: 'Estado del SAC no encontrado.' })
    const cuerpo = await leerCuerpo(request)
    const accion = cuerpo.accion ?? null
    const estadoTu = typeof cuerpo.estado_tu === 'string' && cuerpo.estado_tu.trim() ? cuerpo.estado_tu.trim() : null
    const errores = validarHomologacion({ accion, estadoTu }, ESTADOS_CATALOGO)
    if (errores.accion || errores.estadoTu) {
      return error(400, { ...(errores.accion && { accion: [errores.accion] }), ...(errores.estadoTu && { estado_tu: [errores.estadoTu] }) })
    }
    Object.assign(actual, {
      accion,
      estado_tu: accion === ACCIONES.ESTADO ? estadoTu : null,
      confirmado: cuerpo.confirmado === true,
      actualizado_por: usuario.nombre,
      fecha_actualizacion: ahoraBogotaISO(),
    })
    persistir()
    return HttpResponse.json(actual)
  }),
]
