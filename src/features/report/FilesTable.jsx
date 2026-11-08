// Tabla «Archivos generados» de la pantalla 12 (mockup v3). Cada fila se puede descargar y, como en el
// mockup, ofrece la acción que le toca: «Registrar envío» si es apto (con fecha y confirmación), «Cargar
// resultados» si ya se envió y «Ver resultados» si ya los tiene (RF54). «Registrar envío» solo aparece en el archivo más reciente de un
// corte VALIDADO, que es el que el backend marca como enviado (contrato 0.9, `registrar-envio`).
import { memo } from 'react'
import { Button, Icon, Table } from '../../components/ui'
import { formatearCOP, formatearFechaHora, formatearFechaISO } from '../../lib/format'
import EstadoArchivoBadge from './EstadoArchivoBadge'

// `descargando`: Set con los ids de los archivos que se están descargando. `enviables`: Set con los ids
// de los archivos cuyo envío se puede registrar. `ultimos`: Set con el archivo más reciente de cada corte.
export default function FilesTable({ archivos, onDescargar, descargando, ultimos, enviables, onRegistrarEnvio, onCargarResultados, onVerResultados }) {
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
          <th scope="col">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {archivos.map((a) => (
          <Fila
            key={a.id}
            archivo={a}
            onDescargar={onDescargar}
            descargando={descargando.has(a.id)}
            esUltimo={ultimos.has(a.id)}
            enviable={enviables.has(a.id)}
            onRegistrarEnvio={onRegistrarEnvio}
            onCargarResultados={onCargarResultados}
            onVerResultados={onVerResultados}
          />
        ))}
      </tbody>
    </Table>
  )
}

// Los manejadores son estables en la página: una acción sobre un archivo solo vuelve a dibujar su fila.
const Fila = memo(function Fila({ archivo: a, onDescargar, descargando, esUltimo, enviable, onRegistrarEnvio, onCargarResultados, onVerResultados }) {
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
      <td>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" loading={descargando} onClick={() => onDescargar(a)} aria-label={`Descargar el archivo ${a.nombre}`}>
            Descargar
          </Button>
          <AccionDeEnvio
            archivo={a}
            esUltimo={esUltimo}
            enviable={enviable}
            onRegistrarEnvio={onRegistrarEnvio}
            onCargarResultados={onCargarResultados}
            onVerResultados={onVerResultados}
          />
        </div>
      </td>
    </tr>
  )
})

function AccionDeEnvio({ archivo: a, esUltimo, enviable, onRegistrarEnvio, onCargarResultados, onVerResultados }) {
  if (a.enviado) {
    // Con resultados, «Cargar resultados» sigue disponible para los archivos de TransUnion que lleguen
    // después: el nuevo cargue reemplaza al anterior (decisión del equipo; el mockup solo deja ver).
    return (
      <>
        {a.tieneResultados && (
          <Button variant="outline" size="sm" onClick={() => onVerResultados(a)} aria-label={`Ver los resultados del archivo ${a.nombre}`}>
            Ver resultados
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => onCargarResultados(a)} aria-label={`Cargar los resultados del archivo ${a.nombre}`}>
          {/* El mockup v3 usa este ícono (L1381). */}
          <Icon name="download" size={14} />
          Cargar resultados
        </Button>
      </>
    )
  }
  // Una versión anterior del corte ya no se envía: no pide nada.
  if (!esUltimo) return null
  if (!a.aptoEnvio) return <span className="text-xs whitespace-nowrap text-muted">Requiere los datos de la entidad</span>
  if (!enviable) return null
  return (
    <Button variant="outline" size="sm" onClick={() => onRegistrarEnvio(a)} aria-label={`Registrar el envío del archivo ${a.nombre}`}>
      Registrar envío
    </Button>
  )
}
