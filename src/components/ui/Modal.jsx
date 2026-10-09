import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cx } from './cx'

const FOCUSABLE =
  'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href]'

// Diálogo accesible: aria-modal, foco inicial, trampa de Tab, Escape y clic fuera para cerrar,
// y devuelve el foco al elemento que lo abrió (o a `returnFocusRef` si ese ya no existe). `initialFocusRef` elige qué recibe el foco al abrir. `side` lo muestra como panel lateral.
export default function Modal({ open, onClose, title, subtitle, footer, side = false, returnFocusRef, initialFocusRef, children }) {
  const titleId = useId()
  const dlgRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const returnRef = useRef(returnFocusRef)
  useEffect(() => {
    onCloseRef.current = onClose
    returnRef.current = returnFocusRef
  })

  useEffect(() => {
    if (!open) return undefined
    const previous = document.activeElement
    const destinoFoco = () => returnRef.current?.current ?? previous
    document.body.style.overflow = 'hidden'
    const dlg = dlgRef.current
    const first =
      initialFocusRef?.current ||
      dlg.querySelector('input:not([disabled]):not([type=checkbox]):not([type=radio]), select, textarea') ||
      dlg.querySelector('button:not([disabled])')
    first?.focus()

    const onKey = (e) => {
      if (e.key === 'Escape') {
        onCloseRef.current?.()
        return
      }
      if (e.key !== 'Tab') return
      const items = [...dlg.querySelectorAll(FOCUSABLE)]
      if (!items.length) return
      const a = items[0]
      const z = items[items.length - 1]
      if (e.shiftKey && document.activeElement === a) {
        e.preventDefault()
        z.focus()
      } else if (!e.shiftKey && document.activeElement === z) {
        e.preventDefault()
        a.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      const destino = destinoFoco()
      if (destino && document.contains(destino)) destino.focus()
    }
  }, [open, initialFocusRef])

  if (!open) return null
  return createPortal(
    <div
      className={cx('fixed inset-0 z-100 flex items-center bg-slate-900/45', side ? 'justify-end' : 'justify-center p-6')}
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        ref={dlgRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cx(
          'flex w-full flex-col overflow-hidden bg-white shadow-dlg',
          side ? 'h-screen max-w-105' : 'max-h-[90vh] max-w-140 rounded-dlg',
        )}
      >
        <div className="px-7 pt-6">
          <h2 id={titleId} className="font-hd text-[22px] font-bold">
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-[13px] text-muted">{subtitle}</p>}
        </div>
        <div className="flex-1 overflow-auto px-7 py-[18px]">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2.5 border-t border-slate-100 px-7 pt-4 pb-6">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  )
}
