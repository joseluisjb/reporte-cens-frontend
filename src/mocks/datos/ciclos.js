// Actualizaciones mensuales (pantalla 10, RF10–RF17, RF19, RF45–RF49) del backend simulado.
//
// El frontend no calcula el ciclo (ni copia el `applyCycle` del mockup): el resultado del corte
// 2026-10-31 se calculó UNA VEZ con el `applyCycle` del mockup v3 sobre las 12 obligaciones al
// 2026-09-30 y quedó congelado aquí (decisión 3 del plan). Otros cortes no tienen foto: el mock
// responde un ciclo sin cambios. Los casos de «Listo cuando» (rechazos 713 y 881, revisión RF11…)
// se prueban con escenarios de MSW en src/test/escenarios/ciclo.js.
//
// Nombres, números y valores son FICTICIOS (los del mockup).
import { cuotas, eventos, FECHA_ULTIMO_CICLO, obligacion, VOLUNTARIO } from './obligacionesIteracion2'

const regla = (rf, texto, porConfirmar = false) => ({ rf, texto, por_confirmar: porConfirmar })
const transicion = (id, numero, titular, anterior, nuevo, edadAnterior, edadNueva, reglas) => ({
  obligacion_id: id,
  numero_obligacion: numero,
  nombre_titular: titular,
  estado_anterior: anterior,
  estado_nuevo: nuevo,
  edad_anterior: edadAnterior,
  edad_nueva: edadNueva,
  primer_reporte: anterior === null,
  requiere_revision: false,
  reglas,
})
const ENTRA = regla('RF10', 'Entra con su estado y su mora reales')

// Ciclo ya ejecutado del corte 2026-09-30 (corte 2, en BORRADOR): el historial inicial.
export const cicloInicial = () => ({
  corte_id: 2,
  fecha_corte: FECHA_ULTIMO_CICLO,
  fecha_ejecucion: '2026-09-30T10:02:00-05:00',
  ejecutada_por: 'Juan Pérez',
  primer_reporte: 2,
  cambios_estado: 2,
  cierres: 2,
  rechazados: 0,
  con_pagos: 1,
  a_dudoso: 0,
  a_castigada: 0,
  normalizadas: 0,
  transiciones: [
    transicion(10, '2263-9004', 'Ferretería La Esquina', null, '01', null, '00', [ENTRA]),
    transicion(12, '2271-5502', 'Inversiones Pamplona S.A.S.', null, '01', null, '00', [
      ENTRA,
      regla('RF18', 'Nueva obligación por la refinanciación de 2255-7788, marcada como reestructurada'),
    ]),
    transicion(2, '2258-7731', 'María Fernanda Ortiz', '01', '01', '00', '01', [
      regla('RF11', '47 días desde la cuota más antigua sin pagar (14/08/2026): edad 00 → 01'),
    ]),
    transicion(4, '2260-5543', 'Diana Patricia Niño', '01', '01', '02', '03', [
      regla('RF11', '112 días desde la cuota más antigua sin pagar (10/06/2026): edad 02 → 03'),
    ]),
    transicion(3, '2259-1092', 'Jorge Iván Salcedo', '01', '02', '00', '00', [
      regla('RF12', 'Pago total: Saldada · fecha de pago 12/09/2026, modo 01, tipo de pago 01'),
    ]),
    transicion(11, '2255-7788', 'Inversiones Pamplona S.A.S.', '01', '02', '00', '00', [
      regla('RF18', 'Refinanciada en 2271-5502: se cierra en Saldada con modo de extinción 16 Refinanciación'),
    ]),
  ],
  rechazos: [],
})

export const FECHA_CICLO_CON_FOTO = '2026-10-31'

// ── Foto del ciclo del corte 2026-10-31 (applyCycle del mockup v3) ──

// Financiaciones nuevas que entran en primer reporte (ids 13 a 15, como los ejemplos del contrato).
const NUEVAS = [
  obligacion({
    id: 13, numero: '2265-2208', titular: 'Panadería La Espiga', concepto: 30, estado: '01', saldo: 612000, cuota: 51000,
    valor_inicial: 612000, ingreso: '2026-10-31', primer_reporte: true,
    eventos: eventos(['2026-10-31', '01', 'Primer reporte en Vigente (01), al día']),
  }),
  obligacion({
    id: 14, numero: '2266-7745', titular: 'Colegio San Rafael', concepto: 3839, estado: '01', saldo: 2210000, cuota: 184000,
    valor_inicial: 2210000, ingreso: '2026-10-31', primer_reporte: true, atrasos_permitidos: 6,
    vencidas: cuotas(['2026-09-05', 184000], ['2026-10-05', 184000]),
    eventos: eventos(['2026-10-31', '01', 'Primer reporte en Vigente (01) con 56 días de mora', '01']),
  }),
  obligacion({
    id: 15, numero: '2267-3361', titular: 'Taller Mecánico Los Pinos', concepto: 3588, estado: '03', saldo: 934000, cuota: 78000,
    valor_inicial: 934000, ingreso: '2026-10-31', primer_reporte: true, caducado: true,
    vencidas: cuotas(['2026-07-10', 78000], ['2026-08-10', 78000], ['2026-09-10', 78000], ['2026-10-10', 78000]),
    eventos: eventos(['2026-10-31', '03', 'Primer reporte en Dudoso Recaudo (03) con 113 días de mora (crédito caducado en el SAC)', '03']),
  }),
]

const PAGO_MORA = (fecha_pago, valor) => ({ fecha_pago, modo_extincion: VOLUNTARIO, tipo_pago: VOLUNTARIO, valor_real_pagado: valor })
const pago = (valor, aplicado_a, nota) => ({ fecha_corte: '2026-10-31', valor, aplicado_a, nota })

// Lo que cambia en cada obligación existente (por número). `vencidas` son las que quedan sin pagar;
// `pagos` y `eventos` se agregan a los que ya tenía.
const CAMBIOS = {
  '2257-4156': {
    saldo: 1080016, vencidas: [], pago_mora: PAGO_MORA('2026-10-20', 196000),
    pagos: [pago(196000, 'cuota del 07/09/2026, cuota del 07/10/2026', 'Pagó las dos cuotas pendientes')],
    eventos: [['2026-10-31', '01', 'Pagó las dos cuotas pendientes y quedó al día: se reportan fecha de pago, modo de extinción y tipo de pago (RF47)']],
  },
  '2258-7731': {
    saldo: 792300, vencidas: [['2026-08-14', 20000], ['2026-09-14', 70000], ['2026-10-14', 70000]],
    pagos: [pago(50000, 'parte de la cuota del 14/08/2026', 'Abono parcial')],
    eventos: [['2026-10-31', '01', 'Abono parcial de $50.000. 78 días desde la cuota más antigua sin pagar: edad 01 → 02. Su crédito caduca a las 4 cuotas (lleva 3)', '02']],
  },
  '2260-5543': {
    vencidas: [['2026-06-10', 215000], ['2026-07-10', 215000], ['2026-08-10', 215000], ['2026-09-10', 215000], ['2026-10-10', 215000]],
    eventos: [['2026-10-31', '01', '143 días desde la cuota más antigua sin pagar: edad 03 → 04. Su crédito caduca a las 6 cuotas (lleva 5)', '04']],
  },
  '2261-8820': {
    estado: '02', saldo: 0, cuota: 0, cuota_antes_cierre: 41000, vencidas: [],
    cierre: { fecha_corte: '2026-10-31', fecha_pago: '2026-10-20', modo_extincion: VOLUNTARIO, tipo_pago: VOLUNTARIO },
    pagos: [pago(498700, 'cuota del 15/09/2026, cuota del 15/10/2026', 'Pagó todo el saldo')],
    eventos: [['2026-10-31', '02', 'Pago total: pasa a Saldada (02). Se reporta en este corte, una sola vez']],
  },
  '2262-3318': {
    saldo: 1744120, vencidas: [['2026-09-23', 160000], ['2026-10-23', 160000]],
    pagos: [pago(160000, 'cuota del 23/08/2026', 'Pagó una cuota')],
    eventos: [['2026-10-31', '01', 'Pagó la cuota del 23/08/2026', '01']],
  },
  '2250-0987': {
    estado: '06',
    vencidas: [['2026-04-27', 270000], ['2026-05-27', 270000], ['2026-06-27', 270000], ['2026-07-27', 270000], ['2026-08-27', 270000], ['2026-09-27', 270000], ['2026-10-27', 270000]],
    eventos: [['2026-10-31', '06', 'CENS la castigó contablemente: pasa a Castigada (06). 187 días: edad 05 → 06', '06']],
  },
  '2244-6410': {
    estado: '01', saldo: 1270000, caducado: false, vencidas: [], pago_mora: PAGO_MORA('2026-10-20', 1710000),
    pagos: [pago(1710000, 'cuotas del 02/02/2026 al 02/10/2026', 'Pagó toda la mora sin cancelar el saldo')],
    eventos: [['2026-10-31', '01', 'Pagó toda la mora sin cancelar el saldo: vuelve a Vigente (01). Edad 08 → 00']],
  },
  '2263-9004': { saldo: 1330000, pagos: [pago(120000, 'cuota del 15/10/2026', 'Pagó la cuota del mes')] },
  '2271-5502': { saldo: 4215000, pagos: [pago(165000, 'cuota del 15/10/2026', 'Pagó la cuota del mes')] },
}

// Las obligaciones después del ciclo del 2026-10-31, a partir de las del 2026-09-30.
export function obligacionesTrasCiclo(obligaciones) {
  const actualizadas = obligaciones.map((o) => {
    const c = CAMBIOS[o.numero]
    if (!c) return o
    const { vencidas, pagos = [], eventos: nuevos = [], ...resto } = c
    return {
      ...o,
      ...resto,
      ...(vencidas && { vencidas: cuotas(...vencidas) }),
      pagos: [...o.pagos, ...pagos],
      eventos: [...o.eventos, ...eventos(...nuevos)],
    }
  })
  const yaEstan = new Set(obligaciones.map((o) => o.numero))
  return [...actualizadas, ...NUEVAS.filter((n) => !yaEstan.has(n.numero)).map((n) => ({ ...n }))]
}

// Resultado (CicloDetalle sin corte, fecha ni usuario, que pone la ruta).
// `con_pagos` cuenta las 7 obligaciones con pagos del SAC en CAMBIOS (el mockup no contaba la cuota del
// mes de las que estaban al día) y `normalizadas` solo la que volvió a 01 por RF46 (2244-6410), como
// define el contrato.
export const resultadoCiclo2026_10_31 = () => ({
  primer_reporte: 3,
  cambios_estado: 3,
  cierres: 1,
  rechazados: 0,
  con_pagos: 7,
  a_dudoso: 0,
  a_castigada: 1,
  normalizadas: 1,
  transiciones: [
    transicion(13, '2265-2208', 'Panadería La Espiga', null, '01', null, '00', [ENTRA]),
    transicion(14, '2266-7745', 'Colegio San Rafael', null, '01', null, '01', [ENTRA]),
    // El paso de caducado a Dudoso recaudo espera la confirmación de CENS (C-53).
    transicion(15, '2267-3361', 'Taller Mecánico Los Pinos', null, '03', null, '03', [
      regla('RF10', 'Entra con su estado y su mora reales · caducado en el SAC'),
      regla('RF14', 'Crédito caducado en el SAC con 4 cuotas en mora: Dudoso Recaudo', true),
    ]),
    transicion(1, '2257-4156', 'Carlos Andrés Rueda', '01', '01', '00', '00', [
      regla('RF17', 'Pago de $196.000 aplicado a: cuota del 07/09/2026, cuota del 07/10/2026', true),
      regla('RF47', 'Quedó al día: se reportan fecha de pago, modo de extinción y tipo de pago'),
    ]),
    transicion(2, '2258-7731', 'María Fernanda Ortiz', '01', '01', '01', '02', [
      regla('RF17', 'Pago de $50.000 aplicado a: parte de la cuota del 14/08/2026', true),
      regla('RF11', '78 días desde la cuota más antigua sin pagar (14/08/2026): edad 01 → 02'),
      regla('RF14', 'Sigue en Vigente: su crédito caduca a las 4 cuotas (lleva 3)'),
    ]),
    transicion(4, '2260-5543', 'Diana Patricia Niño', '01', '01', '03', '04', [
      regla('RF11', '143 días desde la cuota más antigua sin pagar (10/06/2026): edad 03 → 04'),
      regla('RF14', 'Sigue en Vigente: su crédito caduca a las 6 cuotas (lleva 5)'),
    ]),
    transicion(5, '2261-8820', 'Luis Fernando Cáceres', '01', '02', '00', '00', [
      regla('RF12', 'Pago total: Saldada · fecha de pago 20/10/2026, modo 01, tipo de pago 01'),
    ]),
    transicion(6, '2262-3318', 'Centro Educativo Las Palmas', '01', '01', '01', '01', [
      regla('RF17', 'Pago de $160.000 aplicado a: cuota del 23/08/2026', true),
    ]),
    transicion(7, '2250-0987', 'Hotel Mirador Cúcuta', '03', '06', '05', '06', [
      regla('RF45', 'CENS la castigó contablemente: Castigada'),
      regla('RF11', '187 días desde la cuota más antigua sin pagar (27/04/2026): edad 05 → 06'),
    ]),
    transicion(8, '2244-6410', 'Transportes Catatumbo S.A.S.', '06', '01', '08', '00', [
      regla('RF17', 'Pago de $1.710.000 aplicado a las cuotas del 02/02/2026 al 02/10/2026', true),
      regla('RF46', 'Pagó la mora sin cancelar el saldo: vuelve a Vigente', true),
      regla('RF47', 'Quedó al día: se reportan fecha de pago, modo de extinción y tipo de pago'),
      regla('RF11', '0 días desde la cuota más antigua sin pagar: edad 08 → 00'),
    ]),
  ],
  rechazos: [],
})

// Ciclo de un corte sin foto: el mock no recalcula, así que no hay cambios.
export const resultadoSinCambios = () => ({
  primer_reporte: 0,
  cambios_estado: 0,
  cierres: 0,
  rechazados: 0,
  con_pagos: 0,
  a_dudoso: 0,
  a_castigada: 0,
  normalizadas: 0,
  transiciones: [],
  rechazos: [],
})
