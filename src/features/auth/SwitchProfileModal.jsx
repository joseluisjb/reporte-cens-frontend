// "Cambiar de perfil" de la maqueta. ES UN ATAJO DE DEMOSTRACIÓN: solo existe con
// VITE_DEMO_MODE=true y VITE_USE_MOCKS=true. En el sistema real el rol lo define el backend (RF27).
import { useState } from 'react'
import { Badge, Button, Icon, Modal, useToast } from '../../components/ui'
import { useAuth } from './authContext'
import { DEMO_PERFILES } from './demoProfiles'

export default function SwitchProfileModal({ open, onClose, returnFocusRef }) {
  const { user, cambiarPerfilDemo } = useAuth()
  const toast = useToast()
  const [elegido, setElegido] = useState(user.rol)
  const [enviando, setEnviando] = useState(false)

  const confirmar = async (e) => {
    e.preventDefault()
    setEnviando(true)
    try {
      const nuevo = await cambiarPerfilDemo(elegido)
      onClose()
      toast.success(`Ahora estás usando el perfil: ${nuevo.nombre} · ${nuevo.rol}.`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      returnFocusRef={returnFocusRef}
      title="Cambiar de perfil"
      subtitle="Selecciona el perfil con el que quieres continuar. Los permisos y el menú cambian según el rol."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="form-cambiar-perfil" disabled={elegido === user.rol} loading={enviando}>
            Cambiar perfil
          </Button>
        </>
      }
    >
      <form id="form-cambiar-perfil" onSubmit={confirmar}>
        <fieldset>
          <legend className="sr-only">Perfil</legend>
          {DEMO_PERFILES.map((p) => (
            <label
              key={p.rol}
              className="mb-2.5 flex cursor-pointer items-center gap-3.5 rounded-card border border-line p-3.5 hover:bg-slate-50 has-checked:border-bosque has-checked:bg-green-50"
            >
              <input
                type="radio"
                name="perfil"
                value={p.rol}
                checked={elegido === p.rol}
                onChange={() => setElegido(p.rol)}
                className="size-[18px] shrink-0 accent-bosque"
              />
              <span className="flex text-bosque">
                <Icon name="avatar" size={36} strokeWidth={1.5} />
              </span>
              <span className="flex flex-1 flex-col">
                <b>{p.nombre}</b>
                <small className="text-xs text-muted">{p.rol}</small>
              </span>
              {p.rol === user.rol && <Badge tone="ok">Perfil actual</Badge>}
            </label>
          ))}
        </fieldset>
      </form>
    </Modal>
  )
}
