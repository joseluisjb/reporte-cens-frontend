// Modal para mostrar errores correctivos de validación (status 409).
// Bloquea el paso a VALIDADO hasta que las inconsistencias se resuelvan.
import { Alert, Button, Modal, Table } from '../../components/ui'
import { reglaTexto } from '../../lib/textos'

export default function ValidationErrorsModal({ errores = [], onClose }) {
  return (
    <Modal
      open
      onClose={onClose}
      title="Inconsistencias detectadas en la validación"
      footer={
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Entendido
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Alert tone="error">
          El corte contiene inconsistencias que impiden validarlo y enviarlo a TransUnion.
          El corte seguirá en borrador.
        </Alert>

        <p className="text-sm text-slate-700">
          Estas reglas no se cumplen. Corrige los datos en el sistema comercial, vuelve a generar la extracción y valida de nuevo.
        </p>

        <div className="overflow-hidden rounded-ctl border border-gris-d">
          <Table caption="Reglas que no se cumplen">
            <thead>
              <tr>
                <th scope="col" className="w-48">Regla</th>
                <th scope="col">Detalle del error</th>
              </tr>
            </thead>
            <tbody>
              {errores.map((item, index) => (
                <tr key={`${item.regla}-${index}`}>
                  <td className="font-semibold text-danger">{reglaTexto(item.regla)}</td>
                  <td className="text-ink">{item.mensaje}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </div>
    </Modal>
  )
}
