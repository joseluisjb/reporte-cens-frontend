// Catálogos del Manual de TransUnion (`GET /catalogos/{nombre}/`) del backend simulado.
// Propuesta del contrato 0.9. Lectura para los dos roles.
import { http, HttpResponse } from 'msw'
import { ENDPOINTS } from '../../lib/api/endpoints'
import { CATALOGOS } from '../datos/catalogos'
import { error, espera, exigirSesion, url } from '../utilidades'

export const catalogosHandlers = [
  http.get(url(ENDPOINTS.catalogo(':nombre')), async ({ params }) => {
    await espera()
    const { respuesta } = exigirSesion()
    if (respuesta) return respuesta
    if (!Object.hasOwn(CATALOGOS, params.nombre)) return error(404, { detail: 'Catálogo no encontrado.' })
    return HttpResponse.json(CATALOGOS[params.nombre])
  }),
]
