// Panel lateral "Agregar concepto" / "Editar concepto" (RF35).
// Se monta solo mientras está abierto, para iniciar con formulario limpio.
// Usa el formulario reutilizable de RF31 (`useFormulario`).
import { Alert, Button, Input, Modal } from '../../components/ui'
import { ApiError } from '../../lib/api'
import { useFormulario } from '../../lib/useFormulario'
import { createConcept, updateConcept } from './parametersService'
import { validarConcepto } from './conceptValidation'

export default function ConceptFormPanel({ concepto, onClose, onGuardado }) {
  const editando = Boolean(concepto)
  const form = useFormulario({
    valoresIniciales: {
      codigo: concepto?.codigo !== undefined ? String(concepto.codigo) : '',
      descripcion: concepto?.descripcion ?? '',
      observacion: concepto?.observacion ?? '',
    },
    // Al editar, el código no es un campo: un error sobre él sale como aviso general.
    orden: editando ? ['descripcion', 'observacion'] : ['codigo', 'descripcion', 'observacion'],
    validar: (valores) => validarConcepto(valores, { editando }),
    onSubmit: async (valores) => {
      try {
        if (editando) {
          const datos = {
            descripcion: valores.descripcion.trim(),
            observacion: valores.observacion.trim() || null,
          }
          onGuardado({ concepto: await updateConcept(concepto.codigo, datos), creado: false })
        } else {
          const datos = {
            codigo: Number(valores.codigo.trim()),
            descripcion: valores.descripcion.trim(),
            observacion: valores.observacion.trim() || undefined,
          }
          onGuardado({ concepto: await createConcept(datos), creado: true })
        }
      } catch (err) {
        // El 409 ("El código de concepto ya existe.") llega como { detail }: va al campo del código.
        if (err.status === 409 && !Object.keys(err.fieldErrors ?? {}).length) {
          throw new ApiError(err.message, { status: 409, fieldErrors: { codigo: err.message } })
        }
        throw err
      }
    },
  })

  return (
    <Modal
      side
      open
      onClose={onClose}
      title={editando ? `Editar concepto ${concepto.codigo}` : 'Agregar concepto de energía'}
      footer={
        <Button type="submit" form="form-concepto" block loading={form.enviando}>
          {editando ? 'Guardar cambios' : 'Agregar concepto'}
        </Button>
      }
    >
      <form id="form-concepto" {...form.formProps}>
        {editando ? (
          <div>
            <span className="block text-[13px] font-medium text-slate-700">Código de concepto</span>
            <p className="mt-1 font-hd text-xl font-bold text-bosque-d">{concepto.codigo}</p>
            <p className="mt-1 text-[13px] text-muted">El código no se puede modificar.</p>
          </div>
        ) : (
          <Input
            label="Código de concepto"
            required
            type="number"
            min={1}
            max={9999}
            autoComplete="off"
            {...form.campo('codigo')}
          />
        )}

        <Input className="mt-5" label="Descripción" required autoComplete="off" {...form.campo('descripcion')} />

        <Input className="mt-5" label="Observación (opcional)" autoComplete="off" {...form.campo('observacion')} />

        {form.errorGeneral && (
          <div className="mt-4">
            <Alert>{form.errorGeneral}</Alert>
          </div>
        )}
      </form>
    </Modal>
  )
}
