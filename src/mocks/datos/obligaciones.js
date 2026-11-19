// Obligaciones FICTICIAS de un corte, generadas al pedirlas (no se guardan). Siguen el Manual Sector Real
// v34 de TransUnion, sector Servicios (ver features/transunion/catalogosTU.js):
//  - Cada fila es una obligación (un proceso de financiación). Su número es PERMANENTE: la fila N tiene el
//    mismo `numero_obligacion` en todos los cortes (cambiarlo haría que TransUnion la tome como nueva).
//  - `edad_mora` sale SIEMPRE de `dias_mora` con la Tabla 9.
//  - Saldada (`02`): saldo 0, mora 0, cuotas en mora 0, días 0 y edad '00' (el manual cierra una obligación
//    reportándola como Saldada; contrato 0.4, diferencia A2).
//  - `valor_mora` es 0 solo cuando `dias_mora` es 0. Con mora de menos de 30 días la edad sigue siendo '00'
//    pero hay valor en mora y al menos una cuota en mora (el manual lo permite).
//  - `valor_mora` nunca supera `valor_saldo`. Todos los valores son enteros en pesos.
// Lo que depende del corte (semilla = id del corte) son solo los montos; el estado, los días y las filas
// saldadas o castigadas dependen de la posición de la fila, así que cualquier corte es coherente.
import { edadMoraDesdeDias } from '../../features/transunion/catalogosTU'
import { enmascararIdentificacion } from '../../lib/format'

export const TOTAL_OBLIGACIONES = 24

// Días de mora por fila (posición 0 a 23). Recorre los tramos de la Tabla 9: 0, 12, 45, 75, 100, 130, 200,
// 335, 400, 600, 800...
const DIAS_MORA = [0, 12, 45, 0, 75, 0, 100, 130, 0, 200, 400, 0, 600, 12, 0, 800, 335, 0, 0, 75, 5, 400, 0, 130]
const FILAS_SALDADAS = new Set([3, 17])
const FILAS_CASTIGADAS = new Set([21])
// Filas a las que "no se les encontró factura con fecha de vencimiento" (regla informativa de validar).
// Son filas vigentes al día (0 días de mora).
const FILAS_SIN_FECHA_LIMITE = new Set([5])

const numeroObligacion = (i) => `FIC-${String(200000 + i * 137).padStart(6, '0')}`
const dos = (n) => String(n).padStart(2, '0')

export const OBLIGACIONES_SIN_FECHA_LIMITE = new Set([...FILAS_SIN_FECHA_LIMITE].map(numeroObligacion))

// Generador pseudoaleatorio determinista (mulberry32): misma semilla, mismos números.
function aleatorio(semilla) {
  let a = semilla >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const aMilesDePesos = (n) => Math.round(n / 1000) * 1000

// Fecha 'YYYY-MM-DD' corrida `dias` días (en UTC, para no correrla por la zona horaria).
function sumarDias(iso, dias) {
  const fecha = new Date(`${iso}T00:00:00Z`)
  fecha.setUTCDate(fecha.getUTCDate() + dias)
  return fecha.toISOString().slice(0, 10)
}

// Los 22 campos de la plantilla de CENS (contrato 0.9.7, CamposReporte), coherentes con la fila.
function camposReporte(corte, i, fila, { saldada, valorCuota }) {
  const sinFecha = saldada || FILAS_SIN_FECHA_LIMITE.has(i)
  return {
    tipo_identificacion: '01',
    numero_identificacion: enmascararIdentificacion(fila.numero_identificacion),
    nombre_titular: fila.nombre_titular,
    fecha_limite_pago: sinFecha || !corte.fecha_corte ? null : sumarDias(corte.fecha_corte, fila.dias_mora > 0 ? -fila.dias_mora : 15),
    numero_obligacion: fila.numero_obligacion,
    codigo_sucursal: 'XXXXXX',
    calidad: 'P',
    estado_tu: fila.estado_tu,
    edad_mora: fila.edad_mora,
    fecha_corte: corte.fecha_corte,
    fecha_inicio: `2025-${dos((i % 12) + 1)}-15`,
    periodicidad: '05',
    cuotas_mora: fila.cuotas_mora,
    valor_inicial: valorCuota * 12,
    valor_mora: fila.valor_mora,
    valor_saldo: fila.valor_saldo,
    valor_cuota: saldada ? 0 : valorCuota,
    obligacion_refinanciada: '02',
    correo: i % 4 === 3 ? null : `t***@example.com`,
    celular: i % 4 === 3 ? null : `******${dos(i + 1)}45`,
    valor_real_pagado: saldada ? null : fila.dias_mora === 0 ? valorCuota : 0,
  }
}

// Filas ObligacionCorte (contrato), ordenadas por numero_obligacion, con las claves en el orden del contrato.
export function generarObligaciones(corte) {
  const azar = aleatorio(corte.id * 7919 + 13)
  return DIAS_MORA.map((diasMora, i) => {
    const saldoBruto = 150000 + azar() * 4850000 // siempre se consume, aunque la fila sea saldada
    const nCreditos = 1 + Math.floor(azar() * 3)
    const saldada = FILAS_SALDADAS.has(i)
    const castigada = FILAS_CASTIGADAS.has(i)

    const dias = saldada ? 0 : diasMora
    const valorSaldo = saldada ? 0 : aMilesDePesos(saldoBruto)
    const cuotasMora = dias === 0 ? 0 : Math.max(1, Math.ceil(dias / 30))
    const valorCuota = Math.max(1000, aMilesDePesos(saldoBruto / 12))
    const valorMora = dias === 0 ? 0 : Math.min(valorSaldo, cuotasMora * valorCuota)
    const fila = {
      numero_obligacion: numeroObligacion(i),
      nombre_titular: `TITULAR FICTICIO ${dos(i + 1)}`,
      numero_identificacion: `10000000${dos(i + 1)}`,
      estado_tu: saldada ? '02' : castigada ? '06' : '01',
      edad_mora: edadMoraDesdeDias(dias),
      dias_mora: dias,
      cuotas_mora: cuotasMora,
      valor_mora: valorMora,
      valor_saldo: valorSaldo,
      n_creditos: nCreditos,
    }
    return { ...fila, campos_reporte: camposReporte(corte, i, fila, { saldada, valorCuota }) }
  })
}

// Los dos datos del resumen del corte: cuántas obligaciones tiene y la suma de sus saldos (COP).
export function totalesCorte(corte) {
  const filas = generarObligaciones(corte)
  return { totalObligaciones: filas.length, saldoConsolidado: filas.reduce((suma, fila) => suma + fila.valor_saldo, 0) }
}
