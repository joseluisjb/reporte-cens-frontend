// Guarda el cuerpo de cada POST /auth/logout/ (objeto, o null si va vacío) sin reemplazar el mock:
// el manejador no responde nada, así que MSW sigue con el de src/mocks/rutas/auth.js.
import { http } from 'msw'
import { ENDPOINTS } from '../lib/api/endpoints'
import { API_URL } from '../lib/config'
import { server } from '../mocks/server'

export function espiarLogout() {
  const cuerpos = []
  server.use(
    http.post(`${API_URL}${ENDPOINTS.logout}`, async ({ request }) => {
      const texto = await request.clone().text()
      cuerpos.push(texto ? JSON.parse(texto) : null)
    }),
  )
  return cuerpos
}
