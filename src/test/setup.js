import '@testing-library/jest-dom/vitest'
import { configure } from '@testing-library/react'
import { server } from '../mocks/server'
import { resetMockDb } from '../mocks/db'
import { resetCsrf } from '../lib/api'

// Margen para máquinas lentas o con varios archivos de prueba en paralelo.
configure({ asyncUtilTimeout: 4000 })

// Toda prueba habla con el backend simulado; una llamada sin handler hace fallar la prueba.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  resetMockDb()
  resetCsrf()
})
afterAll(() => server.close())
