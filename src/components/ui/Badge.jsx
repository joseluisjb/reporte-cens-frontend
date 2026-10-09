import { cx } from './cx'

const TONES = {
  ok: 'bg-green-100 text-bosque',
  off: 'bg-slate-100 text-muted',
  admin: 'bg-blue-50 text-blue-700',
}

// Insignia de estado o rol. tone = 'ok' | 'off' | 'admin'
export default function Badge({ tone = 'ok', children, className }) {
  return (
    <span
      className={cx(
        'inline-block rounded-full px-2.5 py-[3px] text-xs font-semibold whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
