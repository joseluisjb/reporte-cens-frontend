// Etiqueta «por confirmar» de la maqueta v3: marca un valor o una regla que depende de CENS o de
// TransUnion. Se muestra cuando el contrato lo indica (`confirmado: false` o `por_confirmar: true`),
// nunca como texto fijo. `children` cambia el texto (ej. «pendiente de CENS»).
export default function PorConfirmar({ children = 'por confirmar' }) {
  return (
    <span className="ml-1.5 inline-block rounded-md bg-aviso-claro px-1.5 text-xs font-bold whitespace-nowrap text-aviso">
      {children}
    </span>
  )
}
