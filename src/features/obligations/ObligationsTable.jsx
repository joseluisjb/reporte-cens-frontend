// Tabla de obligaciones de la pantalla 9 (mockup v3: oblRows). El número abre el detalle; las cerradas
// llevan candado (RF13, RF16) y las etiquetas «Primer reporte», «Revisar», «Eliminada en TransUnion»,
// «En reclamo» y «Caducado en el SAC» salen de los campos del contrato.
import { memo } from 'react'
import { Badge, Table } from '../../components/ui'
import { formatearCOP } from '../../lib/format'
import CandadoCerrada from '../transunion/CandadoCerrada'
import CuotasMoraBadge from '../transunion/CuotasMoraBadge'
import EdadMoraBadge from '../transunion/EdadMoraBadge'
import EstadoBadge from '../transunion/EstadoBadge'
import PrimerReporte from './PrimerReporte'

export default function ObligationsTable({ obligaciones, onVerDetalle }) {
  return (
    <Table compact caption="Obligaciones y estados">
      <thead>
        <tr>
          <th scope="col">Número de Obligación</th>
          <th scope="col">Deudor</th>
          <th scope="col">Estado</th>
          <th scope="col">Edad de Mora (Tabla 9)</th>
          <th scope="col" className="text-right!">
            Valor en Mora y Cuotas en Mora
          </th>
          <th scope="col" className="text-right!">
            Saldo
          </th>
        </tr>
      </thead>
      <tbody>
        {obligaciones.map((o) => (
          <FilaObligacion key={o.id} obligacion={o} onVerDetalle={onVerDetalle} />
        ))}
      </tbody>
    </Table>
  )
}

// `onVerDetalle` es estable (useCallback en la página): al abrir o cerrar el detalle no se vuelven a
// dibujar las filas.
const FilaObligacion = memo(function FilaObligacion({ obligacion: o, onVerDetalle }) {
  return (
    <tr>
      <td className="whitespace-nowrap">
        <button
          type="button"
          className="cursor-pointer font-mono text-[13px] font-bold text-bosque-d underline hover:text-bosque-dd"
          aria-label={`Ver el detalle de la obligación ${o.numeroObligacion}`}
          onClick={() => onVerDetalle(o.id)}
        >
          {o.numeroObligacion}
        </button>
        {o.primerReporte && (
          <div>
            <PrimerReporte />
          </div>
        )}
      </td>
      <td className="min-w-32.5">{o.nombreTitular}</td>
      <td>
        <div className="flex flex-col items-start gap-1">
          <span className="whitespace-nowrap">
            <EstadoBadge codigo={o.estado?.codigo} descripcion={o.estado?.descripcion} />
            {o.cerrada && <CandadoCerrada />}
          </span>
          {o.eliminada && <Badge tone="error">Eliminada en TransUnion</Badge>}
          {o.enReclamo && <Badge tone="aviso">En reclamo</Badge>}
          {o.caducado && !o.cerrada && <Badge tone="off">Caducado en el SAC</Badge>}
          {o.requiereRevision && <Badge tone="aviso">Revisar</Badge>}
        </div>
      </td>
      <td>
        <EdadMoraBadge codigo={o.edadMora?.codigo} dias={o.diasMora} />
      </td>
      <td className="text-right whitespace-nowrap">
        {formatearCOP(o.valorMora)}
        <div className="mt-1">
          <CuotasMoraBadge cuotas={o.cuotasMora} />
        </div>
      </td>
      <td className="text-right whitespace-nowrap">{formatearCOP(o.valorSaldo)}</td>
    </tr>
  )
})
