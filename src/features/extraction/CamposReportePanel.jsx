// Panel lateral con los 22 campos de la plantilla de CENS para el reporte a TransUnion (contrato 0.9.7),
// en el mismo orden y con los mismos nombres de la plantilla, para validar una obligación campo por campo
// contra ella (RF5). Lo que muestra es lo que lleva el registro tipo 2 del archivo, salvo dos cosas: los
// valores van en pesos (el archivo los lleva en miles) y los datos personales siguen enmascarados.
import { Button, Modal } from '../../components/ui'
import { formatearCOP, formatearFechaISO } from '../../lib/format'

const SIN_DATO = 'Sin dato'

const texto = (valor) => (valor == null || valor === '' ? SIN_DATO : valor)
const codigo = (item) => (item ? `${item.codigo} · ${item.descripcion}` : SIN_DATO)
const fecha = (iso) => (iso ? formatearFechaISO(iso) : SIN_DATO)
const pesos = (valor) => (valor == null ? SIN_DATO : formatearCOP(valor))

// [etiqueta de la plantilla, valor]. El orden es el de la plantilla de CENS.
const filas = (c) => [
  ['Tipo de identificación', codigo(c.tipoIdentificacion)],
  ['Nº identificación', texto(c.identificacion)],
  ['Nombre tercero', texto(c.nombreTitular)],
  ['Fecha límite de pago', fecha(c.fechaLimitePago)],
  ['Número obligación', texto(c.numeroObligacion)],
  ['Código sucursal', texto(c.codigoSucursal)],
  ['Calidad', c.calidad === 'P' ? 'P · Principal' : texto(c.calidad)],
  ['Estado de obligación', codigo(c.estado)],
  ['Edad de mora', codigo(c.edadMora)],
  ['Fecha de corte', fecha(c.fechaCorte)],
  ['Fecha inicio', fecha(c.fechaInicio)],
  ['Periodicidad', codigo(c.periodicidad)],
  ['Cuotas en mora', texto(c.cuotasMora)],
  ['Valor inicial', pesos(c.valorInicial)],
  ['Valor de mora', pesos(c.valorMora)],
  ['Valor del saldo', pesos(c.valorSaldo)],
  ['Valor de la cuota', pesos(c.valorCuota)],
  ['Línea de crédito', 'No aplica: CENS reporta en el sector Servicios'],
  ['Obligación refinanciada', c.obligacionRefinanciada ? 'Sí' : 'No'],
  ['Correo electrónico', texto(c.correo)],
  ['Celular', texto(c.celular)],
  ['Valor real pagado', pesos(c.valorRealPagado)],
]

export default function CamposReportePanel({ obligacion, onCerrar }) {
  const campos = obligacion?.camposReporte
  return (
    <Modal
      open={obligacion != null}
      onClose={onCerrar}
      side
      wide
      title={obligacion ? `Campos del reporte · ${obligacion.numeroObligacion}` : 'Campos del reporte'}
      subtitle={obligacion?.nombreTitular}
      footer={
        <div className="flex justify-end">
          <Button variant="outline" onClick={onCerrar}>
            Cerrar
          </Button>
        </div>
      }
    >
      <p className="mb-4 text-sm text-muted">
        Los 22 campos de la plantilla para TransUnion, en su orden. Los valores van en pesos (en el archivo van en
        miles) y los datos personales se muestran protegidos.
      </p>
      {campos ? (
        <dl aria-label="Campos del reporte" className="divide-y divide-slate-100 rounded-ctl border border-gris-d">
          {filas(campos).map(([etiqueta, valor], i) => (
            <div key={etiqueta} className="grid grid-cols-[2rem_1fr_1fr] items-baseline gap-3 px-3 py-2">
              <span aria-hidden="true" className="text-xs text-muted tabular-nums">
                {i + 1}
              </span>
              <dt className="text-xs text-muted">{etiqueta}</dt>
              <dd className={valor === SIN_DATO ? 'text-sm text-muted' : 'text-sm font-semibold text-ink'}>{valor}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-muted">Esta obligación no trae los campos del reporte.</p>
      )}
    </Modal>
  )
}
