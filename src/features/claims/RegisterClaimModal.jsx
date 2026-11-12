// Modal para registrar un reclamo Habeas Data (RF23, pantalla 13).
import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  FieldError,
  FieldLabel,
  Input,
  Modal,
  Select,
  Spinner,
  Tag,
} from '../../components/ui'
import { CONTROL } from '../../components/ui/Field'
import { mensajeDeError } from '../../lib/api'
import { hoyISO } from '../../lib/format'
import { useFormulario } from '../../lib/useFormulario'
import { mapReclamoFieldErrors } from './claimsMapper'
import { createClaim, getClaimTipologias, listEligibleObligations } from './claimsService'
import { validarReclamo } from './claimsValidation'

export default function RegisterClaimModal({ open, onClose, onCreado, initialObligacionId }) {
  if (!open) return null
  return (
    <Formulario
      onCerrar={onClose}
      onCreado={onCreado}
      initialObligacionId={initialObligacionId}
    />
  )
}

const ORDEN_CAMPOS = ['obligacionId', 'tipologia', 'fechaRadicacion', 'observacion']

function Formulario({ onCerrar, onCreado, initialObligacionId }) {
  const [opciones, setOpciones] = useState(null) // { obligaciones, tipologias } | null
  const [errorCarga, setErrorCarga] = useState('')
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let cancelado = false
    Promise.all([listEligibleObligations(), getClaimTipologias()]).then(
      ([obligaciones, tipologias]) => !cancelado && setOpciones({ obligaciones, tipologias }),
      (err) => !cancelado && setErrorCarga(mensajeDeError(err)),
    )
    return () => {
      cancelado = true
    }
  }, [intento])

  const obligaciones = opciones?.obligaciones ?? []
  const tipologias = opciones?.tipologias ?? []

  const form = useFormulario({
    valoresIniciales: {
      obligacionId: initialObligacionId ? String(initialObligacionId) : '',
      tipologia: '',
      fechaRadicacion: hoyISO(),
      observacion: '',
    },
    orden: ORDEN_CAMPOS,
    validar: validarReclamo,
    traducirErrores: mapReclamoFieldErrors,
    onSubmit: async (valores) => {
      const nuevoReclamo = await createClaim(valores)
      onCreado?.(nuevoReclamo)
      onCerrar?.()
    },
  })

  return (
    <Modal
      open
      onClose={onCerrar}
      title="Registrar reclamo"
      subtitle="La obligación se sigue reportando; queda pendiente el archivo de marcación para TransUnion."
      footer={
        <>
          <Button variant="ghost" onClick={onCerrar} disabled={form.enviando}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="form-registrar-reclamo"
            variant="primary"
            loading={form.enviando}
            disabled={!opciones}
          >
            Registrar reclamo
          </Button>
        </>
      }
    >
      {errorCarga && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Alert>No se pudieron cargar las obligaciones y las tipologías. {errorCarga}</Alert>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setErrorCarga('')
              setIntento((n) => n + 1)
            }}
          >
            Reintentar
          </Button>
        </div>
      )}
      {!opciones && !errorCarga && (
        <div role="status" aria-label="Cargando las obligaciones y las tipologías" className="flex justify-center p-8">
          <Spinner className="size-6" />
        </div>
      )}
      {opciones && (
        <form id="form-registrar-reclamo" {...form.formProps} className="flex flex-col gap-4">
          {form.errorGeneral && <Alert tone="error">{form.errorGeneral}</Alert>}

          <Select
            label="Obligación"
            id="cl-obl"
            {...form.campo('obligacionId')}
          >
            <option value="">Selecciona una obligación…</option>
            {obligaciones.map((o) => (
              <option key={o.id} value={o.id}>
                {o.numeroObligacion} · {o.nombreTitular}
              </option>
            ))}
          </Select>

          <Select
            label={
              <span className="flex items-center gap-1.5">
                <span>Tipología del reclamo</span>
                <Tag tone="info" className="text-xs">
                  usar la lista de TransUnion
                </Tag>
              </span>
            }
            id="cl-tip"
            {...form.campo('tipologia')}
          >
            <option value="">Selecciona la tipología…</option>
            {tipologias.map((t) => (
              <option key={t.codigo} value={t.codigo}>
                {t.descripcion}
              </option>
            ))}
          </Select>

          <Input
            type="date"
            label="Fecha del reclamo"
            id="cl-fecha"
            {...form.campo('fechaRadicacion')}
          />

          <div>
            <FieldLabel htmlFor="cl-obs">Observación (opcional)</FieldLabel>
            <textarea
              id="cl-obs"
              className={CONTROL}
              rows={3}
              maxLength={500}
              placeholder="Describe brevemente el reclamo del titular"
              {...form.campo('observacion')}
            />
            <FieldError id="cl-obs-err">{form.errores.observacion}</FieldError>
          </div>
        </form>
      )}
    </Modal>
  )
}
