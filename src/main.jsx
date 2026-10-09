import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App.jsx'

// Con VITE_USE_MOCKS=true las llamadas a la API las responde MSW (datos ficticios).
// La condición va escrita así para que Vite elimine los mocks del build cuando es 'false'.
async function arrancar() {
  if (import.meta.env.VITE_USE_MOCKS === 'true') {
    const { worker } = await import('./mocks/browser')
    await worker.start({ onUnhandledRequest: 'bypass', quiet: true })
  }
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

arrancar()
