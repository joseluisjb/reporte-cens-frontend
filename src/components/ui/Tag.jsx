import { cx } from './cx'

const TONOS = {
  neutro: 'bg-slate-100 text-slate-600',
  aviso: 'bg-aviso-claro text-aviso',
}

// Etiqueta pequeña junto a un texto: el requerimiento que aplica una regla («RF15») o «por confirmar».
// tone = 'neutro' | 'aviso'
export default function Tag({ tone = 'neutro', children }) {
  return (
    <span className={cx('ml-1.5 inline-block rounded-md px-1.5 text-xs font-bold whitespace-nowrap', TONOS[tone])}>{children}</span>
  )
}
