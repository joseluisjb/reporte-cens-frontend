// Datos de la entidad ante TransUnion (RF57, pantalla 15) del backend simulado.
// Propuesta del contrato 0.9. `GET /entidad/` es de los dos roles (el Analista ve el aviso de
// marcador en el panel y en la pantalla 12). El `PUT` (solo Administrador) llega con la pantalla 15.
import { http, HttpResponse } from 'msw'
import { ENDPOINTS } from '../../lib/api/endpoints'
import { db } from '../db'
import { espera, exigirSesion, url } from '../utilidades'

const esMarcador = (valor) => /^X+$/.test(valor)

// Lo guardado + lo que el backend calcula: si queda algún marcador y el prefijo del nombre del archivo.
export function aEntidad(e) {
  return {
    ...e,
    con_marcador: [e.tipo_entidad, e.codigo_entidad, e.codigo_sucursal].some(esMarcador),
    prefijo_archivo: `SSR${e.tipo_entidad}${e.codigo_entidad}`,
  }
}

export const entidadHandlers = [
  http.get(url(ENDPOINTS.entidad), async () => {
    await espera()
    const { respuesta } = exigirSesion()
    return respuesta ?? HttpResponse.json(aEntidad(db.entidad))
  }),
]
