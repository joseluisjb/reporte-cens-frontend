// Reporte a TransUnion (pantalla 12, RF20–RF22, RF51, RF53, RF57) del backend simulado: las reglas de
// «Validaciones antes de generar» y el contenido del archivo plano.
//
// Las reglas se aplican a las obligaciones de la Iteración 2 (`db.obligaciones`) que entran en el corte:
// las abiertas y las que cerraron en ese corte, sin las eliminadas (RF13, RF16, RF21, RF50). Es una
// versión reducida de las reglas de RF53: el backend real aplica todas las del Manual.
import { esEstadoDeCierre } from '../../features/transunion/catalogosTU'
import { formatearCOP, formatearFechaHora, plural } from '../../lib/format'
import { db } from '../db'
import { aDetalle } from './obligacionesIteracion2'

// Número de obligación: máximo 20 caracteres y solo los especiales que admite el Manual.
const NUMERO_VALIDO = /^[A-Za-z0-9()*,\-./\\_¯·]{1,20}$/
const LARGO_NOMBRE = 60
const VALOR_MINIMO = 10000
const VALOR_MAXIMO = 99000000
const DIAS_18_MESES = 540

const resultado = (regla, titulo, nivel, detalle, rf, { porConfirmar = false, obligaciones = [] } = {}) => ({
  regla,
  titulo,
  nivel,
  detalle,
  rf,
  por_confirmar: porConfirmar,
  obligaciones,
})
const referida = (o, campo, mensaje) => ({ obligacion_id: o.obligacion_id, numero_obligacion: o.numero_obligacion, campo, mensaje })
const lista = (obligaciones) => obligaciones.map((o) => o.numero_obligacion).join(', ')

// Estado de la obligación a la fecha del corte, según su línea de tiempo: en un corte anterior, una
// obligación que cerró después todavía estaba abierta.
const estadoAlCorte = (o, fechaCorte) => o.eventos.filter((e) => e.fecha <= fechaCorte).at(-1)?.estado ?? o.estado

// Las obligaciones que entran en el archivo del corte: las que ya existían, sin las eliminadas ni las
// que cerraron en un corte anterior. Con su estado y su mora a esa fecha (y el registro guardado, para
// los campos que el detalle no trae, como el nombre completo). Los saldos son los de hoy: el mock no
// guarda su historia.
export function obligacionesDelCorte(fechaCorte) {
  return obligacionesExistentes(fechaCorte)
    .filter((o) => !o.eliminada && (!esEstadoDeCierre(o.estado) || o.cierre?.fecha_corte >= fechaCorte))
    .map((o) => {
      const estado = estadoAlCorte(o, fechaCorte)
      return { ...aDetalle(o, fechaCorte), estado_tu: estado, cerrada: esEstadoDeCierre(estado), registro: o }
    })
}

// Las obligaciones que ya existían en la fecha del corte (las que no entran cuentan como excluidas).
export const obligacionesExistentes = (fechaCorte) => db.obligaciones.filter((o) => o.ingreso <= fechaCorte)

// Estados de un corte ya enviado a TransUnion (contrato 0.9: con resultados del cargue puede quedar con inconsistencias).
export const ESTADOS_ENVIADOS = ['ENVIADO', 'ENVIADO_CON_INCONSISTENCIAS']

// Fecha del último corte enviado ('' si no hay ninguno).
export const ultimoCorteEnviado = () => db.cortes.filter((c) => ESTADOS_ENVIADOS.includes(c.estado)).reduce((max, c) => (c.fecha_corte > max ? c.fecha_corte : max), '')

// ValidacionesCorte del contrato 0.9 para un corte de `db.cortes`.
export function validacionesDelCorte(corte, { entidadConMarcador }) {
  const ciclo = db.ciclos.find((c) => c.corte_id === corte.id)
  const incluidas = obligacionesDelCorte(corte.fecha_corte)
  const abiertas = incluidas.filter((o) => !o.cerrada)
  const cierres = incluidas.filter((o) => o.cerrada)
  const resultados = []

  resultados.push(
    ciclo
      ? resultado('ACTUALIZACION_MENSUAL', 'Actualización mensual del corte', 'ok', `Ejecutada el ${formatearFechaHora(new Date(ciclo.fecha_ejecucion))} por ${ciclo.ejecutada_por ?? 'el proceso programado'}.`, ['RF10', 'RF11'])
      : resultado('ACTUALIZACION_MENSUAL', 'Actualización mensual del corte', 'correctiva', 'Falta ejecutar la actualización mensual de este corte.', ['RF10', 'RF11']),
  )

  const rechazos = ciclo?.rechazos ?? []
  resultados.push(
    rechazos.length
      ? resultado(
          'CAMBIOS_RECHAZADOS',
          'Cambios de estado y primer reporte',
          'correctiva',
          `${plural(rechazos.length, 'obligación tiene', 'obligaciones tienen')} un cambio no permitido (error 713 u 881). Corrige el dato en el SAC, regenera la extracción y vuelve a ejecutar la actualización mensual.`,
          ['RF10', 'RF14'],
          { obligaciones: rechazos.map((r) => referida(r, 'estado_tu', r.motivo)) },
        )
      : resultado('CAMBIOS_RECHAZADOS', 'Cambios de estado y primer reporte', 'ok', 'Todos cumplen la matriz de TransUnion y las reglas de primer reporte.', ['RF10', 'RF14']),
  )

  // RF21: las activas del último corte enviado deben seguir en este. En el mock todas siguen (las
  // obligaciones no desaparecen), así que solo se cuentan; la omisión se prueba con un escenario.
  const ultimaEnviada = ultimoCorteEnviado()
  const activasAntes = ultimaEnviada ? abiertas.filter((o) => o.registro.ingreso <= ultimaEnviada).length + cierres.length : 0
  resultados.push(
    resultado(
      'OMISION_VS_ULTIMO_CORTE',
      'Obligaciones del último corte',
      'ok',
      ultimaEnviada ? `${activasAntes} de ${activasAntes} obligaciones activas del último corte incluidas.` : 'Es el primer corte: no hay un corte enviado con qué comparar.',
      ['RF21'],
    ),
  )

  const malNumero = incluidas.filter((o) => !NUMERO_VALIDO.test(o.numero_obligacion))
  resultados.push(
    malNumero.length
      ? resultado('NUMERO_OBLIGACION_INVALIDO', 'Números de obligación', 'correctiva', `Con más de 20 caracteres o caracteres no permitidos: ${lista(malNumero)}.`, ['RF53'], {
          obligaciones: malNumero.map((o) => referida(o, 'numero_obligacion', 'El número de obligación tiene más de 20 caracteres o caracteres no permitidos.')),
        })
      : resultado('NUMERO_OBLIGACION_INVALIDO', 'Números de obligación', 'ok', 'Todos tienen máximo 20 caracteres y solo caracteres permitidos.', ['RF53']),
  )

  // RF22: cierres del corte con todos los campos y los valores en cero.
  const fallasCierre = cierres.flatMap((o) => {
    const c = o.cierre
    const fallas = []
    if (!c?.fecha_pago) fallas.push(referida(o, 'fecha_pago', 'Falta la fecha de pago del cierre.'))
    if (!c?.modo_extincion) fallas.push(referida(o, 'modo_extincion', 'Falta el modo de extinción del cierre.'))
    if (!c?.tipo_pago) fallas.push(referida(o, 'tipo_pago', 'Falta el tipo de pago del cierre.'))
    if (o.valor_saldo !== 0) fallas.push(referida(o, 'valor_saldo', 'El saldo debe ser 0 al cerrar.'))
    if (o.valor_mora !== 0) fallas.push(referida(o, 'valor_mora', 'El valor en mora debe ser 0 al cerrar.'))
    if (o.valor_cuota !== 0) fallas.push(referida(o, 'valor_cuota', 'La cuota debe ser 0 al cerrar.'))
    return fallas
  })
  resultados.push(
    fallasCierre.length
      ? resultado('CIERRE_INCOMPLETO', 'Campos de cierre (RF22)', 'correctiva', `Hay cierres sin todos sus campos: ${[...new Set(fallasCierre.map((f) => f.numero_obligacion))].join(', ')}.`, ['RF22'], { obligaciones: fallasCierre })
      : resultado('CIERRE_INCOMPLETO', 'Campos de cierre (RF22)', 'ok', `${plural(cierres.length, 'cierre', 'cierres')} con saldo, mora y cuota en cero, fecha de pago, modo de extinción y tipo de pago.`, ['RF22']),
  )

  // Campos obligatorios de Servicios. Las pruebas pueden forzar el error (mocks/datos/validaciones.js).
  resultados.push(
    db.cortesConErrorForzado.includes(corte.id)
      ? resultado('SIN_IDENTIFICACION', 'Campos obligatorios', 'correctiva', 'Falta el tipo o el número de identificación.', ['RF53'])
      : resultado('SIN_IDENTIFICACION', 'Campos obligatorios', 'ok', 'Todas tienen los campos obligatorios de Sector Real Servicios.', ['RF53']),
  )

  resultados.push(
    resultado(
      'VALORES_EN_MILES',
      'Valores en miles de pesos (RF51)',
      'informativa',
      'Saldo, mora, cuota y valor inicial se reportan en miles de pesos, como enteros. Regla de redondeo por confirmar con TransUnion.',
      ['RF51'],
      { porConfirmar: true },
    ),
  )

  // Valores fuera de $10.000 a $99 millones (informativa en TransUnion, Manual p. 19).
  const fueraDeRango = incluidas.flatMap((o) =>
    [
      ['valor_inicial', 'El valor inicial', o.valor_inicial],
      ['valor_saldo', 'El saldo', o.valor_saldo],
      ['valor_mora', 'El valor en mora', o.valor_mora],
      ['valor_cuota', 'La cuota', o.valor_cuota],
    ]
      .filter(([, , v]) => v > 0 && (v < VALOR_MINIMO || v > VALOR_MAXIMO))
      .map(([campo, texto, v]) => referida(o, campo, `${texto} es de ${formatearCOP(v)}: está fuera de $10.000 a $99.000.000.`)),
  )
  resultados.push(
    fueraDeRango.length
      ? resultado('VALORES_FUERA_DE_RANGO', 'Valores fuera de rango', 'advertencia', `${plural(fueraDeRango.length, 'valor está', 'valores están')} fuera de $10.000 a $99.000.000. TransUnion lo acepta, pero lo informa.`, ['RF51', 'RF53'], { obligaciones: fueraDeRango })
      : resultado('VALORES_FUERA_DE_RANGO', 'Valores fuera de rango', 'ok', 'Todos los valores están entre $10.000 y $99.000.000.', ['RF51', 'RF53']),
  )

  const saldoMayor = abiertas.filter((o) => o.valor_saldo > o.valor_inicial)
  resultados.push(
    saldoMayor.length
      ? resultado('SALDO_MAYOR_INICIAL', 'Saldo y valor inicial', 'informativa', `El saldo es mayor que el valor inicial en ${lista(saldoMayor)}.`, ['RF52', 'RF53'], {
          obligaciones: saldoMayor.map((o) => referida(o, 'valor_saldo', `El saldo (${formatearCOP(o.valor_saldo)}) es mayor que el valor inicial (${formatearCOP(o.valor_inicial)}).`)),
        })
      : resultado('SALDO_MAYOR_INICIAL', 'Saldo y valor inicial', 'ok', 'Ningún saldo supera el valor inicial.', ['RF52', 'RF53']),
  )

  resultados.push(
    entidadConMarcador
      ? resultado('ENTIDAD_CON_MARCADOR', 'Datos de la entidad (RF57)', 'advertencia', 'Llevan relleno mientras TransUnion no los asigne: el archivo saldrá no apto para envío.', ['RF57'])
      : resultado('ENTIDAD_CON_MARCADOR', 'Datos de la entidad (RF57)', 'ok', 'Tipo de entidad, código de entidad y sucursal asignados por TransUnion.', ['RF57']),
  )

  const largas = abiertas.filter((o) => o.dias_mora >= DIAS_18_MESES)
  resultados.push(
    largas.length
      ? resultado('MORA_MAS_18_MESES', 'Mora de más de 18 meses', 'advertencia', `${plural(largas.length, 'obligación lleva', 'obligaciones llevan')} 540 días o más en mora. Qué hacer con ellas depende del concepto de jurídica (Ley 2157).`, ['RF49'], {
          porConfirmar: true,
          obligaciones: largas.map((o) => referida(o, 'dias_mora', `${o.dias_mora} días de mora.`)),
        })
      : resultado('MORA_MAS_18_MESES', 'Mora de más de 18 meses', 'ok', 'Ninguna obligación supera 540 días de mora.', ['RF49']),
  )

  const hayCorrectivas = resultados.some((r) => r.nivel === 'correctiva')
  return {
    corte_id: corte.id,
    fecha_corte: corte.fecha_corte,
    estado_corte: corte.estado,
    puede_generar: !hayCorrectivas && corte.estado === 'VALIDADO',
    resultados,
  }
}

// Las correctivas como `errores` de `validar` (ReglaMensaje con la obligación, contrato 0.9).
export function erroresCorrectivos(validaciones) {
  return validaciones.resultados
    .filter((r) => r.nivel === 'correctiva')
    .flatMap((r) => (r.obligaciones.length ? r.obligaciones.map((o) => ({ regla: r.regla, mensaje: o.mensaje, obligacion_id: o.obligacion_id, numero_obligacion: o.numero_obligacion, campo: o.campo })) : [{ regla: r.regla, mensaje: r.detalle }]))
}

// Campos que no caben en su posición (RF20, flujo alterno 1): no se genera el archivo.
export function camposLargos(incluidas) {
  return incluidas
    .filter((o) => o.registro.titular.length > LARGO_NOMBRE)
    .map((o) => ({
      regla: 'CAMPO_EXCEDE_LONGITUD',
      mensaje: `El nombre del titular tiene ${o.registro.titular.length} caracteres y el campo admite ${LARGO_NOMBRE}.`,
      obligacion_id: o.obligacion_id,
      numero_obligacion: o.numero_obligacion,
      campo: 'nombre_titular',
    }))
}

// ── Contenido del archivo plano (Manual Sector Real v34, pp. 44-52) ──
// Registro 1 (Tabla 1, 29 caracteres), un registro 2 por obligación (Tabla 2) y registro 9 (Tabla 5, 33).
// Fin de línea CRLF. Reglas de la p. 44: los numéricos van alineados a la derecha con ceros a la izquierda;
// los alfanuméricos, a la izquierda con espacios a la derecha, salvo el número de obligación, que va a la
// derecha con espacios a la izquierda; las fechas, AAAAMMDD; un dato que no se reporta va en espacios.
// Valores en miles (RF51): un valor mayor que cero que redondea a 0 se reporta como 1 (propuesta P-TU-02;
// el redondeo está por confirmar con TransUnion).
const miles = (pesos) => (pesos > 0 ? Math.max(1, Math.round(pesos / 1000)) : 0)
const ceros = (n, largo) => String(n).padStart(largo, '0')
const sinGuiones = (fecha) => fecha.replaceAll('-', '')

// Tabla 22 (p. 75): 11 = Sector real, cartera servicios (SSR). Tabla 23: 01 = reporte total.
const CODIGO_PAQUETE = '11'
const TIPO_REPORTE_TOTAL = '01'

// Campos del registro tipo 2 que el mock puede llenar: [posición inicial, longitud] (Tabla 2, pp. 45-51).
// Los demás quedan en espacios. El mock no tiene el tipo ni el número de identificación sin enmascarar
// (campos 2 y 3, obligatorios): el backend los toma de la base de datos. Tampoco llena «obligación
// reestructurada» (campo 44, Tabla 32), la periodicidad, las cuotas pagadas y pactadas, la fecha inicial
// ni los datos de contacto, que no guarda.
const R2 = {
  tipoRegistro: [1, 1], // Tabla 21: 2 = detalles
  nombreTitular: [19, 60],
  numeroObligacion: [89, 20],
  codigoSucursal: [109, 6],
  calidad: [115, 1], // Tabla 3: P = principal (el mock solo guarda al titular)
  estado: [120, 2], // Tabla 4b
  edadMora: [122, 2], // Tabla 9
  aniosMora: [124, 2],
  fechaCorte: [126, 8],
  fechaExigibilidad: [150, 8],
  fechaPago: [166, 8],
  modoExtincion: [174, 2], // Tabla 10
  tipoPago: [176, 2], // Tabla 31
  cuotasMora: [189, 3],
  valorInicial: [192, 12], // «Valor o cupo», en miles
  valorMora: [204, 12],
  valorSaldo: [216, 12],
  valorCuota: [228, 12],
  naturalezaReestructuracion: [292, 2], // Tabla 11
  numeroReestructuraciones: [294, 3],
}

function registro2(o, { fechaCorte, sucursal, longitud }) {
  const linea = Array.from({ length: longitud }, () => ' ')
  const poner = ([posicion, largo], valor) => {
    if (valor.length !== largo) throw new Error(`Campo de ${largo} caracteres con «${valor}»`)
    for (let i = 0; i < largo; i++) linea[posicion - 1 + i] = valor[i]
  }
  const { cierre, reestructuracion } = o.registro
  poner(R2.tipoRegistro, '2')
  poner(R2.nombreTitular, o.registro.titular.padEnd(60))
  poner(R2.numeroObligacion, o.numero_obligacion.padStart(20))
  poner(R2.codigoSucursal, sucursal)
  poner(R2.calidad, 'P')
  poner(R2.estado, o.estado_tu)
  poner(R2.edadMora, o.edad_mora)
  if (o.anios_mora != null) poner(R2.aniosMora, ceros(o.anios_mora, 2))
  poner(R2.fechaCorte, sinGuiones(fechaCorte))
  if (o.fecha_exigibilidad) poner(R2.fechaExigibilidad, sinGuiones(o.fecha_exigibilidad))
  if (o.cerrada && cierre) {
    if (cierre.fecha_pago) poner(R2.fechaPago, sinGuiones(cierre.fecha_pago))
    if (cierre.modo_extincion) poner(R2.modoExtincion, cierre.modo_extincion.codigo)
    if (cierre.tipo_pago) poner(R2.tipoPago, cierre.tipo_pago.codigo)
  }
  poner(R2.cuotasMora, ceros(o.cuotas_mora, 3))
  poner(R2.valorInicial, ceros(miles(o.valor_inicial), 12))
  poner(R2.valorMora, ceros(miles(o.valor_mora), 12))
  poner(R2.valorSaldo, ceros(miles(o.valor_saldo), 12))
  poner(R2.valorCuota, ceros(miles(o.valor_cuota), 12))
  if (reestructuracion) {
    poner(R2.naturalezaReestructuracion, reestructuracion.naturaleza.codigo)
    poner(R2.numeroReestructuraciones, ceros(reestructuracion.numero_reestructuraciones, 3))
  }
  return linea.join('')
}

export function contenidoArchivo({ fechaCorte, tipoEntidad, codigoEntidad, sucursal, longitud, incluidas }) {
  // Tabla 1: tipo de registro, código de paquete, tipo y código de entidad, reservado (10), tipo de reporte y fecha de corte.
  const r1 = `1${CODIGO_PAQUETE}${tipoEntidad}${codigoEntidad}${' '.repeat(10)}${TIPO_REPORTE_TOTAL}${sinGuiones(fechaCorte)}`
  const r2 = incluidas.map((o) => registro2(o, { fechaCorte, sucursal, longitud }))
  // Tabla 5: tipo de registro y número de registros total (con el 1 y el 9), tipo 2, tipo 3 y tipo 4.
  const r9 = `9${ceros(incluidas.length + 2, 8)}${ceros(incluidas.length, 8)}${ceros(0, 8)}${ceros(0, 8)}`
  return [r1, ...r2, r9].join('\r\n') + '\r\n'
}
