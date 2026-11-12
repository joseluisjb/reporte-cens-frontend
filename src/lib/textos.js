// Textos legibles para valores internos que no deben verse tal cual en pantalla.

const ESTADOS_CORTE = {
  BORRADOR: 'Borrador',
  VALIDADO: 'Validado',
  ENVIADO: 'Enviado',
  ENVIADO_CON_INCONSISTENCIAS: 'Enviado con inconsistencias',
}

// «ALGO_COMO_ESTO» → «Algo como esto».
export function humanizar(clave) {
  const texto = String(clave ?? '').replace(/_/g, ' ').trim().toLowerCase()
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

export function estadoCorteTexto(estado) {
  if (!estado) return ''
  return Object.hasOwn(ESTADOS_CORTE, estado) ? ESTADOS_CORTE[estado] : humanizar(estado)
}

const CAMPOS = {
  fecha_pago: 'Fecha de pago',
  modo_extincion: 'Modo de extinción',
  estado_tu: 'Estado en TransUnion',
  numero_obligacion: 'Número de obligación',
  valor_mora: 'Valor en mora',
  edad_mora: 'Edad de mora',
  fecha_limite_pago: 'Fecha límite de pago',
  cuotas_mora: 'Cuotas en mora',
  tipo_pago: 'Tipo de pago',
  identificacion: 'Identificación',
  tipo_identificacion: 'Tipo de identificación',
  saldo: 'Saldo',
  valor_inicial: 'Valor inicial',
  fecha_apertura: 'Fecha de apertura',
  fecha_vencimiento: 'Fecha de vencimiento',
  naturaleza_reestructuracion: 'Naturaleza de la reestructuración',
  numero_cuotas: 'Número de cuotas',
  valor_cuota: 'Valor de la cuota',
  nombre_titular: 'Nombre del titular',
  valor_real_pagado: 'Valor real pagado',
}

export function campoTexto(campo) {
  if (!campo) return ''
  return Object.hasOwn(CAMPOS, campo) ? CAMPOS[campo] : humanizar(campo)
}

const REGLAS = {
  SIN_FECHA_LIMITE_PAGO: 'Sin fecha límite de pago',
  CUOTAS_MORA_SIN_EDAD: 'Cuotas en mora sin edad de mora',
  SALDADA_CON_MORA: 'Saldada con mora',
  EDAD_SIN_VALOR_MORA: 'Edad de mora sin valor en mora',
  SIN_IDENTIFICACION: 'Falta la identificación',
  CAMBIO_ESTADO_INVALIDO: 'Cambios de estado permitidos',
  PRIMER_REPORTE: 'Primer reporte',
  CAMBIOS_RECHAZADOS: 'Cambios de estado y primer reporte',
  ENTIDAD_CON_MARCADOR: 'Datos de la entidad',
}

export function reglaTexto(regla) {
  if (!regla) return ''
  return Object.hasOwn(REGLAS, regla) ? REGLAS[regla] : humanizar(regla)
}
