import '@testing-library/jest-dom/vitest'
import { server } from '../mocks/server'
import { resetMockDb } from '../mocks/db'
import { resetCsrf } from '../lib/api'

// Toda prueba habla con el backend simulado; una llamada sin handler hace fallar la prueba.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  resetMockDb()
  resetCsrf()
})
afterAll(() => server.close())
