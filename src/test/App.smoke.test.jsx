import { screen } from '@testing-library/react'
import { renderApp } from './renderApp'

test('una ruta desconocida redirige al inicio', async () => {
  renderApp('/no-existe')
  expect(await screen.findByRole('heading', { name: /bienvenido, rosa/i })).toBeInTheDocument()
})
