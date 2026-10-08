import { render, screen } from '@testing-library/react'
import App from '../App'

test('renderiza la página de inicio en la ruta raíz', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: /inicio/i })).toBeInTheDocument()
})
