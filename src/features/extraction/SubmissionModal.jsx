// Modal para registrar el envío del archivo de cartera a TransUnion.
// Pasa el corte de VALIDADO a ENVIADO. Usa el formulario reutilizable de RF31 (`useFormulario`).
import { Alert, Button, Input, Modal } from '../../components/ui'
import { formatearFechaISO, hoyISO } from '../../lib/format'
import { useFormulario } from '../../lib/useFormulario'
import { registerSubmission } from './extractionService'
import { mapCorteFieldErrors } from './extractionMapper'

function validarEnvio({ fechaEnvio }) {
  return fechaEnvio && fechaEnvio > hoyISO() ? { fechaEnvio: 'La fecha de envío no puede ser futura.' } : {}
}

export default function SubmissionModal({ corte, onClose, onEnviado }) {
  const form = useFormulario({
    valoresIniciales: { fechaEnvio: hoyISO() },
    validar: validarEnvio,
    traducirErrores: mapCorteFieldErrors,
    onSubmit: async ({ fechaEnvio }) => {
      onEnviado(await registerSubmission(corte.id, { fechaEnvio: fechaEnvio.trim() || undefined }))
    },
  })

  return (
    <Modal
      open
      onClose={onClose}
      title="Registrar envío a TransUnion"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={form.enviando}>
            Cancelar
          </Button>
          <Button type="submit" form="form-envio-tu" loading={form.enviando}>
            Confirmar envío
          </Button>
        </div>
      }
    >
      <form id="form-envio-tu" {...form.formProps}>
        <p className="text-sm text-slate-700">
          Registra el envío del corte de cartera correspondiente al <strong>{formatearFechaISO(corte.fechaCorte)}</strong> una vez
          cargado exitosamente en la plataforma de TransUnion.
        </p>

        <div className="mt-4">
          <Input label="Fecha de reporte o envío" type="date" max={hoyISO()} {...form.campo('fechaEnvio')} />
          <p className="mt-1.5 text-[12px] text-muted">
            Si no se especifica, se registrará la fecha actual. No puede ser una fecha futura.
          </p>
        </div>

        {form.errorGeneral && (
          <div className="mt-4">
            <Alert>{form.errorGeneral}</Alert>
          </div>
        )}
      </form>
    </Modal>
  )
}
