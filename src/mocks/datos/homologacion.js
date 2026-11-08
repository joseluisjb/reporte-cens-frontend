// Catálogo de estados de TransUnion y homologación del SAC (RF48, pantalla 16) del backend simulado.
//
// Estados: los 10 de la Tabla 4b del Manual (Sector Real Servicios, p. 64) con su uso en CENS, según la
// ficha RF48 (docs/iteracion2/RF_ITERACION2.md): 01, 02, 03, 06 y 07 se usan; 08 no se usa (Acta 3); 04,
// propuesta: no se usa; 10, 11 y 12 se usan cuando el cliente esté admitido en el proceso de ley (fuente
// del dato por confirmar). `confirmado` es false en lo que la ficha deja entre corchetes y en 03, como en el
// mockup v3 (`estUso`).
//
// Homologación: la carga inicial del script de la base (NV_HOMOLOGA_ESTADO, tipo de cartera 2, sección 3.5),
// con su prioridad y su descripción. Todas sin confirmar con CENS; B y D sin homologar. La base guarda F
// con ESTADO_TU '02' (no tiene columna de acción): el contrato la expone como `accion: CIERRE` (RF12, RF15).
import { ESTADOS_DE_CIERRE, ESTADOS_OBLIGACION } from '../../features/transunion/catalogosTU'

const USO = {
  '01': { usado: true, confirmado: true },
  '02': { usado: true, confirmado: true },
  '03': { usado: true, confirmado: false },
  '04': { usado: false, confirmado: false },
  '06': { usado: true, confirmado: true },
  '07': { usado: true, confirmado: true },
  '08': { usado: false, confirmado: true },
  '10': { usado: true, confirmado: false },
  '11': { usado: true, confirmado: false },
  '12': { usado: true, confirmado: false },
}

// EstadoCatalogoTU[] (contrato 0.9), por código. Es fijo: se arma una vez. Se ordena a mano: en un objeto,
// '10', '11' y '12' (claves de tipo entero) van antes que '01'.
export const ESTADOS_CATALOGO = Object.freeze(
  Object.entries(ESTADOS_OBLIGACION)
    .toSorted(([a], [b]) => a.localeCompare(b))
    .map(([codigo, nombre]) => ({
    codigo,
    nombre,
    usado: USO[codigo].usado,
    es_cierre: ESTADOS_DE_CIERRE.includes(codigo),
    confirmado: USO[codigo].confirmado,
  })),
)

const homologacion = (estado_sac, prioridad, descripcion, accion, estado_tu) => ({
  estado_sac,
  prioridad,
  descripcion,
  accion,
  estado_tu,
  confirmado: false,
  actualizado_por: null,
  fecha_actualizacion: null,
})

// HomologacionEstado[] (contrato 0.9.1), por prioridad.
export const homologacionesIniciales = () => [
  homologacion('A', 1, 'Activo (propuesto)', 'ESTADO', '01'),
  homologacion('C', 2, 'Caducado (propuesto)', 'ESTADO', '03'),
  homologacion('D', 3, 'Desconocido: preguntar a CENS', null, null),
  homologacion('B', 4, 'Desconocido: preguntar a CENS', null, null),
  homologacion('F', 5, 'Finalizado (propuesto)', 'CIERRE', null),
]
