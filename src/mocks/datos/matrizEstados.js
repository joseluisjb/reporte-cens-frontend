// Matriz de cambios de estado de Sector Real Servicios (Manual v34 de TransUnion, p. 40), para
// `GET /matriz-estados/`. Es la transcripción verificada de docs/iteracion2/MATRIZ_ESTADOS_SERVICIOS.md
// (la misma del mockup v3). En el backend vive en la base (NV_TRANSICION_ESTADO); el frontend no la
// copia: la pide a la API.
//
// Cada fila es «estado del corte anterior» + n (sin mora) o m (con mora). Sus 20 letras son las columnas
// en el orden de ORDEN_MATRIZ, alternando n y m. S = TransUnion acepta el cambio; N = error 713.
export const ORDEN_MATRIZ = ['01', '02', '04', '08', '06', '07', '03', '10', '11', '12']

const FILAS = {
  '01n': 'SSSNNNSSNSNNNSSSSSSS',
  '01m': 'SSSNNSSSNSNNNSSSSSSS',
  '02n': 'NNNNNNNNNNNNNNNNNNNN',
  '02m': 'NNNNNNNNNNNNNNNNNNNN',
  '04n': 'NNNNSSSSNNNNNNNNNNNN',
  '04m': 'NNNNSSSSNSNNNSNNNNNN',
  '08n': 'SSSNNNSSNSNNNNNNNNNN',
  '08m': 'SSSNNNSSNSNNNSNNNNNN',
  '06n': 'NNNNNNNNNNNNNNNNNNNN',
  '06m': 'SSNNNNNNNSSNNNSSSSSS',
  '07n': 'NNNNNNNNNNNNNNNNNNNN',
  '07m': 'NNNNNNNNNNNNNNNNNNNN',
  '03n': 'NNNNNNNNNNNNNNNNNNNN',
  '03m': 'SSNNNNNNNSSNNSSSSSSS',
  '10n': 'SSNNNNNNNSNNNSSSNNNN',
  '10m': 'SSNNNNNNNSNNNSSSNNNN',
  '11n': 'SSNNNNSSNSNNNSNNSSNN',
  '11m': 'SSNNSSSSNSNNNSNNSSNN',
  '12n': 'SSNNNSSSNSNNNSNNNNSS',
  '12m': 'SSNNNSSSNSNNNSNNNNSS',
}

// MatrizEstados del contrato: las 400 combinaciones (10 × 2 orígenes por 10 × 2 destinos).
export function matrizEstados() {
  const transiciones = []
  for (const desde of ORDEN_MATRIZ) {
    for (const desdeConMora of [false, true]) {
      const fila = FILAS[desde + (desdeConMora ? 'm' : 'n')]
      ORDEN_MATRIZ.forEach((hacia, i) => {
        for (const haciaConMora of [false, true]) {
          const permitida = fila[i * 2 + (haciaConMora ? 1 : 0)] === 'S'
          transiciones.push({ desde, desde_con_mora: desdeConMora, hacia, hacia_con_mora: haciaConMora, permitida })
        }
      })
    }
  }
  return { tipo_cartera: 2, estados: ORDEN_MATRIZ, transiciones }
}
