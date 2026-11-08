import { Tag } from '../../components/ui'

// Etiqueta del requerimiento que aplica una regla (ej. «RF15»), como el `.rf` de la maqueta v3.
export default function RfTag({ children }) {
  return <Tag>{children}</Tag>
}
