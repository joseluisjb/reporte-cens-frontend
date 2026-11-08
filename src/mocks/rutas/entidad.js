// Datos de la entidad ante TransUnion (RF57, pantalla 15) del backend simulado. Propuesta del contrato 0.9.
// `GET /entidad/` es de los dos roles (el Analista ve el aviso de marcador en el panel y en la
// pantalla 12); `PUT /entidad/` es solo del Administrador y reemplaza los tres datos.
import { http, HttpResponse } from 'msw'
import { MSG_ENTIDAD, SUCURSAL, tieneMarcador, TRES_DIGITOS } from '../../features/entity/entityValidation'
import { ENDPOINTS } from '../../lib/api/endpoints'
import { db, persistir } from '../db'
import { ahoraBogotaISO, error, espera, exigirSesion, leerCuerpo, SOLO_ADMIN, url } from '../utilidades'

const MSG_REQUERIDO = 'Este campo es requerido.'
// Campo del contrato → [patrón, mensaje]. Mismas reglas que features/entity/entityValidation.js.
const CAMPOS = {
  tipo_entidad: [TRES_DIGITOS, MSG_ENTIDAD.tipoEntidad],
  codigo_entidad: [TRES_DIGITOS, MSG_ENTIDAD.codigoEntidad],
  codigo_sucursal: [SUCURSAL, MSG_ENTIDAD.codigoSucursal],
}

// Lo guardado + lo que el backend calcula: si queda algún marcador y el prefijo del nombre del archivo.
export function aEntidad(e) {
  return {
    ...e,
    con_marcador: [e.tipo_entidad, e.codigo_entidad, e.codigo_sucursal].some(tieneMarcador),
    prefijo_archivo: `SSR${e.tipo_entidad}${e.codigo_entidad}`,
  }
}

export const entidadHandlers = [
  http.get(url(ENDPOINTS.entidad), async () => {
    await espera()
    const { respuesta } = exigirSesion()
    return respuesta ?? HttpResponse.json(aEntidad(db.entidad))
  }),

  http.put(url(ENDPOINTS.entidad), async ({ request }) => {
    await espera()
    const { usuario, respuesta } = exigirSesion(SOLO_ADMIN)
    if (respuesta) return respuesta
    const cuerpo = await leerCuerpo(request)
    const errores = {}
    const datos = {}
    for (const [campo, [patron, mensaje]] of Object.entries(CAMPOS)) {
      const valor = typeof cuerpo[campo] === 'string' ? cuerpo[campo].trim() : ''
      if (!valor) errores[campo] = [MSG_REQUERIDO]
      else if (!patron.test(valor)) errores[campo] = [mensaje]
      else datos[campo] = valor
    }
    if (Object.keys(errores).length) return error(400, errores)
    db.entidad = { ...datos, actualizado_por: usuario.nombre, fecha_actualizacion: ahoraBogotaISO() }
    persistir()
    return HttpResponse.json(aEntidad(db.entidad))
  }),
]
