// Refinanciaciones registradas (pantalla 11, RF18) al inicio del mock. Datos FICTICIOS del mockup v3.
import { REFINANCIACION } from './obligacionesIteracion2'

// Refinanciación de respaldo del mockup: 2255-7788 → 2271-5502 (ver mocks/datos/obligacionesIteracion2.js).
export const refinanciacionesIniciales = () => [
  {
    id: 1,
    fecha: '2026-09-28',
    fecha_registro: '2026-09-28T15:20:00-05:00',
    registrada_por: 'Juan Pérez',
    origen: 'MANUAL',
    obligacion_original: { obligacion_id: 11, numero_obligacion: '2255-7788', nombre_titular: 'Inversiones Pamplona S.A.S.', estado_cierre: '02', modo_extincion: REFINANCIACION },
    obligacion_nueva: { obligacion_id: 12, numero_obligacion: '2271-5502', estado_tu: '01', numero_reestructuraciones: 1 },
    saldo_refinanciado: 4380000,
    naturaleza: { codigo: '07', descripcion: 'Otra', confirmado: false },
    numero_cuotas: 36,
  },
]
