import { Badge } from '../../components/ui'

// Estado de un archivo generado, como el fileBd del mockup v3.
export default function EstadoArchivoBadge({ archivo }) {
  if (archivo.enviado) return <Badge tone="ok">Enviado</Badge>
  if (archivo.aptoEnvio) return <Badge tone="info">Apto para envío</Badge>
  return <Badge tone="error">No apto para envío</Badge>
}
