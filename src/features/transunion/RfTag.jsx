// Etiqueta del requerimiento que aplica una regla (ej. «RF15»), como el `.rf` de la maqueta v3.
export default function RfTag({ children }) {
  return (
    <span className="ml-1 inline-block rounded-md bg-slate-100 px-1.5 text-xs font-bold whitespace-nowrap text-slate-600">
      {children}
    </span>
  )
}
