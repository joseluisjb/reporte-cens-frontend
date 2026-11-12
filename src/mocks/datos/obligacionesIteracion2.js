// Las 12 obligaciones FICTICIAS del mockup v3 (docs/iteracion2/NexoVolt_Mockups_Iteracion2_v3.html),
// en su estado después del ciclo del corte 2026-09-30. Son de la Iteración 2 (pantallas 9 a 16) y NO
// reemplazan a las 24 obligaciones FIC- de la extracción (mocks/datos/obligaciones.js), de las que
// dependen las pruebas de la Iteración 1.
//
// Aquí se guarda solo lo que el backend guardaría (cuotas vencidas, cierre, eventos…); el valor en
// mora, los días, la edad, las cuotas en mora y la fecha de exigibilidad se calculan al corte, como
// hace el `recalc` del mockup (RF7, RF19, RF49). Los textos de «Qué puede pasar» siguen a `modalObl`
// del mockup. Los nombres, números y valores son inventados.
import { descripcionEstado, edadMoraDesdeDias, esEstadoDeCierre } from '../../features/transunion/catalogosTU'
import { formatearFechaISO } from '../../lib/format'

export const FECHA_ULTIMO_CICLO = '2026-09-30'

// Conceptos de la cuota (texto del mockup v3).
const CONCEPTOS = {
  30: 'Cuota financiación consumo de energía',
  3588: 'Cuota recuperación energía dejada de facturar',
  3625: 'Cuota financiación energía no regulados',
  3801: 'Cuota energía recuperada CRPE',
  3839: 'Cuota financiación energía recargable',
}

export const VOLUNTARIO = { codigo: '01', descripcion: 'Voluntario' }
export const NO_VOLUNTARIO = { codigo: '02', descripcion: 'No voluntario' }
export const REFINANCIACION = { codigo: '16', descripcion: 'Refinanciación' }

// [fecha de vencimiento, valor pendiente]
export const cuotas = (...lista) => lista.map(([fecha, valor]) => ({ fecha, valor }))
// [fecha, estado, texto, edad]
export const eventos = (...lista) => lista.map(([fecha, estado, texto, edad = '00']) => ({ fecha, estado, texto, edad }))

const base = {
  cuota_antes_cierre: null, vencidas: [], atrasos_permitidos: 4, caducado: false, primer_reporte: false,
  en_reclamo: false, eliminada: false, requiere_revision: false, motivo_revision: null, cierre: null,
  pago_mora: null, reestructuracion: null, refinanciada_en: null, movimiento_posterior_cierre: false,
  pagos: [], advertencias: [],
}
export const obligacion = (datos) => ({ ...base, ...datos })

export const obligacionesIniciales = () => [
  obligacion({
    id: 1, numero: '2257-4156', titular: 'Carlos Andrés Rueda', concepto: 30, estado: '01', saldo: 1276016, cuota: 98000,
    valor_inicial: 1600000, ingreso: '2026-03-31', vencidas: cuotas(['2026-09-07', 98000]),
    eventos: eventos(['2026-03-31', '01', 'Primer reporte en Vigente, al día'], ['2026-09-30', '01', 'Una cuota sin pagar: 23 días de mora (edad 00, con valor en mora)']),
  }),
  obligacion({
    id: 2, numero: '2258-7731', titular: 'María Fernanda Ortiz', concepto: 3625, estado: '01', saldo: 842300, cuota: 70000,
    valor_inicial: 1050000, ingreso: '2026-02-28', vencidas: cuotas(['2026-08-14', 70000], ['2026-09-14', 70000]),
    eventos: eventos(
      ['2026-02-28', '01', 'Primer reporte en Vigente, al día'],
      ['2026-08-31', '01', 'Primera cuota sin pagar: 17 días de mora'],
      ['2026-09-30', '01', 'Dos cuotas sin pagar: 47 días desde la más antigua, edad 01', '01'],
    ),
  }),
  obligacion({
    id: 3, numero: '2259-1092', titular: 'Jorge Iván Salcedo', concepto: 3588, estado: '02', saldo: 0, cuota: 0, cuota_antes_cierre: 85000,
    valor_inicial: 1020000, ingreso: '2025-11-30',
    cierre: { fecha_corte: '2026-09-30', fecha_pago: '2026-09-12', modo_extincion: VOLUNTARIO, tipo_pago: VOLUNTARIO },
    pagos: [{ fecha_corte: '2026-09-30', valor: 170000, aplicado_a: 'Cuotas del 2026-08-12 y del 2026-09-12 (pago total)', nota: null }],
    eventos: eventos(
      ['2025-11-30', '01', 'Primer reporte en Vigente, al día'],
      ['2026-08-31', '01', 'Una cuota sin pagar: 19 días de mora'],
      ['2026-09-12', '02', 'Pago total: pasa a Saldada. Fecha de pago 12/09/2026, modo de extinción 01, tipo de pago 01'],
      ['2026-09-30', '02', 'Se reporta como Saldada en este corte, una sola vez'],
    ),
  }),
  obligacion({
    id: 4, numero: '2260-5543', titular: 'Diana Patricia Niño', concepto: 3801, estado: '01', saldo: 3112450, cuota: 215000,
    valor_inicial: 4300000, ingreso: '2025-12-31', atrasos_permitidos: 6, en_reclamo: true,
    vencidas: cuotas(['2026-06-10', 215000], ['2026-07-10', 215000], ['2026-08-10', 215000], ['2026-09-10', 215000]),
    eventos: eventos(
      ['2025-12-31', '01', 'Primer reporte en Vigente, al día'],
      ['2026-06-30', '01', 'Primera cuota sin pagar: 20 días de mora'],
      ['2026-07-31', '01', '51 días desde la cuota más antigua sin pagar', '01'],
      ['2026-08-31', '01', '82 días desde la cuota más antigua sin pagar', '02'],
      ['2026-09-22', '01', 'Marcada en reclamo Habeas Data (Pago no reflejado). Se sigue reportando', '03'],
      ['2026-09-30', '01', '112 días. Su crédito caduca en el sistema comercial a las 6 cuotas atrasadas (lleva 4)', '03'],
    ),
  }),
  obligacion({
    id: 5, numero: '2261-8820', titular: 'Luis Fernando Cáceres', concepto: 30, estado: '01', saldo: 498700, cuota: 41000,
    valor_inicial: 615000, ingreso: '2026-01-31', vencidas: cuotas(['2026-09-15', 41000]),
    eventos: eventos(['2026-01-31', '01', 'Primer reporte en Vigente, al día'], ['2026-09-30', '01', 'Una cuota sin pagar: 15 días de mora']),
  }),
  obligacion({
    id: 6, numero: '2262-3318', titular: 'Centro Educativo Las Palmas', concepto: 3839, estado: '01', saldo: 1904120, cuota: 160000,
    valor_inicial: 2400000, ingreso: '2026-04-30', en_reclamo: true, vencidas: cuotas(['2026-08-23', 160000], ['2026-09-23', 160000]),
    eventos: eventos(
      ['2026-04-30', '01', 'Primer reporte en Vigente, al día'],
      ['2026-08-31', '01', 'Primera cuota sin pagar: 8 días de mora'],
      ['2026-09-18', '01', 'Marcada en reclamo Habeas Data (Información incorrecta). Se sigue reportando'],
      ['2026-09-30', '01', '38 días desde la cuota más antigua sin pagar', '01'],
    ),
  }),
  obligacion({
    id: 7, numero: '2250-0987', titular: 'Hotel Mirador Cúcuta', concepto: 3588, estado: '03', saldo: 5420000, cuota: 270000,
    valor_inicial: 6480000, ingreso: '2025-06-30', caducado: true,
    vencidas: cuotas(['2026-04-27', 270000], ['2026-05-27', 270000], ['2026-06-27', 270000], ['2026-07-27', 270000], ['2026-08-27', 270000], ['2026-09-27', 270000]),
    eventos: eventos(
      ['2025-06-30', '01', 'Primer reporte en Vigente, al día'],
      ['2026-07-31', '03', 'Crédito caducado en el sistema comercial (4 cuotas atrasadas): pasa a Dudoso recaudo', '03'],
      ['2026-09-30', '03', '156 días desde la cuota más antigua sin pagar', '05'],
    ),
  }),
  obligacion({
    id: 8, numero: '2244-6410', titular: 'Transportes Catatumbo S.A.S.', concepto: 3801, estado: '06', saldo: 2980000, cuota: 190000,
    valor_inicial: 4560000, ingreso: '2025-01-31', caducado: true,
    vencidas: cuotas(
      ['2026-02-02', 190000], ['2026-03-02', 190000], ['2026-04-02', 190000], ['2026-05-02', 190000],
      ['2026-06-02', 190000], ['2026-07-02', 190000], ['2026-08-02', 190000], ['2026-09-02', 190000],
    ),
    eventos: eventos(
      ['2025-01-31', '01', 'Primer reporte en Vigente, al día'],
      ['2026-05-31', '03', 'Crédito caducado en el sistema comercial: pasa a Dudoso recaudo', '03'],
      ['2026-07-31', '06', 'CENS la castigó contablemente (marca de castigo del sistema comercial): pasa a Castigada', '05'],
      ['2026-09-30', '06', '240 días desde la cuota más antigua sin pagar', '08'],
    ),
  }),
  obligacion({
    id: 9, numero: '2241-3302', titular: 'Panadería El Trigal', concepto: 30, estado: '07', saldo: 0, cuota: 0, cuota_antes_cierre: 60000,
    valor_inicial: 1200000, ingreso: '2025-02-28',
    cierre: { fecha_corte: '2026-08-31', fecha_pago: '2026-08-20', modo_extincion: VOLUNTARIO, tipo_pago: VOLUNTARIO },
    eventos: eventos(
      ['2025-02-28', '01', 'Primer reporte en Vigente, al día'],
      ['2026-02-28', '03', 'Crédito caducado en el sistema comercial: pasa a Dudoso recaudo', '04'],
      ['2026-08-20', '07', 'Pago total estando en Dudoso recaudo: pasa a Castigada recuperada'],
      ['2026-08-31', '07', 'Se reportó como Castigada recuperada en el corte 31/08/2026. Desde septiembre ya no se reporta'],
    ),
  }),
  obligacion({
    id: 10, numero: '2263-9004', titular: 'Ferretería La Esquina', concepto: 3588, estado: '01', saldo: 1450000, cuota: 120000,
    valor_inicial: 1450000, ingreso: '2026-09-30', primer_reporte: true,
    eventos: eventos(['2026-09-30', '01', 'Ingresa en este corte: primer reporte en Vigente, al día']),
  }),
  obligacion({
    id: 11, numero: '2255-7788', titular: 'Inversiones Pamplona S.A.S.', concepto: 3801, estado: '02', saldo: 0, cuota: 0, cuota_antes_cierre: 230000,
    valor_inicial: 4600000, ingreso: '2025-08-31', refinanciada_en: { obligacion_id: 12, numero_obligacion: '2271-5502' },
    cierre: { fecha_corte: '2026-09-30', fecha_pago: '2026-09-28', modo_extincion: REFINANCIACION, tipo_pago: NO_VOLUNTARIO },
    eventos: eventos(
      ['2025-08-31', '01', 'Primer reporte en Vigente, al día'],
      ['2026-09-28', '02', 'Refinanciada: se cierra en Saldada con modo de extinción Refinanciación'],
    ),
  }),
  obligacion({
    id: 12, numero: '2271-5502', titular: 'Inversiones Pamplona S.A.S.', concepto: 3801, estado: '01', saldo: 4380000, cuota: 165000,
    valor_inicial: 4380000, ingreso: '2026-09-28', primer_reporte: true,
    reestructuracion: {
      numero_reestructuraciones: 1,
      naturaleza: { codigo: '07', descripcion: 'Otra', confirmado: false },
      obligacion_anterior: { obligacion_id: 11, numero_obligacion: '2255-7788' },
    },
    eventos: eventos(['2026-09-28', '01', 'Nueva obligación por la refinanciación de 2255-7788: primer reporte en Vigente, marcada como reestructurada']),
  }),
]

// Financiaciones que trae la extracción del corte en BORRADOR y que nunca se han reportado (RF10).
export const FINANCIACIONES_NUEVAS = [
  { numero_obligacion: '2265-2208', nombre_titular: 'Panadería La Espiga' },
  { numero_obligacion: '2266-7745', nombre_titular: 'Colegio San Rafael' },
  { numero_obligacion: '2267-3361', nombre_titular: 'Taller Mecánico Los Pinos' },
]

// Orden de los estados en las tarjetas (el del mockup: EST_ORDER).
const ORDEN_ESTADOS = ['01', '03', '06', '02', '07', '04', '08', '10', '11', '12']

const diasEntre = (desde, hasta) => Math.round((Date.parse(hasta) - Date.parse(desde)) / 86400000)
export const estadoTexto = (codigo) => descripcionEstado(codigo)

// Mora al corte: cuotas vencidas sin pagar, de la más antigua a la más reciente (RF7, RF17, RF19, RF49).
function moraAlCorte(o, corte = FECHA_ULTIMO_CICLO) {
  const pendientes = o.vencidas.filter((c) => c.valor > 0).sort((a, b) => a.fecha.localeCompare(b.fecha))
  const dias = pendientes.length ? Math.max(0, diasEntre(pendientes[0].fecha, corte)) : 0
  const edad = edadMoraDesdeDias(dias)
  return {
    pendientes,
    dias,
    edad,
    valor: pendientes.reduce((suma, c) => suma + c.valor, 0),
    exigibilidad: pendientes[0]?.fecha ?? null,
    anios: edad === '14' ? Math.floor(dias / 365) : null,
  }
}

// «Qué puede pasar con esta obligación», según su estado (modalObl del mockup).
function posiblesTransiciones(o) {
  const regla = (rf, texto, porConfirmar = false) => ({ rf, texto, por_confirmar: porConfirmar })
  if (o.eliminada) return [regla('RF50', 'Eliminada en TransUnion: no se vuelve a reportar y su número no se reutiliza')]
  if (esEstadoDeCierre(o.estado)) {
    const corte = formatearFechaISO(o.cierre?.fecha_corte ?? o.ingreso)
    return [regla(o.estado === '02' ? 'RF13' : 'RF16', `Se reporta una sola vez, en el corte en que cerró (${corte}), y después ya no`)]
  }
  if (o.estado === '01') {
    return [
      regla('RF12', `Pago total: pasa a ${estadoTexto('02')}`),
      regla('RF14', `Crédito caducado con mora: pasa a ${estadoTexto('03')}`, true),
      regla('RF45', `Castigo contable: pasa a ${estadoTexto('06')}`),
      regla('RF18', `Refinanciación: pasa a ${estadoTexto('02')}`),
    ]
  }
  // 04, 08, 10, 11 y 12: el mockup no les da reglas propias; el cambio lo deciden las reglas de TransUnion.
  if (o.estado !== '03' && o.estado !== '06') {
    return [regla('RF48', `Desde ${estadoTexto(o.estado)}, cada cambio de estado se revisa con las reglas de TransUnion`, true)]
  }
  return [
    regla('RF15', `Pago total: pasa a ${estadoTexto('07')}`),
    regla('RF46', `Normalización: pasa a ${estadoTexto('01')}`, true),
    o.estado === '03' ? regla('RF45', `Castigo contable: pasa a ${estadoTexto('06')}`) : regla('RF45', 'Sigue en Castigada mientras tenga mora'),
    regla('RF18', `Refinanciación: pasa a ${estadoTexto('07')}`),
  ]
}

// Identificación ficticia ya enmascarada, como la entrega el backend.
// Una obligación nacida de una refinanciación guarda la del titular original (`numero_identificacion`).
export const identificacion = (o) => o.numero_identificacion ?? `******${String(o.id).padStart(4, '0')}`

// `corte`: fecha del último ciclo ejecutado (la mora y los días se calculan a esa fecha).
export const aResumen = (o, corte = FECHA_ULTIMO_CICLO) => resumenConMora(o, moraAlCorte(o, corte))

// Con la mora ya calculada (aDetalle la reutiliza para no repetir el cálculo).
function resumenConMora(o, mora) {
  return {
    obligacion_id: o.id,
    numero_obligacion: o.numero,
    nombre_titular: o.titular,
    numero_identificacion: identificacion(o),
    estado_tu: o.estado,
    edad_mora: mora.edad,
    dias_mora: mora.dias,
    cuotas_mora: mora.pendientes.length,
    valor_mora: mora.valor,
    valor_saldo: o.saldo,
    cerrada: esEstadoDeCierre(o.estado),
    primer_reporte: o.primer_reporte,
    caducado: o.caducado,
    en_reclamo: o.en_reclamo,
    eliminada: o.eliminada,
    requiere_revision: o.requiere_revision,
  }
}

export function aDetalle(o, corte = FECHA_ULTIMO_CICLO) {
  const mora = moraAlCorte(o, corte)
  return {
    ...resumenConMora(o, mora),
    motivo_revision: o.motivo_revision,
    concepto: { codigo: o.concepto, descripcion: CONCEPTOS[o.concepto] ?? null },
    fecha_ingreso: o.ingreso,
    valor_inicial: o.valor_inicial,
    valor_cuota: o.cuota,
    valor_cuota_antes_cierre: o.cuota_antes_cierre,
    fecha_exigibilidad: mora.exigibilidad,
    anios_mora: mora.anios,
    atrasos_permitidos: o.atrasos_permitidos,
    cuotas_atrasadas: mora.pendientes.length,
    cierre: o.cierre,
    pago_mora: o.pago_mora,
    reestructuracion: o.reestructuracion,
    refinanciada_en: o.refinanciada_en,
    movimiento_posterior_cierre: o.movimiento_posterior_cierre,
    cuotas_vencidas: mora.pendientes.map((c) => ({ fecha_vencimiento: c.fecha, valor_pendiente: c.valor, dias: diasEntre(c.fecha, corte) })),
    pagos: o.pagos,
    posibles_transiciones: posiblesTransiciones(o),
    advertencias: o.advertencias,
  }
}

// Del más reciente al más antiguo.
export const lineaTiempo = (o) =>
  [...o.eventos].reverse().map((e) => ({ fecha: e.fecha, estado_tu: e.estado, edad_mora: e.edad, descripcion: e.texto }))

// Tarjetas de la pantalla 9 y del panel (RF19). `por_cuotas_mora` cuenta solo las abiertas y suma `abiertas`.
export function resumenCartera(obligaciones, corte = FECHA_ULTIMO_CICLO) {
  const vivas = obligaciones.filter((o) => !o.eliminada)
  const abiertas = vivas.filter((o) => !esEstadoDeCierre(o.estado)).map((o) => aResumen(o, corte))
  const contar = (filtro) => abiertas.filter(filtro).length
  return {
    fecha_ultimo_ciclo: corte,
    total: vivas.length,
    abiertas: abiertas.length,
    por_estado: ORDEN_ESTADOS.map((estado_tu) => ({ estado_tu, cantidad: vivas.filter((o) => o.estado === estado_tu).length })).filter((c) => c.cantidad > 0),
    eliminadas: obligaciones.length - vivas.length,
    por_cuotas_mora: {
      al_dia: contar((o) => o.cuotas_mora === 0),
      una: contar((o) => o.cuotas_mora === 1),
      dos_a_tres: contar((o) => o.cuotas_mora >= 2 && o.cuotas_mora <= 3),
      cuatro_o_mas: contar((o) => o.cuotas_mora >= 4),
    },
    // Las que ya entraron con un ciclo dejan de ser nuevas.
    financiaciones_nuevas: FINANCIACIONES_NUEVAS.filter((f) => !obligaciones.some((o) => o.numero === f.numero_obligacion)),
  }
}
