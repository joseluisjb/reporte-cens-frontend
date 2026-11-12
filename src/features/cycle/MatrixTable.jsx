// Matriz de cambios de estado con los 5 estados que usa CENS,
// como el vMatriz del mockup v3. Fila = estado del corte anterior; columna = estado nuevo; n = sin
// mora y m = con mora. La matriz viene de la API (`GET /matriz-estados/`): aquí no se copia.
import { cx } from '../../components/ui/cx'
import { descripcionEstado } from '../transunion/catalogosTU'
import EstadoBadge from '../transunion/EstadoBadge'

// Los estados que usa CENS, en el orden del mockup (EST_ORDER).
const ESTADOS_CENS = ['01', '03', '06', '02', '07']
const COMBINACIONES = ESTADOS_CENS.flatMap((codigo) => [
  [codigo, false],
  [codigo, true],
])
const mora = (conMora) => (conMora ? 'con mora' : 'sin mora')

export default function MatrixTable({ matriz }) {
  return (
    <div className="overflow-auto">
      <table className="w-full border-collapse text-center text-xs [&_td]:border [&_td]:border-line [&_td]:p-1.5 [&_th]:border [&_th]:border-line [&_th]:bg-slate-50 [&_th]:p-1.5 [&_th]:font-semibold">
        <caption className="sr-only">Cambios de estado permitidos: S = TransUnion acepta el cambio, N = TransUnion no acepta el cambio</caption>
        <thead>
          <tr>
            <th scope="col" className="text-left">
              Estado anterior / nuevo
            </th>
            {COMBINACIONES.map(([codigo, conMora]) => (
              <th key={codigo + conMora} scope="col" title={`${codigo} · ${descripcionEstado(codigo)} ${mora(conMora)}`} className="whitespace-nowrap">
                {descripcionEstado(codigo)}
                <span className="block font-normal text-muted">{mora(conMora)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMBINACIONES.map(([desde, desdeConMora]) => (
            <tr key={desde + desdeConMora}>
              <th scope="row" className="text-left whitespace-nowrap">
                <EstadoBadge codigo={desde} /> <span className="font-normal text-muted">{mora(desdeConMora)}</span>
              </th>
              {COMBINACIONES.map(([hacia, haciaConMora]) => {
                const ok = matriz.permitida(desde, desdeConMora, hacia, haciaConMora)
                return (
                  <td key={hacia + haciaConMora} className={cx('font-bold', ok ? 'bg-green-50 text-bosque-d' : 'bg-red-50 text-error-d')}>
                    {ok ? 'S' : 'N'}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
