// Modal para reactivar una obligación eliminada en TransUnion (RF50)
import { useState } from 'react'
import { Alert, Button, Input, Modal, useToast } from '../../components/ui'
import { mensajeDeError } from '../../lib/api'
import { reactivateElimination } from './updatesService'
import { validarReactivacion } from './updatesValidation'

export default function ReactivateModal({ open, eliminacion, onClose, onReactivada }) {
  const toast = useToast()
  const [numeroActivacionTu, setNumeroActivacionTu] = useState('')
  const [errorActivacion, setErrorActivacion] = useState('')
  const [errorServidor, setErrorServidor] = useState('')
  const [guardando, setGuardando] = useState(false)

  if (!eliminacion) return null

  const manejarEnvio = async (e) => {
    e?.preventDefault()
    setErrorServidor('')
    const errores = validarReactivacion({ numeroActivacionTu })
    if (errores.numeroActivacionTu) {
      setErrorActivacion(errores.numeroActivacionTu)
      return
    }
    setErrorActivacion('')
    setGuardando(true)

    try {
      const actualizada = await reactivateElimination(eliminacion.id, {
        numeroActivacionTu: numeroActivacionTu.trim(),
      })
      toast.success(`Obligación ${eliminacion.numeroObligacion} reactivada exitosamente.`)
      onReactivada?.(actualizada)
      onClose?.()
    } catch (err) {
      // ApiError.fieldErrors trae un texto por campo ({ campo: 'mensaje' }).
      if (err.fieldErrors?.numero_activacion_tu) {
        setErrorActivacion(err.fieldErrors.numero_activacion_tu)
      } else {
        setErrorServidor(mensajeDeError(err))
      }
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Reactivar obligación eliminada"
      subtitle={`Obligación: ${eliminacion.numeroObligacion}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={guardando}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={manejarEnvio} loading={guardando}>
            Reactivar obligación
          </Button>
        </>
      }
    >
      <form onSubmit={manejarEnvio} className="flex flex-col gap-4" noValidate>
        {errorServidor && <Alert tone="error">{errorServidor}</Alert>}

        <p className="text-sm text-slate-700">
          Al registrar la activación realizada ante TransUnion, la obligación volverá a considerarse
          en los próximos cortes mensuales de reporte.
        </p>

        <Input
          label="Número de confirmación de activación de TransUnion"
          id="act-conf"
          type="text"
          placeholder="Ej.: TU-ACT-001234"
          value={numeroActivacionTu}
          error={errorActivacion}
          onChange={(e) => {
            setNumeroActivacionTu(e.target.value)
            if (errorActivacion) setErrorActivacion('')
          }}
          autoComplete="off"
        />
      </form>
    </Modal>
  )
}
