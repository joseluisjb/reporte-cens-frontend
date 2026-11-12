// Modal para registrar una novedad urgente (RF24, RF50, RF55)
import { useEffect, useRef, useState } from 'react'
import { Alert, Button, FieldError, FieldLabel, Input, Modal, Select } from '../../components/ui'
import { formatearFechaISO, plural } from '../../lib/format'
import { useFormulario } from '../../lib/useFormulario'
import { listCuts } from '../extraction/extractionService'
import { CATALOGOS, getCatalog } from '../transunion/catalogosService'
import { MEDIOS_RECTIFICACION, mapNovedadFieldErrors, SUJETOS_NOVEDAD, TIPOS_NOVEDAD } from './updatesMapper'
import { createNovelty, createRectification, findObligationId } from './updatesService'
import { validarNovedad } from './updatesValidation'

export default function NewNoveltyModal({ open, onClose, onCreada, onRectificada }) {
  if (!open) return null
  return <Formulario onCerrar={onClose} onCreada={onCreada} onRectificada={onRectificada} />
}

const ORDEN_CAMPOS = [
  'tipo',
  'sujeto',
  'referencia',
  'corteId',
  'medio',
  'campo',
  'valorCorregido',
  'justificacion',
  'motivoEliminacion',
  'motivo',
]

function Formulario({ onCerrar, onCreada, onRectificada }) {
  const [cortes, setCortes] = useState([])
  const [motivosElim, setMotivosElim] = useState([])
  // Novedad ya creada en este formulario: si la rectificación falla, el reintento no la duplica.
  const creada = useRef(null)

  useEffect(() => {
    let cancelado = false
    listCuts()
      .then((data) => {
        if (cancelado) return
        const enviados = data.filter((c) => c.esEnviado || c.estado?.startsWith('ENVIADO'))
        setCortes(enviados)
      })
      .catch(() => {
        if (!cancelado) setCortes([])
      })

    getCatalog(CATALOGOS.motivosEliminacion)
      .then((data) => {
        if (cancelado) return
        setMotivosElim(data)
      })
      .catch(() => {
        if (!cancelado) setMotivosElim([])
      })

    return () => {
      cancelado = true
    }
  }, [])

  const form = useFormulario({
    valoresIniciales: {
      tipo: 'Actualización',
      sujeto: 'Obligación',
      referencia: '',
      motivo: '',
      motivoEliminacion: '',
      corteId: '',
      medio: 'Actualización en Línea',
      campo: 'valor_mora',
      valorCorregido: '',
      justificacion: '',
    },
    orden: ORDEN_CAMPOS,
    validar: validarNovedad,
    traducirErrores: mapNovedadFieldErrors,
    onSubmit: async (valores) => {
      // Una corrección (RF55) son dos registros: la novedad y su rectificación, enlazadas por novedad_id.
      const esCorreccion = valores.tipo === 'Corrección'
      const obligacionId = esCorreccion ? await findObligationId(valores.referencia) : undefined
      const previa = creada.current
      const reutilizable = previa && previa.tipo === valores.tipo && previa.referencia === valores.referencia.trim()
      const novedad = reutilizable ? previa : await createNovelty({ ...valores, obligacionId })
      if (!reutilizable) {
        creada.current = novedad
        onCreada?.(novedad)
      }
      if (esCorreccion) {
        const rectificacion = await createRectification({ ...valores, obligacionId, novedadId: novedad.id })
        onRectificada?.(rectificacion)
      }
      onCerrar?.()
    },
  })

  return (
    <Modal
      open
      onClose={onCerrar}
      title="Registrar novedad urgente"
      subtitle="Queda registrada para hacerla de inmediato en Actualización en Línea y se tiene en cuenta en el próximo reporte."
      footer={
        <>
          <Button variant="ghost" onClick={onCerrar} disabled={form.enviando}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="form-nueva-novedad"
            variant="primary"
            loading={form.enviando}
          >
            Registrar novedad
          </Button>
        </>
      }
    >
      <form id="form-nueva-novedad" {...form.formProps} className="flex flex-col gap-4">
        {form.errorGeneral && <Alert tone="error">{form.errorGeneral}</Alert>}

        <Select
          label="Tipo de novedad"
          id="nv-tipo"
          {...form.campo('tipo')}
          onChange={(e) => {
            form.setValor('tipo', e.target.value)
            if (e.target.value === 'Corrección' && !form.valores.corteId && cortes.length > 0) {
              form.setValor('corteId', String(cortes[0].id))
            }
          }}
        >
          {TIPOS_NOVEDAD.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>

        <Select
          label="Sujeto de la novedad"
          id="nv-suj"
          {...form.campo('sujeto')}
        >
          {SUJETOS_NOVEDAD.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>

        <Input
          label="Número de obligación o identificación del titular"
          id="nv-ref"
          placeholder="Ej.: 2257-4156"
          autoComplete="off"
          {...form.campo('referencia')}
        />

        {form.valores.tipo === 'Corrección' && (
          <div className="flex flex-col gap-4 rounded-lg bg-slate-50 p-4 border border-slate-200">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Datos de la rectificación (RF55)
            </p>

            <Select
              label="Corte que se rectifica (RF55)"
              id="nv-corte"
              {...form.campo('corteId')}
            >
              <option value="">Selecciona un corte enviado</option>
              {cortes.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  Corte {formatearFechaISO(c.fechaCorte)} · {plural(c.totalObligaciones, 'obligación', 'obligaciones')}
                </option>
              ))}
            </Select>

            <Select
              label="Medio de la rectificación"
              id="nv-medio"
              {...form.campo('medio')}
            >
              {MEDIOS_RECTIFICACION.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>

            <Input
              label="Campo a corregir"
              id="nv-campo"
              placeholder="Ej.: valor_mora"
              {...form.campo('campo')}
            />

            <Input
              label="Valor corregido"
              id="nv-valor-corr"
              placeholder="Ej.: 70000"
              {...form.campo('valorCorregido')}
            />

            <div>
              <FieldLabel htmlFor="nv-just">Justificación de la corrección</FieldLabel>
              <textarea
                id="nv-just"
                rows={2}
                maxLength={500}
                className="w-full rounded-md border border-slate-300 p-2.5 text-sm focus:border-bosque focus:ring-1 focus:ring-bosque"
                placeholder="Explica por qué se rectifica el valor reportado"
                {...form.campo('justificacion')}
              />
              <FieldError id="nv-just-err">{form.errores.justificacion}</FieldError>
            </div>
          </div>
        )}

        {form.valores.tipo === 'Eliminación' && (
          <div className="flex flex-col gap-4">
            <Alert tone="aviso">
              Al gestionarla, la obligación <b>deja de reportarse</b> en los cortes siguientes y su
              número <b>no se puede reutilizar</b> (RF50).
            </Alert>

            <Select
              label="Motivo de la eliminación (Tabla 28)"
              id="nv-motivo-elim"
              {...form.campo('motivoEliminacion')}
            >
              <option value="">Selecciona un motivo</option>
              {motivosElim.map((m) => (
                <option key={m.codigo} value={m.codigo}>
                  {m.codigo} - {m.descripcion}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div>
          <FieldLabel htmlFor="nv-motivo">Motivo</FieldLabel>
          <textarea
            id="nv-motivo"
            rows={3}
            maxLength={500}
            className="w-full rounded-md border border-slate-300 p-2.5 text-sm focus:border-bosque focus:ring-1 focus:ring-bosque"
            placeholder="Explica por qué no puede esperar al corte mensual"
            {...form.campo('motivo')}
          />
          <FieldError id="nv-motivo-err">{form.errores.motivo}</FieldError>
        </div>
      </form>
    </Modal>
  )
}
