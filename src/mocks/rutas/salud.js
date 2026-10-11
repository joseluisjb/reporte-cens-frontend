// Ruta de salud del backend simulado: responde sin sesión.
import { http, HttpResponse } from 'msw'
import { ENDPOINTS } from '../../lib/api/endpoints'
import { url } from '../utilidades'

export const saludHandlers = [http.get(url(ENDPOINTS.salud), () => HttpResponse.json({ estado: 'ok' }))]
