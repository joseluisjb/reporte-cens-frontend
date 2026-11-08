// Archivos de respuesta de TransUnion FICTICIOS para las pruebas de RF54. Los nombres siguen el Manual
// (p. 43) y el contenido va delimitado por pipes con una línea de títulos (pp. 52-54). El texto de los
// títulos no está en el Manual: aquí es ilustrativo y el mock no lo lee.
const ENTIDAD = '001_123'
const sinGuiones = (fecha) => fecha.replaceAll('-', '')
const archivo = (nombre, lineas) => new File([lineas.join('\r\n') + '\r\n'], nombre, { type: 'text/plain' })

// Registro tipo 2 tal como lo envió la entidad (Manual, Tabla 2, p. 46): tipo de registro en la posición 1 y
// el número de la obligación en las posiciones 89 a 108, alineado a la derecha. El resto va en blanco.
const registro2 = (numero) => `2${' '.repeat(87)}${numero.padStart(20)}`.padEnd(930)

const TITULOS_DETALLE = 'LINEA|TIPO ID|NUMERO ID|ESTADO|NOMBRE|EDAD MORA|REGISTRO TIPO 2|CODIGO 1|DESCRIPCION 1|TIPO 1'
const lineaDetalle = (n, { numero, codigo, descripcion, tipo }) => `${String(n).padStart(12, '0')}|01|000000000001234|01|  |01|${registro2(numero)}|${codigo}|${descripcion}|${tipo}`

// `inconsistencias`: [{ numero, codigo, descripcion }]
export const detalleCorrectivas = (fechaCorte, inconsistencias) =>
  archivo(
    `Detalle_Inco_CSR_${ENTIDAD}_Correctivas_${sinGuiones(fechaCorte)}.txt`,
    [TITULOS_DETALLE, ...inconsistencias.map((i, n) => lineaDetalle(n + 1, { ...i, tipo: 'C' }))],
  )

export const detalleAlertas = (fechaCorte, inconsistencias) =>
  archivo(
    `Detalle_Inco_CSR_${ENTIDAD}_Alertas_${sinGuiones(fechaCorte)}.txt`,
    [TITULOS_DETALLE, ...inconsistencias.map((i, n) => lineaDetalle(n + 1, { ...i, tipo: 'I' }))],
  )

// `numeros`: obligaciones no reportadas.
export const noReportados = (fechaCorte, numeros) =>
  archivo(`norep.001.123.CODIGOPRODUCTO.${sinGuiones(fechaCorte)}.0.txt`, [
    'TIPO ID|NUMERO ID|NUMERO OBLIGACION|SUCURSAL|ESTADO|CALIFICACION|EDAD MORA|LINEA CREDITO|CLASE TARJETA|CODIGO RAMO|VALOR SALDO|VALOR MORA|FECHA TERMINACION|FECHA CORTE',
    ...numeros.map((numero) => `01|000000000001234|${numero}|A1B2C3|01||01|||||0|0||20260731`),
  ])

export const estadisticos = (fechaCorte, filas = 1) =>
  archivo(`Esta_Inco_CSR_${ENTIDAD}_Correctivas_${sinGuiones(fechaCorte)}.txt`, ['CODIGO|DESCRIPCION|CANTIDAD', ...Array.from({ length: filas }, (_, n) => `00${n}|X|0`)])

// Un archivo con el nombre de un detalle de correctivas cuyas líneas no traen el registro tipo 2.
export const detalleSinRegistro2 = (fechaCorte) =>
  archivo(`Detalle_Inco_CSR_${ENTIDAD}_Correctivas_${sinGuiones(fechaCorte)}.txt`, [TITULOS_DETALLE, '000000000001|01|000000000001234|01|  |01'])
