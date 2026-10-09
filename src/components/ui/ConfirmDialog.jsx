import { useRef } from 'react'
import Button from './Button'
import Modal from './Modal'

// Confirmación antes de una acción delicada (ej. desactivar un usuario o un código).
// El foco inicial queda en "Cancelar" para que Enter no confirme por accidente.
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}) {
  const cancelarRef = useRef(null)
  return (
    <Modal
      open={open}
      onClose={onCancel}
      initialFocusRef={cancelarRef}
      title={title}
      footer={
        <>
          <Button ref={cancelarRef} variant="ghost" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p>{message}</p>
    </Modal>
  )
}
