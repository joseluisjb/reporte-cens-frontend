// Modal para gestionar una novedad en línea con TransUnion (RF24, RF50)
import { useState } from 'react'
import { Alert, Button, Icon, Input, Modal, useToast } from '../../components/ui'
import { mensajeDeError } from '../../lib/api'
import { manageNovelty } from './updatesService'
import { validarGestion } from './updatesValidation'

export default function ManageNoveltyModal({ open, novedad, onClose, onGestionada }) {
  const toast = useToast()
  const [numeroTransaccionTu, setNumeroTransaccionTu] = useState('')
  const [errorTransaccion, setErrorTransaccion] = useState('')
  const [errorServidor, setErrorServidor] = useState('')
  const [guardando, setGuardando] = useState(false)

  if (!novedad) return null

  const manejarEnvio = async (e) => {
    e?.preventDefault()
    setErrorServidor('')
    const errores = validarGestion({ numeroTransaccionTu })
    if (errores.numeroTransaccionTu) {
      setErrorTransaccion(errores.numeroTransaccionTu)
      return
    }
    setErrorTransaccion('')
    setGuardando(true)

    try {
      const actualizada = await manageNovelty(novedad.id, {
        numeroTransaccionTu: numeroTransaccionTu.trim(),
      })
      toast.success(`Novedad #${novedad.id} gestionada exitosamente.`)
      onGestionada?.(actualizada)
      onClose?.()
    } catch (err) {
      // ApiError.fieldErrors trae un texto por campo ({ campo: 'mensaje' }).
      if (err.fieldErrors?.numero_transaccion_tu) {
        setErrorTransaccion(err.fieldErrors.numero_transaccion_tu)
      } else {
        setErrorServidor(mensajeDeError(err))
      }
    } finally {
      setGuardando(false)
    }
  }

  const abrirModuloTransUnion = () => {
    toast.info('Se abriría el módulo web Actualización en Línea de TransUnion en una pestaña nueva.')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Gestionar en Actualización en Línea"
      subtitle={`${novedad.tipo} · ${novedad.sujeto} · ${novedad.referencia}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={guardando}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={manejarEnvio} loading={guardando}>
            Marcar como gestionada
          </Button>
        </>
      }
    >
      <form onSubmit={manejarEnvio} className="flex flex-col gap-4" noValidate>
        {errorServidor && <Alert tone="error">{errorServidor}</Alert>}

        <div className="flex items-start justify-between rounded-lg bg-slate-50 p-3 text-sm">
          <span className="text-slate-600 font-medium">Motivo</span>
          <span className="text-right text-slate-800 font-semibold max-w-[70%]">
            {novedad.motivo}
          </span>
        </div>

        <ol className="flex flex-col gap-3 text-sm text-slate-700">
          <li className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bosque text-xs font-bold text-white">
              1
            </span>
            <div>
              <p>Abre el módulo web <b>Actualización en Línea</b> de TransUnion.</p>
              <div className="mt-2">
                <Button type="button" variant="outline" size="sm" onClick={abrirModuloTransUnion}>
                  <Icon name="link" size={14} />
                  Abrir Actualización en Línea
                </Button>
              </div>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bosque text-xs font-bold text-white">
              2
            </span>
            <p className="pt-0.5">
              Registra la novedad con el tipo ({novedad.tipo}), el sujeto ({novedad.sujeto}) y los datos indicados.
            </p>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bosque text-xs font-bold text-white">
              3
            </span>
            <p className="pt-0.5">Copia el número de confirmación emitido por TransUnion y regístralo aquí.</p>
          </li>
        </ol>

        {novedad.tipo === 'Eliminación' && (
          <Alert tone="aviso">
            La obligación dejará de reportarse en los cortes siguientes y su número no se podrá reutilizar.
          </Alert>
        )}

        <Input
          label="Número de confirmación de TransUnion"
          id="gs-conf"
          type="text"
          placeholder="Ej.: TU-AL-001600"
          value={numeroTransaccionTu}
          error={errorTransaccion}
          onChange={(e) => {
            setNumeroTransaccionTu(e.target.value)
            if (errorTransaccion) setErrorTransaccion('')
          }}
          autoComplete="off"
        />
      </form>
    </Modal>
  )
}
