// Muestra UNA vez la contraseña temporal del usuario recién creado (RF28).
// PENDIENTE José Luis: si el backend la envía por correo en vez de devolverla, este diálogo no se usa.
import { Button, Modal, useToast } from '../../components/ui'

export default function TemporaryPasswordDialog({ nombre, password, onClose }) {
  const toast = useToast()
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(password)
      toast.success('Contraseña copiada.')
    } catch {
      toast.error('No se pudo copiar. Selecciónala y cópiala a mano.')
    }
  }
  return (
    <Modal
      open
      onClose={onClose}
      title="Usuario creado"
      subtitle={`Se creó la cuenta de ${nombre}.`}
      footer={
        <>
          <Button variant="outline" onClick={copiar}>
            Copiar contraseña
          </Button>
          <Button onClick={onClose}>Listo</Button>
        </>
      }
    >
      <p>Entrégale esta contraseña temporal por un medio seguro. Deberá cambiarla en su primer ingreso.</p>
      <p aria-label="Contraseña temporal" className="mt-4 rounded-ctl bg-slate-50 px-4 py-3 text-center font-mono text-lg font-semibold tracking-wide select-all">
        {password}
      </p>
      <p className="mt-3 text-[13px] text-muted">Por seguridad no se volverá a mostrar.</p>
    </Modal>
  )
}
