// Resultados del cargue de TransUnion (pantalla 12, RF54) del backend simulado.
//
// Reconoce cada archivo de respuesta por el nombre que le da TransUnion (Manual, p. 43), lee el detalle de
// inconsistencias (pp. 52-53) y el de no reportados (pp. 53-54) y arma `ResultadosCargue` (contrato 0.9).
// Lo que el Manual no fija queda sin validar y por confirmar con TransUnion:
//  - el total de campos del detalle: la tabla salta el campo 7, así que se exige un mínimo (los 6 de
//    identificación, el registro tipo 2 y un grupo de código, descripción y tipo);
//  - la estructura de los estadísticos: solo se cuentan sus filas;
//  - el CODIGOPRODUCTO de `est.` y `norep.`: se acepta cualquiera.
// Los radicados y cierres de reclamos (RF23) son de la pantalla 13 y no se reconocen aquí.
import { formatearFechaISO } from '../../lib/format'

// La p. 43 escribe CSR, pero en la Tabla 22 (p. 75) CSR es «cartera préstamos» y la sigla de «cartera
// servicios» es SSR: se aceptan las dos mientras TransUnion confirma cuál usa para Servicios.
const PAQUETE = '(?:CSR|SSR)'
const ENTIDAD = '([0-9A-Z]{3})_([0-9A-Z]{3})'
const FECHA = '(\\d{4})(\\d{2})(\\d{2})'
// [patrón del nombre, tipo_archivo]. Los grupos 3 a 5 (o 1 a 3 en `est.` y `norep.`) son la fecha de corte.
const PATRONES = [
  [new RegExp(`^Esta_Inco_${PAQUETE}_${ENTIDAD}_(?:Correctivas|Alertas)_${FECHA}\\.txt$`), 'ESTADISTICOS'],
  [new RegExp(`^est\\.[0-9A-Z]{3}\\.[0-9A-Z]{3}\\.[^.]+\\.${FECHA}\\.\\.?txt$`), 'ESTADISTICOS'], // el Manual lo escribe con «..txt»
  [new RegExp(`^Detalle_Inco_${PAQUETE}_${ENTIDAD}_Correctivas_${FECHA}\\.txt$`), 'CORRECTIVAS'],
  [new RegExp(`^Detalle_Inco_${PAQUETE}_${ENTIDAD}_Alertas_${FECHA}\\.txt$`), 'ALERTAS'],
  [new RegExp(`^Detalle_Inco_${PAQUETE}_${ENTIDAD}_Especiales_${FECHA}\\.txt$`), 'ESPECIALES'],
  [new RegExp(`^953_Detalle_Inco_${PAQUETE}_${ENTIDAD}_Alertas_${FECHA}\\.txt$`), 'DETALLE_953'],
  [new RegExp(`^norep\\.[0-9A-Z]{3}\\.[0-9A-Z]{3}\\.[^.]+\\.${FECHA}\\.0\\.txt$`), 'NOREP'],
]
// Las correctivas no ingresan a TransUnion; las alertas (y sus detalles Especiales y 953) sí (Manual, p. 42).
const TIPO_INCONSISTENCIA = { CORRECTIVAS: 'CORRECTIVA', ALERTAS: 'INFORMATIVA', ESPECIALES: 'INFORMATIVA', DETALLE_953: 'INFORMATIVA' }
const CAMPOS_IDENTIFICACION = 6 // número de línea, tipo y número de identificación, estado, nombre y edad de mora
const GRUPOS_MAXIMOS = 5 // hasta cinco inconsistencias por línea
// R es la convención de TransUnion para las no reportadas (p. 41); el texto sale de la p. 43.
const NO_REPORTADA = { codigo: 'R', descripcion: 'Obligación no reportada' }

export class ArchivoRechazado extends Error {
  constructor(detail, code) {
    super(detail)
    this.cuerpo = { detail, code }
  }
}
const deOtroCorte = (nombre, fecha, fechaCorte) =>
  new ArchivoRechazado(`El archivo ${nombre} es del corte ${formatearFechaISO(fecha)}, no del ${formatearFechaISO(fechaCorte)}.`, 'archivo_de_otro_corte')
const sinEstructura = (nombre, motivo) => new ArchivoRechazado(`El archivo ${nombre} no tiene la estructura esperada (${motivo}).`, 'estructura_invalida')

function reconocer(nombre) {
  for (const [patron, tipo] of PATRONES) {
    const m = patron.exec(nombre)
    if (m) {
      const [anio, mes, dia] = m.slice(-3)
      return { tipo, fecha: `${anio}-${mes}-${dia}` }
    }
  }
  return null
}

// Filas con datos: el archivo va delimitado por pipes y la primera línea trae los títulos de los campos.
// `numero` es la línea en el archivo (contando las vacías), para que el motivo de un 422 apunte a la real.
function filasDe(nombre, texto) {
  const lineas = texto
    .split(/\r?\n/)
    .map((linea, i) => ({ numero: i + 1, linea }))
    .filter(({ linea }) => linea.trim() !== '')
  if (!lineas.length) throw sinEstructura(nombre, 'está vacío')
  const sinPipes = lineas.find(({ linea }) => !linea.includes('|'))
  if (sinPipes) throw sinEstructura(nombre, `línea ${sinPipes.numero}: no está delimitada por |`)
  return lineas.slice(1).map(({ numero, linea }) => ({ numero, campos: linea.split('|') }))
}

// Detalle de inconsistencias: después de los campos de identificación viene el registro tipo 2 que envió la
// entidad, seguido de grupos de código, descripción y tipo. En el registro tipo 2 (Manual, Tabla 2, p. 46)
// el tipo de registro es la posición 1 y el número de la obligación, el campo 7: posiciones 89 a 108.
const INICIO_NUMERO_OBLIGACION = 88
const FIN_NUMERO_OBLIGACION = 108
function inconsistenciasDelDetalle(nombre, filas, tipo) {
  return filas.flatMap(({ numero, campos }) => {
    const r2 = campos.findIndex((c, i) => i >= CAMPOS_IDENTIFICACION && c.startsWith('2') && c.length >= FIN_NUMERO_OBLIGACION)
    if (r2 === -1 || campos.length < r2 + 4) {
      throw sinEstructura(nombre, `línea ${numero}: no trae el registro tipo 2 con el código, la descripción y el tipo de la inconsistencia`)
    }
    const numeroObligacion = campos[r2].slice(INICIO_NUMERO_OBLIGACION, FIN_NUMERO_OBLIGACION).trim()
    const grupos = []
    for (let g = 0; g < GRUPOS_MAXIMOS; g++) {
      const codigo = campos[r2 + 1 + g * 3]?.trim()
      if (!codigo) break
      grupos.push({ numero_obligacion: numeroObligacion, tipo, codigo, descripcion: (campos[r2 + 2 + g * 3] ?? '').trim() })
    }
    return grupos
  })
}

// No reportados: el número de obligación es el tercer campo (tipo y número de identificación antes).
function noReportadas(nombre, filas) {
  return filas.map(({ numero, campos }) => {
    if (campos.length < 3 || !campos[2].trim()) throw sinEstructura(nombre, `línea ${numero}: no trae el número de obligación en el tercer campo`)
    return { numero_obligacion: campos[2].trim(), tipo: 'NO_REPORTADA', ...NO_REPORTADA }
  })
}

// Lee los archivos cargados (`[{ nombre, texto }]`) para el archivo plano `archivo`. Si alguno no
// corresponde o no tiene la estructura esperada lanza ArchivoRechazado y no se guarda nada.
// `obligacionId(numero)` da el id de la obligación del corte, o null.
export function leerResultados(archivosCargados, { archivo, obligacionId }) {
  if (!archivosCargados.length) throw new ArchivoRechazado('Adjunta al menos un archivo de resultados de TransUnion.', 'estructura_invalida')
  const leidos = archivosCargados.map(({ nombre, texto }) => {
    const reconocido = reconocer(nombre)
    if (!reconocido) throw sinEstructura(nombre, 'el nombre no es el de un archivo de resultados de TransUnion')
    if (reconocido.fecha !== archivo.fecha_corte) throw deOtroCorte(nombre, reconocido.fecha, archivo.fecha_corte)
    const filas = filasDe(nombre, texto)
    let inconsistencias = []
    if (reconocido.tipo === 'NOREP') inconsistencias = noReportadas(nombre, filas)
    else if (TIPO_INCONSISTENCIA[reconocido.tipo]) inconsistencias = inconsistenciasDelDetalle(nombre, filas, TIPO_INCONSISTENCIA[reconocido.tipo])
    return { cargado: { nombre_archivo: nombre, tipo_archivo: reconocido.tipo, n_filas: filas.length }, inconsistencias }
  })
  const inconsistencias = leidos.flatMap((l) => l.inconsistencias).map((i) => ({ obligacion_id: obligacionId(i.numero_obligacion), ...i }))
  return { archivos_cargados: leidos.map((l) => l.cargado), ...conteos(archivo, inconsistencias), inconsistencias }
}

// Recibidos: los registros 2 del archivo. Cargados: los que no tienen correctivas (esas no ingresan).
// Con inconsistencias y no reportadas cuentan obligaciones, no filas.
export function conteos(archivo, inconsistencias) {
  const obligaciones = (filtro) => new Set(inconsistencias.filter(filtro).map((i) => i.numero_obligacion)).size
  const recibidos = archivo.n_registros
  return {
    recibidos,
    cargados: Math.max(0, recibidos - obligaciones((i) => i.tipo === 'CORRECTIVA')),
    con_inconsistencias: obligaciones(() => true),
    no_reportadas: obligaciones((i) => i.tipo === 'NO_REPORTADA'),
  }
}

// Resultados ya cargados al inicio: los del archivo del 31/08/2026, como el ejemplo de
// `GET /archivos/{id}/resultados/` del contrato 0.9 (con los nombres del Manual).
export function resultadosIniciales() {
  const inconsistencias = [
    { obligacion_id: 2, numero_obligacion: '2258-7731', tipo: 'CORRECTIVA', codigo: '707', descripcion: 'VALOR DE MORA ES REQUERIDO' },
    { obligacion_id: 4, numero_obligacion: '2260-5543', tipo: 'NO_REPORTADA', ...NO_REPORTADA },
  ]
  return {
    1: {
      archivo_id: 1,
      corte_id: 1,
      fecha_corte: '2026-08-31',
      fecha_carga: '2026-09-05T14:00:00-05:00',
      cargado_por: 'Carlos Sánchez',
      estado_corte: 'ENVIADO_CON_INCONSISTENCIAS',
      archivos_cargados: [
        { nombre_archivo: 'Detalle_Inco_CSR_001_123_Correctivas_20260831.txt', tipo_archivo: 'CORRECTIVAS', n_filas: 1 },
        { nombre_archivo: 'norep.001.123.CODIGOPRODUCTO.20260831.0.txt', tipo_archivo: 'NOREP', n_filas: 1 },
      ],
      ...conteos({ n_registros: 10 }, inconsistencias),
      inconsistencias,
    },
  }
}
