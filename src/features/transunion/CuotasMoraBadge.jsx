import { Badge } from '../../components/ui'
import { plural } from '../../lib/format'

// Cuotas en mora (RF19), como la maqueta v3: «Al día» en gris, 1 en ámbar y 2 o más en rojo.
// Sin dato (o un valor que no es un entero ≥ 0) muestra «—»: nunca se da por al día lo que no se sabe.
export default function CuotasMoraBadge({ cuotas }) {
  if (!Number.isInteger(cuotas) || cuotas < 0) return <span className="text-muted">—</span>
  if (cuotas === 0) return <Badge tone="off">Al día</Badge>
  return <Badge tone={cuotas === 1 ? 'aviso' : 'error'}>{plural(cuotas, 'cuota en mora', 'cuotas en mora')}</Badge>
}
