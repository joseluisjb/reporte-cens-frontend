import { formatearDias } from '../../lib/format'
import { TABLA_9 } from './catalogosTU'

// Edad de mora (Tabla 9) como en la maqueta v3: «01 - Mora 30» y, debajo, los días de mora si los hay.
// Un código que no está en la Tabla 9 se muestra solo (sin inventar descripción).
export default function EdadMoraBadge({ codigo, dias }) {
  if (!codigo) return <span className="text-muted">—</span>
  const descripcion = Object.hasOwn(TABLA_9, codigo) ? TABLA_9[codigo].descripcion : null
  return (
    <span className="whitespace-nowrap">
      {descripcion ? `${codigo} - ${descripcion}` : codigo}
      {dias > 0 && <span className="block text-xs text-muted">{formatearDias(dias)} de mora</span>}
    </span>
  )
}
