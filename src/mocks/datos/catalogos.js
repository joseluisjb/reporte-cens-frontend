// Catálogos del Manual Sector Real v34 de TransUnion para `GET /catalogos/{nombre}/` (script 10 de la BD).
// `confirmado: false` = pendiente de CENS o TransUnion: la pantalla lo marca «por confirmar».
//   - naturalezas-reestructuracion (Tabla 11): los códigos son del Manual, pero cuál usará CENS
//     está por definir, por eso ninguno está confirmado.
//   - tipologias-reclamo: los códigos son ilustrativos (Ley 1266 y lista de TransUnion por confirmar).
const item = (codigo, descripcion, confirmado = true) => ({ codigo, descripcion, confirmado })

export const CATALOGOS = {
  // Tabla 10: modo de extinción.
  'modos-extincion': [
    item('01', 'Voluntario'),
    item('02', 'Proceso ejecutivo'),
    item('03', 'Mandatoria de pago'),
    item('04', 'Proceso ejecutivo con excepción'),
    item('05', 'Prescripción'),
    item('07', 'Dación en pago'),
    item('11', 'Novación'),
    item('12', 'Transacción'),
    item('13', 'Compensación'),
    item('14', 'Confusión'),
    item('15', 'Remisión'),
    item('16', 'Refinanciación'),
    item('17', 'Dada en cesión'),
  ],
  // Tabla 31: tipo de pago.
  'tipos-pago': [item('01', 'Voluntario'), item('02', 'No voluntario')],
  // Tabla 11: naturaleza de la reestructuración.
  'naturalezas-reestructuracion': [
    item('01', 'Ley 550', false),
    item('02', 'Concordato', false),
    item('03', 'Ley 617', false),
    item('04', 'Acuerdo acreedores o privado', false),
    item('05', 'Extraordinaria', false),
    item('06', 'Ordinaria', false),
    item('07', 'Otra', false),
    item('08', 'Ley 1116', false),
    item('09', 'Ley 546', false),
  ],
  // Tabla 28: justificación de la acción (eliminación).
  'motivos-eliminacion': [
    item('01', 'Por tutela'),
    item('05', 'No autorizado'),
    item('10', 'Por orden judicial'),
    item('13', 'Por venta de cartera'),
    item('14', 'Por error entidad'),
    item('15', 'Fraude'),
  ],
  'tipologias-reclamo': [
    item('01', 'Información incorrecta', false),
    item('02', 'Pago no reflejado', false),
    item('03', 'Titular no reconoce la obligación', false),
    item('04', 'Suplantación de identidad', false),
  ],
}
