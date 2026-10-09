// Encabezado de página: título a la izquierda y acciones (botones) a la derecha.
export default function PageHeader({ title, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 className="font-hd text-[28px] font-bold">{title}</h1>
      {children && <div className="flex flex-wrap gap-2.5">{children}</div>}
    </div>
  )
}
