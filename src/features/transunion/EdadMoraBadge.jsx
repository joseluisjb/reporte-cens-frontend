import { formatearDias } from '../../lib/format'
import { TABLA_9 } from './catalogosTU'

// Edad de mora como en la maqueta v3: «Mora 30» (el código va en el `title`) y, debajo, los días de mora si los hay.
// Un código que no está en el catálogo se muestra solo (sin inventar descripción).
export default function EdadMoraBadge({ codigo, dias }) {
  if (!codigo) return <span className="text-muted">—</span>
  const descripcion = Object.hasOwn(TABLA_9, codigo) ? TABLA_9[codigo].descripcion : null
  return (
    <span className="whitespace-nowrap" title={descripcion ? `${codigo} - ${descripcion}` : undefined}>
      {descripcion || codigo}
      {dias > 0 && <span className="block text-xs text-muted">{formatearDias(dias)} de mora</span>}
    </span>
  )
}
