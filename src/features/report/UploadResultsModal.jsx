// Cargar los archivos de respuesta de TransUnion de un archivo enviado (pantalla 12, RF54). El mockup v3
// solo simula el cargue; los tipos de archivo salen de la ficha RF54 y sus nombres, del Manual (p. 43).
// Si un archivo es de otro corte o no tiene la estructura esperada, el backend responde 422 con el motivo
// y no guarda nada: el motivo se muestra aquí y el Analista puede corregir la selección.
import { useId, useState } from 'react'
import { Alert, Button, FieldError, FieldLabel, Modal } from '../../components/ui'
import { ApiError, mensajeDeError } from '../../lib/api'
import { formatearFechaISO } from '../../lib/format'
import { uploadResults } from './reportService'

export default function UploadResultsModal({ archivo, onCerrar, onCargados }) {
  if (!archivo) return null
  return <Formulario archivo={archivo} onCerrar={onCerrar} onCargados={onCargados} />
}

function Formulario({ archivo, onCerrar, onCargados }) {
  const inputId = useId()
  const ayudaId = useId()
  const errorId = useId()
  const [seleccion, setSeleccion] = useState([])
  const [errorCampo, setErrorCampo] = useState('')
  const [rechazo, setRechazo] = useState('')
  const [enviando, setEnviando] = useState(false)

  const elegir = (e) => {
    setSeleccion([...e.target.files])
    setErrorCampo('')
    setRechazo('')
  }

  const cargar = async (e) => {
    e.preventDefault()
    if (!seleccion.length) {
      setErrorCampo('Selecciona al menos un archivo de resultados.')
      return
    }
    setEnviando(true)
    setRechazo('')
    try {
      onCargados(await uploadResults(archivo.id, seleccion))
    } catch (err) {
      setRechazo(err instanceof ApiError && err.message ? err.message : `No se pudieron cargar los resultados. ${mensajeDeError(err)}`)
      setEnviando(false)
    }
  }

  return (
    <Modal
      open
      onClose={enviando ? () => {} : onCerrar} // mientras se cargan no se cierra: el resultado se aplicaría igual
      title="Cargar resultados de TransUnion"
      subtitle={`${archivo.nombre} · corte ${formatearFechaISO(archivo.fechaCorte)}`}
      footer={
        <>
          <Button variant="ghost" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" form="form-resultados" loading={enviando}>
            Cargar resultados
          </Button>
        </>
      }
    >
      <form id="form-resultados" noValidate onSubmit={cargar}>
        {rechazo && (
          <div className="mb-4">
            <Alert>{rechazo}</Alert>
          </div>
        )}
        <FieldLabel htmlFor={inputId}>Archivos de resultado</FieldLabel>
        <input
          id={inputId}
          type="file"
          multiple
          accept=".txt"
          onChange={elegir}
          aria-invalid={errorCampo ? true : undefined}
          aria-describedby={errorCampo ? `${ayudaId} ${errorId}` : ayudaId}
          className="block w-full text-sm file:mr-3 file:rounded-ctl file:border file:border-gris-d file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold"
        />
        <FieldError id={errorId}>{errorCampo}</FieldError>
        <p id={ayudaId} className="mt-2 text-sm text-muted">
          Los que devuelve TransUnion después del cargue, delimitados por pipes: estadísticos, detalle de correctivas y de alertas, Especiales,
          953_Detalle y no reportados (norep), con el nombre que les da TransUnion y la fecha de este corte.
        </p>
        {seleccion.length > 0 && (
          <ul aria-label="Archivos seleccionados" className="mt-3 space-y-1 font-mono text-sm">
            {seleccion.map((f) => (
              <li key={f.name}>{f.name}</li>
            ))}
          </ul>
        )}
      </form>
    </Modal>
  )
}
