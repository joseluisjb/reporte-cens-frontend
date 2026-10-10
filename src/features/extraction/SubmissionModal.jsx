// Modal para registrar el envío del archivo de cartera a TransUnion.
// Pasa el corte de VALIDADO a ENVIADO.
import { useState } from 'react'
import { Alert, Button, Input, Modal } from '../../components/ui'
import { registerSubmission } from './extractionService'
import { mapCorteFieldErrors } from './extractionMapper'

const hoyISO = () => new Date().toISOString().slice(0, 10)

export default function SubmissionModal({ corte, onClose, onEnviado }) {
  const [fechaEnvio, setFechaEnvio] = useState(hoyISO)
  const [errores, setErrores] = useState({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [enviando, setEnviando] = useState(false)

  const enviar = async (e) => {
    e.preventDefault()
    setErrores({})
    setErrorGeneral('')

    const hoy = hoyISO()
    if (fechaEnvio && fechaEnvio > hoy) {
      setErrores({ fechaEnvio: 'La fecha de envío no puede ser futura.' })
      return
    }

    setEnviando(true)
    try {
      const corteActualizado = await registerSubmission(corte.id, {
        fechaEnvio: fechaEnvio.trim() || undefined,
      })
      onEnviado(corteActualizado)
    } catch (err) {
      if (err.fieldErrors && Object.keys(err.fieldErrors).length) {
        setErrores(mapCorteFieldErrors(err.fieldErrors))
      } else {
        setErrorGeneral(err.message)
      }
      setEnviando(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Registrar envío a TransUnion"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" form="form-envio-tu" loading={enviando}>
            Confirmar envío
          </Button>
        </div>
      }
    >
      <form id="form-envio-tu" onSubmit={enviar} noValidate>
        <p className="text-sm text-slate-700">
          Registra el envío del corte de cartera correspondiente al <strong>{corte.fechaCorte}</strong> una vez
          cargado exitosamente en la plataforma de TransUnion.
        </p>

        <div className="mt-4">
          <Input
            label="Fecha de reporte o envío"
            type="date"
            max={hoyISO()}
            value={fechaEnvio}
            onChange={(e) => {
              setFechaEnvio(e.target.value)
              setErrores({})
              setErrorGeneral('')
            }}
            error={errores.fechaEnvio}
          />
          <p className="mt-1.5 text-[12px] text-muted">
            Si no se especifica, se registrará la fecha actual. No puede ser una fecha futura.
          </p>
        </div>

        {errorGeneral && (
          <div className="mt-4">
            <Alert>{errorGeneral}</Alert>
          </div>
        )}
      </form>
    </Modal>
  )
}
