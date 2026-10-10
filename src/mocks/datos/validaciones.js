// Reglas de validación del corte (POST /extracciones/{id}/validar/) aplicadas a las obligaciones generadas.
// Dos severidades, como el backend:
//  - CORRECTIVA: bloquea. El corte sigue en BORRADOR y la respuesta es 409 con la lista `errores`.
//  - INFORMATIVA: no bloquea. Sale como `advertencias` en la respuesta 200.
// Cada resultado es { regla, mensaje }. Con los datos de ejemplo no hay errores y sí advertencias.
import { db } from '../db'
import { OBLIGACIONES_SIN_FECHA_LIMITE } from './obligaciones'

// Mensaje tal cual lo devuelve el backend (sus pruebas); el resto sigue el estilo del manual.
const MSG_SIN_FECHA_LIMITE = 'No se encontró una factura con fecha de vencimiento.'

// Hace que `validar` falle con un error correctivo en ese corte (solo para pruebas). Vive en memoria y
// `resetMockDb` lo limpia.
export function forzarErrorCorrectivo(corteId) {
  if (!db.cortesConErrorForzado.includes(corteId)) db.cortesConErrorForzado.push(corteId)
}

// → { errores: [...], advertencias: [...] }
export function validarCorte(corte, obligaciones) {
  const errores = []
  const advertencias = []

  for (const o of obligaciones) {
    const n = o.numero_obligacion
    // CORRECTIVAS
    if (o.estado_tu === '02' && (o.valor_mora > 0 || o.edad_mora !== '00')) {
      errores.push({ regla: 'SALDADA_CON_MORA', mensaje: `La obligación ${n} está saldada con valor en mora o edad de mora distinta de 00.` })
    }
    if (o.edad_mora !== '00' && o.valor_mora === 0) {
      errores.push({ regla: 'EDAD_SIN_VALOR_MORA', mensaje: `La obligación ${n} tiene edad de mora distinta de 00 pero no tiene valor en mora.` })
    }
    // INFORMATIVAS
    if (OBLIGACIONES_SIN_FECHA_LIMITE.has(n)) {
      advertencias.push({ regla: 'SIN_FECHA_LIMITE_PAGO', mensaje: MSG_SIN_FECHA_LIMITE })
    }
    if (o.cuotas_mora > 0 && o.edad_mora === '00') {
      advertencias.push({ regla: 'CUOTAS_MORA_SIN_EDAD', mensaje: `La obligación ${n} tiene cuotas en mora pero menos de 30 días de mora (edad de mora 00).` })
    }
  }

  if (db.cortesConErrorForzado.includes(corte.id)) {
    errores.push({ regla: 'SIN_IDENTIFICACION', mensaje: 'Falta el tipo o el número de identificación' })
  }
  return { errores, advertencias }
}
