// Traduce la actualización mensual (pantalla 10, contrato 0.9) del backend al formato de la interfaz
// (camelCase). Si el backend cambia un nombre de campo, se corrige solo aquí.
//
//   CicloResumen   → { corteId, fechaCorte, fechaEjecucion, ejecutadaPor, primerReporte, cambiosEstado, cierres, rechazados }
//   CicloDetalle   → lo anterior + conPagos, aDudoso, aCastigada, normalizadas, transiciones y rechazos
//   MatrizEstados  → { estados, permitida(desde, desdeConMora, hacia, haciaConMora) }
//
// Los estados llegan como { codigo, descripcion } (Tabla 4b de catalogosTU) o null en primer reporte.
import { soloFecha as fecha } from '../../lib/format'
import { descripcionEstado } from '../transunion/catalogosTU'

const estado = (codigo) => (codigo ? { codigo, descripcion: descripcionEstado(codigo) } : null)
const regla = (r) => ({ rf: r.rf, texto: r.texto, porConfirmar: r.por_confirmar })

export function mapCicloResumen(raw) {
  return {
    corteId: raw.corte_id,
    fechaCorte: fecha(raw.fecha_corte),
    fechaEjecucion: raw.fecha_ejecucion ? new Date(raw.fecha_ejecucion) : null,
    ejecutadaPor: raw.ejecutada_por ?? null,
    primerReporte: raw.primer_reporte,
    cambiosEstado: raw.cambios_estado,
    cierres: raw.cierres,
    rechazados: raw.rechazados,
  }
}

const mapTransicion = (t) => ({
  obligacionId: t.obligacion_id,
  numeroObligacion: t.numero_obligacion,
  nombreTitular: t.nombre_titular,
  estadoAnterior: estado(t.estado_anterior),
  estadoNuevo: estado(t.estado_nuevo),
  edadAnterior: t.edad_anterior ?? null,
  edadNueva: t.edad_nueva,
  primerReporte: t.primer_reporte,
  requiereRevision: t.requiere_revision,
  reglas: t.reglas.map(regla),
})

const mapRechazo = (r) => ({
  obligacionId: r.obligacion_id,
  numeroObligacion: r.numero_obligacion,
  nombreTitular: r.nombre_titular,
  estadoAnterior: estado(r.estado_anterior),
  estadoCalculado: estado(r.estado_calculado),
  codigo: r.codigo,
  motivo: r.motivo,
})

export function mapCicloDetalle(raw) {
  return {
    ...mapCicloResumen(raw),
    conPagos: raw.con_pagos,
    aDudoso: raw.a_dudoso,
    aCastigada: raw.a_castigada,
    normalizadas: raw.normalizadas,
    transiciones: raw.transiciones.map(mapTransicion),
    rechazos: raw.rechazos.map(mapRechazo),
  }
}

const clave = (desde, desdeConMora, hacia, haciaConMora) => `${desde}${desdeConMora ? 'm' : 'n'}>${hacia}${haciaConMora ? 'm' : 'n'}`

export function mapMatriz(raw) {
  const permitidas = new Set(raw.transiciones.filter((t) => t.permitida).map((t) => clave(t.desde, t.desde_con_mora, t.hacia, t.hacia_con_mora)))
  return {
    estados: raw.estados,
    permitida: (desde, desdeConMora, hacia, haciaConMora) => permitidas.has(clave(desde, desdeConMora, hacia, haciaConMora)),
  }
}

// Errores de `POST /ciclos/` → nombres del formulario.
export const mapCicloFieldErrors = (fe = {}) => ({ fechaCorte: fe.fecha_corte })
