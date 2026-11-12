import { screen } from '@testing-library/react'
import { renderApp } from './renderApp'

// La galería /catalogo se registra solo con `import.meta.env.DEV` (AppRoutes.jsx). Vitest corre con DEV
// en true, así que aquí se comprueba el lado de desarrollo; en el build de producción Vite reemplaza
// DEV por false, la ruta no existe y la dirección lleva al inicio como cualquier otra desconocida.
describe('galería de componentes', () => {
  test('en desarrollo /catalogo está disponible', async () => {
    expect(import.meta.env.DEV).toBe(true)
    renderApp('/catalogo', null)
    expect(await screen.findByRole('heading', { name: 'Catálogo de componentes' })).toBeInTheDocument()
  })
})
