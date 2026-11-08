// Un dato con su etiqueta y una nota opcional, dentro de una lista de definición (<dl>).
export default function Dato({ etiqueta, valor, nota }) {
  return (
    <div>
      <dt className="text-xs text-muted">{etiqueta}</dt>
      <dd className="font-semibold">{valor}</dd>
      {nota && <dd className="text-xs text-muted">{nota}</dd>}
    </div>
  )
}
