// Pantalla 15 · Datos de la Entidad ante TransUnion (RF57). Solo Administrador (la guarda está en
// navigation.js). Mientras TransUnion no asigne los datos llevan el marcador XXX / XXX / XXXXXX y los
// archivos salen no aptos para envío. Mockup v3: vEntidad.
import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Card, ConfirmDialog, Input, PageHeader, PorConfirmar, Spinner, useToast } from '../../components/ui'
import { formatearFechaHora } from '../../lib/format'
import { useFormulario } from '../../lib/useFormulario'
import { usePageTitle } from '../../lib/usePageTitle'
import { getLatestCut } from '../extraction/extractionService'
import { mapEntidadFieldErrors } from './entityMapper'
import { getEntity, resetEntity, updateEntity } from './entityService'
import { validarEntidad } from './entityValidation'

const TITULO = 'Datos de la Entidad ante TransUnion'

const CAMPOS = [
  { nombre: 'tipoEntidad', etiqueta: 'Tipo de entidad', largo: 3, ayuda: '3 dígitos (Tabla 29). Va en el registro 1 y en el nombre del archivo.' },
  { nombre: 'codigoEntidad', etiqueta: 'Código de entidad', largo: 3, ayuda: '3 dígitos (Tabla 30). Va en el registro 1 y en el nombre del archivo.' },
  { nombre: 'codigoSucursal', etiqueta: 'Código de sucursal', largo: 6, ayuda: '6 caracteres. Va en cada registro 2 y debe existir en TransUnion.' },
]

const MSG_GUARDADA_APTA = 'Datos guardados: los archivos nuevos saldrán aptos para envío.'
const MSG_GUARDADA_CON_RELLENO = 'Datos guardados: todavía hay relleno, los archivos saldrán no aptos para envío.'
const MSG_RELLENO = 'Datos de la entidad con relleno: los archivos saldrán no aptos para envío.'

export default function EntityPage() {
  usePageTitle(TITULO)
  const [entidad, setEntidad] = useState(null) // null = cargando
  const [errorCarga, setErrorCarga] = useState('')
  const [fechaCorte, setFechaCorte] = useState(null)
  const [intento, setIntento] = useState(0) // «Reintentar» lo sube y vuelve a pedir los datos

  useEffect(() => {
    let cancelado = false
    getEntity()
      .then((e) => !cancelado && setEntidad(e))
      .catch((err) => !cancelado && setErrorCarga(err.message))
    return () => {
      cancelado = true
    }
  }, [intento])

  const reintentar = useCallback(() => {
    setErrorCarga('')
    setEntidad(null)
    setIntento((n) => n + 1)
  }, [])

  // La fecha del último corte solo completa el nombre del próximo archivo: si falla, se muestra AAAAMMDD.
  useEffect(() => {
    let cancelado = false
    getLatestCut()
      .then((corte) => !cancelado && setFechaCorte(corte?.fechaCorte ?? null))
      .catch(() => {})
    return () => {
      cancelado = true
    }
  }, [])

  return (
    <>
      <PageHeader title={TITULO} />
      {errorCarga && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Alert>{errorCarga}</Alert>
          <Button variant="outline" size="sm" onClick={reintentar}>
            Reintentar
          </Button>
        </div>
      )}
      {!entidad && !errorCarga && (
        <div role="status" aria-label="Cargando los datos de la entidad" className="flex justify-center p-12">
          <Spinner className="size-6" />
        </div>
      )}
      {entidad && (
        <FormularioEntidad
          entidad={entidad}
          fechaCorte={fechaCorte}
          onGuardada={setEntidad}
        />
      )}
    </>
  )
}

function AvisoEntidad({ conMarcador }) {
  if (!conMarcador) {
    return (
      <Alert tone="info">
        Los datos están completos: los archivos nuevos salen <b>aptos para envío</b>.
      </Alert>
    )
  }
  return (
    <Alert tone="aviso">
      TransUnion aún no asigna los datos de la entidad. Los datos llevan relleno (<span className="font-mono">X</span>) del mismo
      largo del campo y los archivos salen <b>no aptos para envío</b>. Cuando TransUnion los asigne, se cambian aquí una sola vez.
    </Alert>
  )
}

// Los campos toman lo que devolvió el servidor (ya normalizado) sin remontar el formulario.
const CAMPOS_ENTIDAD = ['tipoEntidad', 'codigoEntidad', 'codigoSucursal']

function FormularioEntidad({ entidad, fechaCorte, onGuardada }) {
  const toast = useToast()
  const [restaurando, setRestaurando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const form = useFormulario({
    valoresIniciales: { tipoEntidad: entidad.tipoEntidad, codigoEntidad: entidad.codigoEntidad, codigoSucursal: entidad.codigoSucursal },
    validar: validarEntidad,
    traducirErrores: mapEntidadFieldErrors,
    onSubmit: async (valores) => {
      const guardada = await updateEntity(valores)
      mostrarGuardada(guardada)
      toast.success(guardada.conMarcador ? MSG_GUARDADA_CON_RELLENO : MSG_GUARDADA_APTA)
    },
  })

  // setValor también quita el error del campo y el error general.
  const mostrarGuardada = (guardada) => {
    for (const campo of CAMPOS_ENTIDAD) form.setValor(campo, guardada[campo])
    onGuardada(guardada)
  }

  const volverAlRelleno = async () => {
    setRestaurando(true)
    try {
      const guardada = await resetEntity()
      mostrarGuardada(guardada)
      toast.success(MSG_RELLENO)
    } catch (err) {
      form.setErrorGeneral(err.message)
    } finally {
      setRestaurando(false)
      setConfirmando(false)
    }
  }

  const proximoArchivo = `${entidad.prefijoArchivo}${fechaCorte ? fechaCorte.replaceAll('-', '') : 'AAAAMMDD'}`
  const ocupado = form.enviando || restaurando

  return (
    <>
      <div className="mb-4">
        <AvisoEntidad conMarcador={entidad.conMarcador} />
      </div>
      <Card as="form" className="p-6" aria-label="Datos de la entidad" {...form.formProps}>
        <div className="grid gap-4 sm:grid-cols-3">
          {CAMPOS.map(({ nombre, etiqueta, largo, ayuda }) => (
            <div key={nombre}>
              <Input
                label={etiqueta}
                maxLength={largo}
                autoComplete="off"
                spellCheck={false}
                describedBy={`${nombre}-ayuda`}
                {...form.campo(nombre)}
              />
              <p id={`${nombre}-ayuda`} className="mt-1 text-xs text-muted">
                {ayuda}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 flex flex-wrap items-baseline gap-2 text-sm">
          <span className="text-muted">Nombre del próximo archivo</span>
          <b className="font-mono">{proximoArchivo}</b>
        </p>
        {entidad.actualizadoPor && (
          <p className="mt-1 text-xs text-muted">
            Última actualización: {entidad.actualizadoPor} · {formatearFechaHora(entidad.fechaActualizacion)}
          </p>
        )}
        {form.errorGeneral && (
          <div className="mt-4">
            <Alert>{form.errorGeneral}</Alert>
          </div>
        )}
        <div className="mt-4 flex flex-wrap justify-end gap-2.5">
          <Button type="button" variant="ghost" onClick={() => setConfirmando(true)} disabled={ocupado}>
            Volver al relleno
          </Button>
          <Button type="submit" loading={form.enviando} disabled={ocupado}>
            Guardar datos
          </Button>
        </div>
      </Card>
      <ConfirmDialog
        open={confirmando}
        danger
        title="Volver al relleno"
        message="Los tres datos quedarán en XXX, XXX y XXXXXX y los archivos nuevos saldrán no aptos para envío hasta que se vuelvan a escribir."
        confirmLabel="Volver al relleno"
        loading={restaurando}
        onConfirm={volverAlRelleno}
        onCancel={() => setConfirmando(false)}
      />
      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted">
        <li>
          Si TransUnion asigna varias sucursales, falta definir la regla para asignarlas a cada obligación.
          <PorConfirmar>por definir</PorConfirmar>
        </li>
        <li>
          Si TransUnion exige un tipo de entidad numérico en el registro tipo 1 mientras no lo asigne, el relleno sería 000.
          <PorConfirmar />
        </li>
      </ul>
    </>
  )
}
