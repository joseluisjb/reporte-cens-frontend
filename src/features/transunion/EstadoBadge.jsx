import { Badge } from '../../components/ui'
import { descripcionEstado } from './catalogosTU'

// Colores de la maqueta v3: 01 verde, 02 azul, 03 ámbar, 06 rojo, 07 turquesa; 04, 08, 10, 11 y 12 gris.
const TONO_POR_ESTADO = { '01': 'ok', '02': 'info', '03': 'aviso', '06': 'error', '07': 'turquesa' }

// Estado de la obligación (Tabla 4b) como «01 · Vigente». `descripcion` viene de la API si la trae;
// si no, sale del catálogo. Sin código (obligación que aún no tiene estado) muestra «Sin estado».
export default function EstadoBadge({ codigo, descripcion }) {
  if (!codigo) return <span className="text-sm text-muted">Sin estado</span>
  return (
    <Badge tone={TONO_POR_ESTADO[codigo] ?? 'off'}>
      {codigo} · {descripcion ?? descripcionEstado(codigo)}
    </Badge>
  )
}
