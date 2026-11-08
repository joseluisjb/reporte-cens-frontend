import { formatearDias } from '../../lib/format'
import { descripcionEdadMora } from './catalogosTU'

// Edad de mora (Tabla 9) como en la maqueta v3: «01 - Mora 30» y, debajo, los días de mora si llegan.
export default function EdadMoraBadge({ codigo, dias }) {
  if (!codigo) return <span className="text-muted">—</span>
  return (
    <span className="whitespace-nowrap">
      {codigo} - {descripcionEdadMora(codigo)}
      {dias != null && <span className="block text-xs text-muted">{formatearDias(dias)} de mora</span>}
    </span>
  )
}
