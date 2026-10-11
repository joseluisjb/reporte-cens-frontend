// Modal para crear o editar grupos de conceptos (RF43).
import { useRef, useState } from 'react'
import { Alert, Button, Input, Modal } from '../../components/ui'
import { createConceptGroup, updateConceptGroup } from './parametersService'
import { validarGrupo } from './conceptValidation'

export default function GroupFormModal({ grupo, conceptos = [], conceptosDisponibles = [], onClose, onGuardado }) {
  const editando = Boolean(grupo)
  const [nombre, setNombre] = useState(grupo?.nombre ?? '')

  // Lista consolidada de conceptos
  const listaConceptos = conceptos.length > 0 ? conceptos : conceptosDisponibles

  // Detecta conceptos del grupo que actualmente están inactivos
  const inactivosEnGrupo = (grupo?.conceptos ?? []).filter((gc) => {
    const match = listaConceptos.find((c) => c.codigo === gc.codigo)
    return match ? !match.activo : false
  })

  // Solo preseleccionamos conceptos que permanezcan activos
  const [seleccionados, setSeleccionados] = useState(() => {
    if (!grupo?.conceptos) return []
    return grupo.conceptos
      .map((c) => c.codigo)
      .filter((codigo) => {
        const match = listaConceptos.find((c) => c.codigo === codigo)
        return match ? match.activo : true
      })
  })
  const [errores, setErrores] = useState({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [enviando, setEnviando] = useState(false)

  const nombreRef = useRef(null)

  const toggleConcepto = (codigo) => {
    setSeleccionados((prev) =>
      prev.includes(codigo) ? prev.filter((c) => c !== codigo) : [...prev, codigo],
    )
    setErrores((er) => ({ ...er, conceptos: undefined }))
    setErrorGeneral('')
  }

  const enviar = async (e) => {
    e.preventDefault()
    // Filtra para garantizar que solo viajen conceptos activos
    const conceptosValidos = seleccionados.filter((codigo) => {
      const match = listaConceptos.find((c) => c.codigo === codigo)
      return match ? match.activo : true
    })

    const encontrados = validarGrupo({ nombre, conceptos: conceptosValidos })
    setErrores(encontrados)
    setErrorGeneral('')

    if (encontrados.nombre) return nombreRef.current?.focus()
    if (encontrados.conceptos) return

    setEnviando(true)
    try {
      if (editando) {
        const guardado = await updateConceptGroup(grupo.id, {
          nombre: nombre.trim(),
          conceptos: conceptosValidos,
        })
        onGuardado({ grupo: guardado, creado: false })
      } else {
        const guardado = await createConceptGroup({
          nombre: nombre.trim(),
          conceptos: conceptosValidos,
        })
        onGuardado({ grupo: guardado, creado: true })
      }
    } catch (err) {
      if (err.fieldErrors && Object.keys(err.fieldErrors).length) {
        setErrores(err.fieldErrors)
        if (err.fieldErrors.nombre) nombreRef.current?.focus()
      } else if (err.status === 409) {
        setErrores((er) => ({ ...er, nombre: err.message }))
        nombreRef.current?.focus()
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
      title={editando ? `Editar grupo: ${grupo.nombre}` : 'Crear nuevo grupo de conceptos'}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" form="form-grupo" loading={enviando}>
            {editando ? 'Guardar cambios' : 'Crear grupo'}
          </Button>
        </div>
      }
    >
      <form id="form-grupo" onSubmit={enviar} noValidate>
        <Input
          ref={nombreRef}
          label="Nombre del grupo"
          required
          autoComplete="off"
          value={nombre}
          onChange={(e) => {
            setNombre(e.target.value)
            setErrores((er) => ({ ...er, nombre: undefined }))
            setErrorGeneral('')
          }}
          error={errores.nombre}
        />

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
          {errores.conceptos && (
            <p className="mt-1 text-[13px] text-danger" role="alert">
              {errores.conceptos}
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

        {errorGeneral && (
          <div className="mt-4">
            <Alert>{errorGeneral}</Alert>
          </div>
        )}
      </form>
    </Modal>
  )
}
