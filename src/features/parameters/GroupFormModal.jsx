// Modal para crear o editar grupos de conceptos (RF43).
// Usa el formulario reutilizable de RF31 (`useFormulario`); la lista de conceptos se maneja con `setValor`.
import { Alert, Button, Input, Modal } from '../../components/ui'
import { ApiError } from '../../lib/api'
import { useFormulario } from '../../lib/useFormulario'
import { createConceptGroup, updateConceptGroup } from './parametersService'
import { validarGrupo } from './conceptValidation'

export default function GroupFormModal({ grupo, conceptos = [], conceptosDisponibles = [], onClose, onGuardado }) {
  const editando = Boolean(grupo)

  // Lista consolidada de conceptos
  const listaConceptos = conceptos.length > 0 ? conceptos : conceptosDisponibles
  const estaActivo = (codigo) => {
    const match = listaConceptos.find((c) => c.codigo === codigo)
    return match ? match.activo : true
  }

  // Detecta conceptos del grupo que actualmente están inactivos
  const inactivosEnGrupo = (grupo?.conceptos ?? []).filter((gc) => {
    const match = listaConceptos.find((c) => c.codigo === gc.codigo)
    return match ? !match.activo : false
  })

  const form = useFormulario({
    valoresIniciales: {
      nombre: grupo?.nombre ?? '',
      // Solo preseleccionamos conceptos que permanezcan activos
      conceptos: (grupo?.conceptos ?? []).map((c) => c.codigo).filter(estaActivo),
    },
    orden: ['nombre', 'conceptos'],
    // Filtra para garantizar que solo viajen conceptos activos
    validar: ({ nombre, conceptos: codigos }) => validarGrupo({ nombre, conceptos: codigos.filter(estaActivo) }),
    onSubmit: async ({ nombre, conceptos: codigos }) => {
      const datos = { nombre: nombre.trim(), conceptos: codigos.filter(estaActivo) }
      try {
        if (editando) {
          onGuardado({ grupo: await updateConceptGroup(grupo.id, datos), creado: false })
        } else {
          onGuardado({ grupo: await createConceptGroup(datos), creado: true })
        }
      } catch (err) {
        // El 409 ("El nombre de grupo ya existe.") llega como { detail }: va al campo del nombre.
        if (err.status === 409 && !Object.keys(err.fieldErrors ?? {}).length) {
          throw new ApiError(err.message, { status: 409, fieldErrors: { nombre: err.message } })
        }
        throw err
      }
    },
  })
  const seleccionados = form.valores.conceptos

  const toggleConcepto = (codigo) => {
    form.setValor(
      'conceptos',
      seleccionados.includes(codigo) ? seleccionados.filter((c) => c !== codigo) : [...seleccionados, codigo],
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={editando ? `Editar grupo: ${grupo.nombre}` : 'Crear nuevo grupo de conceptos'}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={form.enviando}>
            Cancelar
          </Button>
          <Button type="submit" form="form-grupo" loading={form.enviando}>
            {editando ? 'Guardar cambios' : 'Crear grupo'}
          </Button>
        </div>
      }
    >
      <form id="form-grupo" {...form.formProps}>
        <Input label="Nombre del grupo" required autoComplete="off" {...form.campo('nombre')} />

        {inactivosEnGrupo.length > 0 && (
          <div className="mt-4">
            <Alert tone="warn">
              Este grupo contenía {inactivosEnGrupo.length === 1 ? 'un concepto inactivo' : `${inactivosEnGrupo.length} conceptos inactivos`} ({inactivosEnGrupo.map((c) => c.codigo).join(', ')}). No se pueden incluir conceptos inactivos y han sido excluidos.
            </Alert>
          </div>
        )}

        <div className="mt-5">
          <span className="block text-[13px] font-medium text-slate-700">
            Conceptos de energía incluidos <span className="text-danger">*</span>
          </span>
          {form.errores.conceptos && (
            <p className="mt-1 text-[13px] text-danger" role="alert">
              {form.errores.conceptos}
            </p>
          )}
          <div className="mt-2.5 max-h-56 space-y-2 overflow-y-auto rounded-ctl border border-gris-d p-3">
            {listaConceptos.filter((c) => c.activo).length === 0 ? (
              <p className="text-sm text-muted">No hay conceptos activos disponibles.</p>
            ) : (
              <>
                {listaConceptos
                  .filter((c) => c.activo)
                  .map((c) => {
                    const checked = seleccionados.includes(c.codigo)
                    return (
                      <label
                        key={c.codigo}
                        className="flex cursor-pointer items-center gap-3 rounded-sm p-1.5 hover:bg-fondo"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleConcepto(c.codigo)}
                          className="size-4 rounded border-gris-d text-bosque focus:ring-bosque"
                        />
                        <span className="text-sm text-ink">
                          <strong className="font-semibold text-bosque-d">{c.codigo}</strong> — {c.descripcion}
                        </span>
                      </label>
                    )
                  })}
                {inactivosEnGrupo.map((c) => (
                  <label
                    key={c.codigo}
                    className="flex cursor-not-allowed items-center gap-3 rounded-sm p-1.5 opacity-60 bg-fondo"
                  >
                    <input
                      type="checkbox"
                      checked={false}
                      disabled
                      className="size-4 rounded border-gris-d text-muted"
                    />
                    <span className="text-sm text-muted">
                      <strong className="font-semibold text-muted">{c.codigo}</strong> — {c.descripcion || `Concepto ${c.codigo}`}{' '}
                      <span className="text-xs text-danger font-medium">(Inactivo — no seleccionable)</span>
                    </span>
                  </label>
                ))}
              </>
            )}
          </div>
          <p className="mt-1.5 text-[12px] text-muted">
            Solo se pueden incluir conceptos que se encuentren activos.
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
