// Tarjeta «Archivo generado» de la pantalla 12 (mockup v3: vReporteRes): nombre, estado, aviso de «no apto
// para envío» con su motivo (RF57), los conteos de registros y «Descargar archivo» (RF20).
import { useId } from 'react'
import { Alert, Button, Card, Dato, Icon } from '../../components/ui'
import { formatearCOP, formatearFechaISOLarga, plural } from '../../lib/format'
import EstadoArchivoBadge from './EstadoArchivoBadge'

export default function GeneratedFileCard({ archivo, onDescargar, descargando }) {
  const id = useId()
  return (
    <Card as="section" aria-labelledby={id} className="mb-5 p-6">
      <div className="mb-4 flex flex-wrap items-start gap-3">
        <span className="mt-0.5 text-bosque-d">
          <Icon name="file" size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={id} className="font-semibold">
            Archivo generado
          </h2>
          <div className="font-mono text-sm text-muted">{archivo.nombre}</div>
        </div>
        <EstadoArchivoBadge archivo={archivo} />
      </div>
      {!archivo.aptoEnvio && (
        <div className="mb-4">
          <Alert>
            <b>No apto para envío:</b> {archivo.motivoNoApto ?? 'TransUnion lo rechazaría.'} Sirve para revisar el contenido.
          </Alert>
        </div>
      )}
      <dl className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Dato etiqueta="Obligaciones (registros 2)" valor={archivo.nRegistros} nota={`${plural(archivo.totalRegistros, 'registro', 'registros')} con el 1 y el 9`} />
        <Dato etiqueta="No incluidas" valor={archivo.nExcluidas} nota="Cerradas antes o eliminadas" />
        <Dato etiqueta="Fecha de corte" valor={formatearFechaISOLarga(archivo.fechaCorte)} />
        <Dato etiqueta="Saldo del archivo" valor={formatearCOP(archivo.saldoTotal)} />
      </dl>
      <Button onClick={() => onDescargar(archivo)} loading={descargando}>
        {!descargando && <Icon name="download" size={16} />}
        Descargar archivo
      </Button>
      <p className="mt-2 text-xs text-muted">
        Texto de longitud fija en Windows-1252: registro 1 (29 caracteres), un registro 2 por obligación ({archivo.longitudRegistroTipo2} caracteres, por confirmar
        con TransUnion) y registro 9 (33).
      </p>
    </Card>
  )
}
