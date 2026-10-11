// Modal para mostrar errores correctivos de validación (status 409).
// Bloquea el paso a VALIDADO hasta que las inconsistencias se resuelvan.
import { Alert, Button, Modal, Table } from '../../components/ui'

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
          El corte contiene inconsistencias que impiden su validación y posterior envío a TransUnion.
          El corte permanecerá en estado <strong>BORRADOR</strong>.
        </Alert>

        <p className="text-sm text-slate-700">
          A continuación se detallan las reglas correctivas que no fueron superadas:
        </p>

        <div className="overflow-hidden rounded-ctl border border-gris-d">
          <Table caption="Reglas correctivas fallidas">
            <thead>
              <tr>
                <th scope="col" className="w-48">Regla</th>
                <th scope="col">Detalle del error</th>
              </tr>
            </thead>
            <tbody>
              {errores.map((item, index) => (
                <tr key={`${item.regla}-${index}`}>
                  <td className="font-semibold text-danger">{item.regla}</td>
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
