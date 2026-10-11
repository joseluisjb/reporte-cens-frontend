// Panel lateral "Agregar concepto" / "Editar concepto" (RF35).
// Se monta solo mientras está abierto, para iniciar con formulario limpio.
import { useRef, useState } from 'react'
import { Alert, Button, Input, Modal } from '../../components/ui'
import { createConcept, updateConcept } from './parametersService'
import { validarConcepto } from './conceptValidation'

export default function ConceptFormPanel({ concepto, onClose, onGuardado }) {
  const editando = Boolean(concepto)
  const [valores, setValores] = useState({
    codigo: concepto?.codigo !== undefined ? String(concepto.codigo) : '',
    descripcion: concepto?.descripcion ?? '',
    observacion: concepto?.observacion ?? '',
  })
  const [errores, setErrores] = useState({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [enviando, setEnviando] = useState(false)

  const codigoRef = useRef(null)
  const descripcionRef = useRef(null)
  const observacionRef = useRef(null)

  const enfocar = (campo) => ({ codigo: codigoRef, descripcion: descripcionRef, observacion: observacionRef })[campo]?.current?.focus()

  const cambiar = (campo) => (e) => {
    setValores((v) => ({ ...v, [campo]: e.target.value }))
    setErrores((er) => ({ ...er, [campo]: undefined }))
    setErrorGeneral('')
  }

  const enviar = async (e) => {
    e.preventDefault()
    const encontrados = validarConcepto(valores, { editando })
    setErrores(encontrados)
    setErrorGeneral('')

    const primero = (editando ? ['descripcion', 'observacion'] : ['codigo', 'descripcion', 'observacion']).find((c) => encontrados[c])
    if (primero) return enfocar(primero)

    setEnviando(true)
    try {
      if (editando) {
        const datos = {
          descripcion: valores.descripcion.trim(),
          observacion: valores.observacion.trim() || null,
        }
        const guardado = await updateConcept(concepto.codigo, datos)
        onGuardado({ concepto: guardado, creado: false })
      } else {
        const datos = {
          codigo: Number(valores.codigo.trim()),
          descripcion: valores.descripcion.trim(),
          observacion: valores.observacion.trim() || undefined,
        }
        const guardado = await createConcept(datos)
        onGuardado({ concepto: guardado, creado: true })
      }
    } catch (err) {
      if (err.fieldErrors && Object.keys(err.fieldErrors).length) {
        setErrores(err.fieldErrors)
        enfocar(Object.keys(err.fieldErrors)[0])
      } else if (err.status === 409) {
        setErrores((er) => ({ ...er, codigo: err.message }))
        enfocar('codigo')
      } else {
        setErrorGeneral(err.message)
      }
      setEnviando(false)
    }
  }

  return (
    <Modal
      side
      open
      onClose={onClose}
      title={editando ? `Editar concepto ${concepto.codigo}` : 'Agregar concepto de energía'}
      footer={
        <Button type="submit" form="form-concepto" block loading={enviando}>
          {editando ? 'Guardar cambios' : 'Agregar concepto'}
        </Button>
      }
    >
      <form id="form-concepto" onSubmit={enviar} noValidate>
        {editando ? (
          <div>
            <span className="block text-[13px] font-medium text-slate-700">Código de concepto</span>
            <p className="mt-1 font-hd text-xl font-bold text-bosque-d">{concepto.codigo}</p>
            <p className="mt-1 text-[13px] text-muted">El código no se puede modificar.</p>
          </div>
        ) : (
          <Input
            ref={codigoRef}
            label="Código de concepto"
            required
            type="number"
            min={1}
            max={9999}
            autoComplete="off"
            value={valores.codigo}
            onChange={cambiar('codigo')}
            error={errores.codigo}
          />
        )}

        <Input
          ref={descripcionRef}
          className="mt-5"
          label="Descripción"
          required
          autoComplete="off"
          value={valores.descripcion}
          onChange={cambiar('descripcion')}
          error={errores.descripcion}
        />

        <Input
          ref={observacionRef}
          className="mt-5"
          label="Observación (opcional)"
          autoComplete="off"
          value={valores.observacion}
          onChange={cambiar('observacion')}
          error={errores.observacion}
        />

        {errorGeneral && (
          <div className="mt-4">
            <Alert>{errorGeneral}</Alert>
          </div>
        )}
      </form>
    </Modal>
  )
}
