import { useEffect } from 'react'

// Pone el título de la pestaña: "NexoVolt — Usuarios". Úsalo en cada página.
export function usePageTitle(titulo) {
  useEffect(() => {
    document.title = `NexoVolt — ${titulo}`
  }, [titulo])
}
