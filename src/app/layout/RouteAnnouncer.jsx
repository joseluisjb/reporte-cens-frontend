import { useEffect, useState } from 'react'

// Anuncia el cambio de pantalla a los lectores de pantalla: en una app de una sola página el
// navegador no lo hace. Lee el título de la pestaña ("NexoVolt — Usuarios del Sistema") cada vez
// que cambia, sin mover el foco.
export default function RouteAnnouncer() {
  const [texto, setTexto] = useState('')
  useEffect(() => {
    let anterior = document.title
    const observador = new MutationObserver(() => {
      if (document.title !== anterior) {
        anterior = document.title
        setTexto(document.title)
      }
    })
    observador.observe(document.head, { childList: true, subtree: true, characterData: true })
    return () => observador.disconnect()
  }, [])
  return (
    <div role="status" aria-live="polite" className="sr-only">
      {texto}
    </div>
  )
}
