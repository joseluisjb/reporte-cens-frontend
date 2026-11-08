// Traduce las refinanciaciones (pantalla 11, contrato 0.9) del backend al formato de la interfaz
// (camelCase) y el formulario a la petición. Si el backend cambia un nombre, se corrige solo aquí.
//
//   Refinanciacion → { id, fecha, fechaRegistro, registradaPor, origen, original, nueva, saldoRefinanciado,
//                      naturaleza: { codigo, descripcion, confirmado }, numeroCuotas }
import { soloFecha } from '../../lib/format'
import { descripcionEstado } from '../transunion/catalogosTU'
import { cuotasValidas } from './refinancingValidation'

const estado = (codigo) => (codigo ? { codigo, descripcion: descripcionEstado(codigo) } : null)

export function mapRefinanciacion(raw) {
  const o = raw.obligacion_original
  const n = raw.obligacion_nueva
  return {
    id: raw.id,
    fecha: soloFecha(raw.fecha),
    fechaRegistro: raw.fecha_registro ? new Date(raw.fecha_registro) : null,
    registradaPor: raw.registrada_por ?? null,
    origen: raw.origen,
    original: {
      id: o.obligacion_id,
      numeroObligacion: o.numero_obligacion,
      nombreTitular: o.nombre_titular,
      estadoCierre: estado(o.estado_cierre),
      modoExtincion: { codigo: o.modo_extincion.codigo, descripcion: o.modo_extincion.descripcion },
    },
    nueva: { id: n.obligacion_id, numeroObligacion: n.numero_obligacion, estado: estado(n.estado_tu), numeroReestructuraciones: n.numero_reestructuraciones },
    saldoRefinanciado: raw.saldo_refinanciado,
    naturaleza: { codigo: raw.naturaleza.codigo, descripcion: raw.naturaleza.descripcion, confirmado: raw.naturaleza.confirmado },
    numeroCuotas: raw.numero_cuotas,
  }
}

// Formulario → RefinanciacionCreateRequest.
export const aPeticionRefinanciacion = ({ obligacionOriginalId, naturaleza, numeroCuotas, fecha }) => ({
  obligacion_original_id: Number(obligacionOriginalId),
  naturaleza,
  numero_cuotas: cuotasValidas(numeroCuotas) ?? Number(numeroCuotas),
  fecha,
})

// Errores de `POST /refinanciaciones/` → nombres del formulario.
export const mapRefinanciacionFieldErrors = (fe = {}) => ({
  obligacionOriginalId: fe.obligacion_original_id,
  naturaleza: fe.naturaleza,
  numeroCuotas: fe.numero_cuotas,
  fecha: fe.fecha,
})
