// Tabla «Archivos generados» de la pantalla 12 (mockup v3). Cada fila se puede descargar. Registrar el
// envío y cargar los resultados de TransUnion llegan con RF54 (pantalla 12, parte 2).
import { memo } from 'react'
import { Button, Table } from '../../components/ui'
import { formatearCOP, formatearFechaHora, formatearFechaISO } from '../../lib/format'
import EstadoArchivoBadge from './EstadoArchivoBadge'

export default function FilesTable({ archivos, onDescargar, descargandoId }) {
  return (
    <Table compact caption="Archivos generados">
      <thead>
        <tr>
          <th scope="col">Fecha y hora</th>
          <th scope="col">Usuario</th>
          <th scope="col">Fecha de corte</th>
          <th scope="col" className="text-right!">
            Obligaciones
          </th>
          <th scope="col" className="text-right!">
            Saldo
          </th>
          <th scope="col">Archivo</th>
          <th scope="col">Estado</th>
          <th scope="col">
            <span className="sr-only">Acciones</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {archivos.map((a) => (
          <Fila key={a.id} archivo={a} onDescargar={onDescargar} descargando={descargandoId === a.id} />
        ))}
      </tbody>
    </Table>
  )
}

// `onDescargar` es estable en la página: descargar un archivo solo vuelve a dibujar su fila.
const Fila = memo(function Fila({ archivo: a, onDescargar, descargando }) {
  return (
    <tr>
      <td className="font-mono whitespace-nowrap">{formatearFechaHora(a.fechaGeneracion)}</td>
      <td className="whitespace-nowrap">{a.generadoPor ?? '—'}</td>
      <td className="whitespace-nowrap">{formatearFechaISO(a.fechaCorte)}</td>
      <td className="text-right">{a.nRegistros}</td>
      <td className="text-right whitespace-nowrap">{formatearCOP(a.saldoTotal)}</td>
      <td className="font-mono">{a.nombre}</td>
      <td className="whitespace-nowrap">
        <EstadoArchivoBadge archivo={a} />
      </td>
      <td className="whitespace-nowrap">
        <Button variant="outline" size="sm" loading={descargando} onClick={() => onDescargar(a)} aria-label={`Descargar el archivo ${a.nombre}`}>
          Descargar
        </Button>
      </td>
    </tr>
  )
})
