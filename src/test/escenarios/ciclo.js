// Escenarios de la actualización mensual (pantalla 10) para las pruebas. Los que cambian la base del
// mock se llaman antes de renderizar; los de MSW devuelven handlers para `server.use(...)`. Todo lo que
// devuelven cumple el contrato 0.9 (se comprueba en contrato.test.js).
import { http, HttpResponse } from 'msw'
import { API_URL } from '../../lib/config'
import { db } from '../../mocks/db'

// El corte 2026-09-30 ya se envió y la extracción del 2026-10-31 está en BORRADOR: el ciclo de
// octubre se puede ejecutar (flujo extracción → ciclo).
export function corteDeOctubreEnBorrador() {
  db.cortes = db.cortes.map((c) => (c.id === 2 ? { ...c, estado: 'ENVIADO', fecha_envio: '2026-10-03' } : c))
  db.cortes.push({
    id: 3, fecha_corte: '2026-10-31', fecha_ejecucion: '2026-11-01T08:00:00-05:00', grupo_id: 2, grupo_nombre: 'Solo cuota de energía',
    estado: 'BORRADOR', fecha_envio: null, ejecutada_por: 'Juan Pérez', observacion: null,
  })
  db.siguienteCorteId = 4
}

const regla = (rf, texto, porConfirmar = false) => ({ rf, texto, por_confirmar: porConfirmar })

// Resultado del ciclo de octubre con los casos de «Listo cuando» que la foto del mockup no trae:
//   - RF10: una nueva calculada en 07 se rechaza con el 881; una nueva caducada SIN mora entra en 01
//     y queda para revisión;
//   - RF11: un salto de 00 a 03 y una baja de 02 a 00 sin abono quedan para revisión;
//   - un cambio que la matriz no permite se rechaza con el 713.
export function cicloConRechazosYRevisiones() {
  const cuerpo = {
    corte_id: 3,
    fecha_corte: '2026-10-31',
    fecha_ejecucion: '2026-11-03T09:15:00-05:00',
    ejecutada_por: 'Juan Pérez',
    primer_reporte: 2,
    cambios_estado: 0,
    cierres: 0,
    rechazados: 2,
    con_pagos: 0,
    a_dudoso: 0,
    a_castigada: 0,
    normalizadas: 0,
    transiciones: [
      {
        obligacion_id: 16, numero_obligacion: '2268-1100', nombre_titular: 'Papelería El Cuaderno', estado_anterior: null, estado_nuevo: '01',
        edad_anterior: null, edad_nueva: '00', primer_reporte: true, requiere_revision: true,
        reglas: [regla('RF10', 'Entra con su estado y su mora reales'), regla('RF14', 'Crédito caducado en el sistema comercial sin mora: entra en Vigente y queda para revisión', true)],
      },
      {
        obligacion_id: 1, numero_obligacion: '2257-4156', nombre_titular: 'Carlos Andrés Rueda', estado_anterior: '01', estado_nuevo: '01',
        edad_anterior: '00', edad_nueva: '03', primer_reporte: false, requiere_revision: true,
        reglas: [regla('RF11', 'La edad saltó de 00 a 03 en un solo corte: revisar las fechas de las facturas')],
      },
      {
        obligacion_id: 4, numero_obligacion: '2260-5543', nombre_titular: 'Diana Patricia Niño', estado_anterior: '01', estado_nuevo: '01',
        edad_anterior: '02', edad_nueva: '00', primer_reporte: false, requiere_revision: true,
        reglas: [regla('RF11', 'La edad bajó de 02 a 00 sin un abono en el periodo')],
      },
    ],
    rechazos: [
      {
        obligacion_id: 15, numero_obligacion: '2267-3361', nombre_titular: 'Taller Mecánico Los Pinos', estado_anterior: null, estado_calculado: '07',
        codigo: '881', motivo: 'TransUnion no acepta ese estado en el primer reporte',
      },
      {
        obligacion_id: 3, numero_obligacion: '2259-1092', nombre_titular: 'Jorge Iván Salcedo', estado_anterior: '02', estado_calculado: '03',
        codigo: '713', motivo: 'TransUnion no acepta pasar de Saldada a Dudoso recaudo',
      },
    ],
  }
  return [http.post(`${API_URL}/ciclos/`, () => HttpResponse.json(cuerpo, { status: 201 }))]
}
