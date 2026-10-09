import { render, screen } from '@testing-library/react'
import App from '../app/App'

test('renderiza la página de marca en la ruta raíz', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: /nexovolt/i })).toBeInTheDocument()
  expect(screen.getByText(/colores y tipografías de marca/i)).toBeInTheDocument()
})
