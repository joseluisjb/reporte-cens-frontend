// «Validaciones antes de generar (RF53)» de la pantalla 12, como el checklist del mockup v3: un ícono por
// nivel (rojo bloquea, ámbar avisa, azul informa, verde pasó), el RF, «por confirmar» cuando el contrato
// lo dice y, si la regla falla en obligaciones concretas, la lista con el enlace a su detalle (pantalla 9).
import { Link } from 'react-router-dom'
import { Icon } from '../../components/ui'
import { cx } from '../../components/ui/cx'
import { campoTexto } from '../../lib/textos'

const NIVELES = {
  ok: { icono: 'check', clases: 'bg-green-100 text-bosque-d', texto: 'Pasó' },
  correctiva: { icono: 'close', clases: 'bg-error-claro text-error-d', texto: 'Bloquea' },
  advertencia: { icono: 'warn', clases: 'bg-aviso-claro text-aviso', texto: 'Advertencia' },
  informativa: { icono: 'info', clases: 'bg-info-claro text-info', texto: 'Informativa' },
}

export default function ValidationChecklist({ resultados }) {
  return (
    <>
      <ul aria-label="Validaciones antes de generar" className="space-y-3.5">
        {resultados.map((r) => (
          <Item key={r.regla} resultado={r} />
        ))}
      </ul>
      <p className="mt-3 text-[13px] text-muted">Rojo: impide validar o generar el archivo. Amarillo: solo avisa. Azul: solo informa.</p>
    </>
  )
}

function Item({ resultado: r }) {
  const nivel = NIVELES[r.nivel] ?? NIVELES.informativa
  return (
    <li className="flex items-start gap-3">
      <span aria-hidden="true" className={cx('mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full', nivel.clases)}>
        <Icon name={nivel.icono} size={14} strokeWidth={3} />
      </span>
      <div className="min-w-0 text-sm">
        <b>{r.titulo}</b>
        <span className="sr-only"> ({nivel.texto})</span>
        <div className="text-muted">{r.detalle}</div>
        {r.obligaciones.length > 0 && (
          <ul className="mt-1.5 space-y-1" aria-label={`Obligaciones con «${r.titulo}»`}>
            {r.obligaciones.map((o, i) => (
              <li key={`${o.numeroObligacion}-${o.campo}-${i}`}>
                {o.id ? (
                  <Link to={`/obligaciones?obligacion=${o.id}`} className="font-mono font-bold text-bosque-d underline hover:text-bosque-dd">
                    {o.numeroObligacion}
                  </Link>
                ) : (
                  <span className="font-mono font-bold">{o.numeroObligacion}</span>
                )}
                {o.campo && <span className="ml-1.5 text-xs text-muted">{campoTexto(o.campo)}</span>} · {o.mensaje}
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  )
}
