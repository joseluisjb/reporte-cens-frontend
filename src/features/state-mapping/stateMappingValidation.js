// Validación pura de la homologación de un estado del SAC (RF48, pantalla 16). Mismas reglas y mensajes que
// el backend (contrato 0.9.1, `PUT /homologacion-estados/{estado_sac}/`); las usa también el backend simulado
// (mocks/rutas/homologacion.js), para que no se separen.
//  - «Estado de TransUnion»: un estado de la Tabla 4b que CENS usa y que no sea de cierre.
//  - «Cierre»: sin estado; según el estado anterior da Saldada (02) o Castigada recuperada (07) (RF12, RF15).
import { descripcionEstado, esEstadoDeCierre } from '../transunion/catalogosTU'

export const ACCIONES = Object.freeze({ ESTADO: 'ESTADO', CIERRE: 'CIERRE' })

export const MSG_HOMOLOGACION = {
  accion: 'Elige cómo se reporta el estado: como estado de TransUnion o como cierre.',
  estadoTu: 'Selecciona el estado de TransUnion.', // mockup v3 (homSave)
  noExiste: 'Ese estado no existe en TransUnion.',
  noUsado: (codigo) => `El estado ${descripcionEstado(codigo)} no se usa en CENS: elige un estado en uso.`, // contrato 0.9
  cierreConEstado: 'Un estado que cierra el crédito no lleva estado de TransUnion.', // contrato 0.9
  estadoDeCierre: 'Saldada y Castigada recuperada se asignan con «Cierre», según el estado anterior.', // contrato 0.9.1
}

// Los estados que se pueden asignar con «Estado de TransUnion»: los de la Tabla 4b que no son de cierre.
export const asignables = (estados) => estados.filter((e) => !esEstadoDeCierre(e.codigo))

// ({ accion, estadoTu }, estados [{ codigo, usado }]) → { accion?, estadoTu? } o {}.
export function validarHomologacion({ accion, estadoTu }, estados) {
  if (accion !== ACCIONES.ESTADO && accion !== ACCIONES.CIERRE) return { accion: MSG_HOMOLOGACION.accion }
  if (accion === ACCIONES.CIERRE) return estadoTu ? { estadoTu: MSG_HOMOLOGACION.cierreConEstado } : {}
  if (!estadoTu) return { estadoTu: MSG_HOMOLOGACION.estadoTu }
  const estado = estados.find((e) => e.codigo === estadoTu)
  if (!estado) return { estadoTu: MSG_HOMOLOGACION.noExiste }
  if (esEstadoDeCierre(estadoTu)) return { estadoTu: MSG_HOMOLOGACION.estadoDeCierre }
  if (!estado.usado) return { estadoTu: MSG_HOMOLOGACION.noUsado(estadoTu) }
  return {}
}
