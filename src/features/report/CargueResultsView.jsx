// «Resultados del cargue · corte …» de la pantalla 12 (mockup v3: vResCargue, RF54): cuándo se cargaron
// los archivos de respuesta de TransUnion, cuatro indicadores y la tabla de inconsistencias y no
// reportadas, con enlace a la obligación para corregirla en el siguiente corte.
import { useId } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Card, EmptyState, Table } from '../../components/ui'
import { formatearFechaHora, formatearFechaISO } from '../../lib/format'

const TIPOS = {
  CORRECTIVA: { texto: 'Correctiva', tono: 'error' },
  INFORMATIVA: { texto: 'Informativa', tono: 'aviso' },
  NO_REPORTADA: { texto: 'No reportada', tono: 'aviso' },
}

export default function CargueResultsView({ resultados }) {
  const id = useId()
  const corte = formatearFechaISO(resultados.fechaCorte)
  const kpis = [
    [resultados.recibidos, 'Registros recibidos'],
    [resultados.cargados, 'Cargados'],
    [resultados.conInconsistencias, 'Con inconsistencias'],
    [resultados.noReportadas, 'No reportadas (R)'],
  ]
  return (
    <Card as="section" aria-labelledby={id} className="mt-5 p-6">
      <h2 id={id} className="font-semibold">
        Resultados del cargue · corte {corte}
      </h2>
      <p className="mb-4 text-sm text-muted">Archivos de respuesta de TransUnion cargados el {formatearFechaHora(resultados.fechaCarga)}</p>
      <ul aria-label={`Resumen del cargue del corte ${corte}`} className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map(([valor, etiqueta]) => (
          <li key={etiqueta} className="flex flex-col gap-0.5 rounded-xl border border-line bg-white px-4 py-3.5">
            <span className="font-hd text-[26px] leading-tight font-bold">{valor}</span>
            <span className="text-xs font-semibold text-muted">{etiqueta}</span>
          </li>
        ))}
      </ul>
      {resultados.inconsistencias.length === 0 ? (
        <EmptyState>TransUnion no devolvió inconsistencias ni obligaciones no reportadas en este cargue.</EmptyState>
      ) : (
        <Table compact caption={`Inconsistencias del cargue del corte ${corte}`}>
          <thead>
            <tr>
              <th scope="col">Obligación</th>
              <th scope="col">Tipo</th>
              <th scope="col">Inconsistencia</th>
            </tr>
          </thead>
          <tbody>
            {resultados.inconsistencias.map((i, n) => (
              <tr key={`${i.numeroObligacion}-${i.codigo}-${n}`}>
                <td className="font-mono whitespace-nowrap">
                  {i.id ? (
                    <Link to={`/obligaciones?obligacion=${i.id}`} className="font-bold underline">
                      {i.numeroObligacion}
                    </Link>
                  ) : (
                    i.numeroObligacion
                  )}
                </td>
                <td className="whitespace-nowrap">
                  <Badge tone={TIPOS[i.tipo]?.tono ?? 'off'}>{TIPOS[i.tipo]?.texto ?? i.tipo}</Badge>
                </td>
                <td>
                  <span className="font-mono">{i.codigo}</span> · {i.descripcion}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <p className="mt-3 text-sm text-muted">Las correctivas se corrigen y se reenvían; las informativas no impiden el cargue.</p>
    </Card>
  )
}
