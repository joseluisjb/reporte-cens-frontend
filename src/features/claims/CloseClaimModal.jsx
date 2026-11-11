// Modal para cerrar un reclamo Habeas Data (RF23, pantalla 13).
import {
  Alert,
  Button,
  FieldError,
  FieldLabel,
  Input,
  Modal,
  Select,
} from '../../components/ui'
import { CONTROL } from '../../components/ui/Field'
import { hoyISO } from '../../lib/format'
import { useFormulario } from '../../lib/useFormulario'
import { mapReclamoFieldErrors, RESOLUCIONES } from './claimsMapper'
import { closeClaim } from './claimsService'
import { validarCierre } from './claimsValidation'

export default function CloseClaimModal({ open, onClose, reclamo, onCerrado }) {
  if (!open || !reclamo) return null
  return <Formulario onCerrar={onClose} reclamo={reclamo} onCerrado={onCerrado} />
}

const ORDEN_CAMPOS = ['resultado', 'fechaCierre', 'observacionCierre']

function Formulario({ onCerrar, reclamo, onCerrado }) {
  const form = useFormulario({
    valoresIniciales: {
      resultado: '',
      fechaCierre: hoyISO(),
      observacionCierre: '',
    },
    orden: ORDEN_CAMPOS,
    validar: (vals) => validarCierre(vals, reclamo),
    traducirErrores: mapReclamoFieldErrors,
    onSubmit: async (valores) => {
      const actualizado = await closeClaim(reclamo.id, valores)
      onCerrado?.(actualizado)
      onCerrar?.()
    },
  })

  const subtitulo = [
    reclamo.numeroObligacion,
    reclamo.nombreTitular,
    reclamo.tipologiaDescripcion,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Modal
      open
      onClose={onCerrar}
      title="Cerrar reclamo"
      subtitle={subtitulo}
      footer={
        <>
          <Button variant="ghost" onClick={onCerrar} disabled={form.enviando}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="form-cerrar-reclamo"
            variant="primary"
            loading={form.enviando}
          >
            Cerrar reclamo
          </Button>
        </>
      }
    >
      <form id="form-cerrar-reclamo" {...form.formProps} className="flex flex-col gap-4">
        {form.errorGeneral && <Alert tone="error">{form.errorGeneral}</Alert>}

        <Select
          label="Resultado del reclamo"
          id="uc-res"
          {...form.campo('resultado')}
        >
          <option value="">Selecciona el resultado…</option>
          {RESOLUCIONES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>

        <Input
          type="date"
          label="Fecha de cierre"
          id="uc-fecha"
          {...form.campo('fechaCierre')}
        />

        <div>
          <FieldLabel htmlFor="uc-obs">Observación (opcional)</FieldLabel>
          <textarea
            id="uc-obs"
            className={CONTROL}
            rows={3}
            maxLength={500}
            placeholder="Anota cómo se resolvió el reclamo"
            {...form.campo('observacionCierre')}
          />
          <FieldError id="uc-obs-err">{form.errores.observacionCierre}</FieldError>
        </div>

        <Alert tone="info">
          Al cerrarlo queda pendiente el archivo de desmarcación. Si el reclamo fue procedente,
          corrige el dato con una novedad de «Corrección».
        </Alert>
      </form>
    </Modal>
  )
}
