// Catálogos de TransUnion para mostrar los códigos de la API como texto.
// Fuente: Manual Sector Real v34 de TransUnion. Sector de CENS: Servicios (decisión de Johan,
// 10/10/2026), por eso el estado de la obligación usa la Tabla 4b y no la 4a (Comercio), que
// reutiliza los mismos códigos con otros significados.
//   - TABLA_9: edad de mora (`edad_mora`).
//   - ESTADOS_OBLIGACION: Tabla 4b (`estado_tu`). No existen los códigos 05 ni 09.
//   - TIPOS_IDENTIFICACION: Tabla 2 (`tipo_id_tu`). No existe el código 11.
// El backend entrega solo el código; la descripción se resuelve aquí (contrato 0.4, diferencia R).

// Tabla 9. `desde` y `hasta` son días de mora (inclusivos); `hasta: null` = sin tope.
export const TABLA_9 = {
  '00': { descripcion: 'Normal', desde: 0, hasta: 29 },
  '01': { descripcion: 'Mora 30', desde: 30, hasta: 59 },
  '02': { descripcion: 'Mora 60', desde: 60, hasta: 89 },
  '03': { descripcion: 'Mora 90', desde: 90, hasta: 119 },
  '04': { descripcion: 'Mora 120', desde: 120, hasta: 149 },
  '05': { descripcion: 'Mora 150', desde: 150, hasta: 179 },
  '06': { descripcion: 'Mora 180', desde: 180, hasta: 209 },
  '07': { descripcion: 'Mora 210', desde: 210, hasta: 239 },
  '08': { descripcion: 'Mora 240', desde: 240, hasta: 269 },
  '09': { descripcion: 'Mora 270', desde: 270, hasta: 299 },
  '10': { descripcion: 'Mora 300', desde: 300, hasta: 329 },
  '11': { descripcion: 'Mora 330', desde: 330, hasta: 359 },
  '12': { descripcion: 'Mora 360', desde: 360, hasta: 539 },
  '13': { descripcion: 'Mora 540', desde: 540, hasta: 729 },
  '14': { descripcion: 'Mora 730', desde: 730, hasta: null },
}

// Tabla 4b (sector Servicios).
export const ESTADOS_OBLIGACION = {
  '01': 'Vigente',
  '02': 'Saldada',
  '03': 'Dudoso recaudo',
  '04': 'Suspendida por la entidad',
  '06': 'Castigada',
  '07': 'Castigada recuperada',
  '08': 'Inactivo',
  '10': 'Ley 550',
  '11': 'Ley 1116',
  '12': 'Ley 1564 de 2012',
}

// Tabla 2.
export const TIPOS_IDENTIFICACION = {
  '01': 'Cédula de ciudadanía',
  '02': 'NIT',
  '03': 'Cédula de extranjería',
  '04': 'Tarjeta de identidad',
  '05': 'Pasaporte',
  '06': 'Tarjeta del seguro social extranjero',
  '07': 'Sociedad extranjera sin NIT en Colombia',
  '08': 'Fideicomiso',
  '09': 'Registro civil',
  '10': 'Carnet diplomático',
  '12': 'PEP',
  '13': 'PPT',
}

// Ojo: JavaScript ordena primero las claves que parecen número ('10'–'14'); el orden de las claves
// no es el de la tabla, por eso nada aquí depende de él.
// Un código desconocido se devuelve tal cual: mejor mostrar el código que ocultar el dato.
const descripcionDe = (tabla, codigo, campo) => (Object.hasOwn(tabla, codigo) ? (campo ? tabla[codigo][campo] : tabla[codigo]) : codigo)

export const descripcionEdadMora = (codigo) => descripcionDe(TABLA_9, codigo, 'descripcion')
export const descripcionEstado = (codigo) => descripcionDe(ESTADOS_OBLIGACION, codigo)
export const descripcionTipoId = (codigo) => descripcionDe(TIPOS_IDENTIFICACION, codigo)

// Días de mora → código de edad de mora (Tabla 9). Entero ≥ 0; otro valor lanza RangeError.
export function edadMoraDesdeDias(dias) {
  if (!Number.isInteger(dias) || dias < 0) throw new RangeError(`Los días de mora deben ser un entero mayor o igual a 0 (llegó ${dias}).`)
  return Object.keys(TABLA_9).find((codigo) => dias >= TABLA_9[codigo].desde && (TABLA_9[codigo].hasta === null || dias <= TABLA_9[codigo].hasta))
}
