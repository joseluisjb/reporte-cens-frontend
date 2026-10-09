import { useCallback, useMemo, useRef, useState } from 'react'
import Icon from './Icon'
import { cx } from './cx'
import { ToastContext } from './toastContext'

const DURACION_MS = 4200

// Envolver la app con <ToastProvider>. Uso: const toast = useToast(); toast.success('Listo.')
export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const nextId = useRef(1)

  const push = useCallback((message, type) => {
    const id = nextId.current++
    setItems((l) => [...l, { id, message, type }])
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), DURACION_MS)
  }, [])

  const api = useMemo(
    () => ({ success: (m) => push(m, 'ok'), error: (m) => push(m, 'err') }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-6 left-1/2 z-200 flex -translate-x-1/2 flex-col items-center gap-2"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className="flex max-w-[min(560px,92vw)] items-center gap-2.5 rounded-[10px] bg-slate-900 px-[18px] py-3 text-sm font-semibold text-white shadow-toast"
          >
            <span className={cx(t.type === 'err' ? 'text-red-300' : 'text-citrico')}>
              <Icon name={t.type === 'err' ? 'warn' : 'checkCircle'} />
            </span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
