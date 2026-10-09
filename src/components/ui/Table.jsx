import { cx } from './cx'

// Tabla con el estilo de la maqueta. Se usa con etiquetas normales:
//   <Table><thead><tr><th>Nombre</th></tr></thead><tbody>...</tbody></Table>
export default function Table({ compact = false, className, children, ...rest }) {
  return (
    <div className="overflow-auto">
      <table
        className={cx(
          'w-full border-collapse text-[13px]',
          '[&_th]:bg-slate-50 [&_th]:text-left [&_th]:font-semibold [&_th]:whitespace-nowrap [&_th]:text-muted',
          '[&_td]:border-t [&_td]:border-slate-100 [&_td]:align-middle',
          '[&_tbody_tr:nth-child(even)]:bg-neutral-50',
          compact ? '[&_th]:p-3.5 [&_td]:p-3.5' : '[&_th]:px-5 [&_th]:py-3 [&_td]:px-5 [&_td]:py-3',
          className,
        )}
        {...rest}
      >
        {children}
      </table>
    </div>
  )
}

export function EmptyState({ children }) {
  return <div className="p-8 text-center text-muted">{children}</div>
}
