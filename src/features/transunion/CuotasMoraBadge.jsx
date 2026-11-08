import { Badge } from '../../components/ui'
import { plural } from '../../lib/format'

// Cuotas en mora (RF19), como la maqueta v3: «Al día» en gris, 1 en ámbar y 2 o más en rojo.
export default function CuotasMoraBadge({ cuotas }) {
  if (!cuotas) return <Badge tone="off">Al día</Badge>
  return <Badge tone={cuotas === 1 ? 'aviso' : 'error'}>{plural(cuotas, 'cuota en mora', 'cuotas en mora')}</Badge>
}
