// Generador de DATOS DE PRUEBA FICTICIOS (filas 46 a 48). Nada es real: nombres, identificaciones y
// números de obligación son inventados y determinísticos (misma semilla → mismos datos).
// Sigue el modelo de src/mocks/ (Manual Sector Real v34 de TransUnion, sector Servicios):
//   - obligaciones en TODOS los tramos de mora de la Tabla 9 (00 a 14), con `edad_mora` siempre derivada de `dias_mora`;
//   - obligaciones Saldadas (estado 02: saldo, mora, cuotas y días en 0) y Castigadas (06);
//   - usuarios de cada rol, uno desactivado y uno de primer ingreso.
// Uso:   npm run datos:prueba                       → escribe en datos-prueba/ (ignorada por Git)
//        node scripts/datos-prueba.mjs --cantidad 200 --semilla 7 --salida otra-carpeta
// Salida: usuarios.csv, obligaciones.csv y datos-prueba.json (misma forma que el contrato: ObligacionCorte y User).
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { edadMoraDesdeDias, TABLA_9 } from '../src/features/extraction/catalogosTU.js'

// Tramos de la Tabla 9 (edad de mora) de la app, como [código, desde, hasta] en días; `hasta: null` = sin tope.
export const TRAMOS = Object.entries(TABLA_9)
  .map(([codigo, { desde, hasta }]) => [codigo, desde, hasta])
  .toSorted((a, b) => a[1] - b[1])

const NOMBRES = ['Laura', 'Camilo', 'Marta', 'Andrés', 'Paola', 'Sergio', 'Natalia', 'Iván', 'Lucía', 'Hernán', 'Diana', 'Julián']
const APELLIDOS = ['Prueba', 'Ficticio', 'Demo', 'Ejemplo', 'Simulado', 'Modelo']
const SEGUNDOS = ['Alfa', 'Beta', 'Gama', 'Delta', 'Sigma', 'Omega']

// Generador pseudoaleatorio determinista (mulberry32).
export function aleatorio(semilla) {
  let a = semilla >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const aMiles = (n) => Math.round(n / 1000) * 1000

// Un día de mora representativo por tramo (el primero, uno del medio y el último), para cubrir los bordes.
const diasDelTramo = ([, desde, hasta], azar) => [desde, hasta === null ? desde + 400 : Math.floor((desde + hasta) / 2), hasta ?? desde + 1500, desde + Math.floor(azar() * ((hasta ?? desde + 600) - desde + 1))]

// Obligaciones. Las primeras filas garantizan cobertura: 3 por cada tramo (borde inferior, medio y borde superior),
// 2 saldadas y 2 castigadas; el resto se reparte al azar (la mayoría vigentes y al día).
export function generarObligaciones({ cantidad = 60, semilla = 1 } = {}) {
  const azar = aleatorio(semilla)
  const plan = []
  for (const tramo of TRAMOS) for (const dias of diasDelTramo(tramo, azar).slice(0, 3)) plan.push({ estado: '01', dias })
  plan.push({ estado: '02', dias: 0 }, { estado: '02', dias: 0 }, { estado: '06', dias: 400 }, { estado: '06', dias: 800 })
  while (plan.length < cantidad) {
    const r = azar()
    plan.push(r < 0.08 ? { estado: '02', dias: 0 } : r < 0.1 ? { estado: '06', dias: 360 + Math.floor(azar() * 600) } : { estado: '01', dias: r < 0.5 ? 0 : Math.floor(azar() * 400) })
  }

  return plan.slice(0, cantidad).map(({ estado, dias }, i) => {
    const saldoBruto = 150000 + azar() * 4850000 // se consume siempre, para que el orden de los números no dependa del estado
    const saldada = estado === '02'
    const diasMora = saldada ? 0 : dias
    const valorSaldo = saldada ? 0 : aMiles(saldoBruto)
    const cuotasMora = diasMora === 0 ? 0 : Math.max(1, Math.ceil(diasMora / 30))
    const valorCuota = Math.max(1000, aMiles(saldoBruto / 12))
    const valorMora = diasMora === 0 ? 0 : Math.min(valorSaldo, cuotasMora * valorCuota)
    const nombre = `${NOMBRES[Math.floor(azar() * NOMBRES.length)]} ${SEGUNDOS[Math.floor(azar() * SEGUNDOS.length)]} ${APELLIDOS[Math.floor(azar() * APELLIDOS.length)]}`
    return {
      numero_obligacion: `FIC-${String(200000 + i * 137).padStart(6, '0')}`, // permanente: la fila N conserva su número
      nombre_titular: `${nombre} (ficticio)`,
      numero_identificacion: String(990000000 + i * 7 + 1), // empieza por 99: se reconoce a simple vista como inventado
      tipo_id_tu: '01',
      estado_tu: estado,
      edad_mora: edadMoraDesdeDias(diasMora),
      dias_mora: diasMora,
      cuotas_mora: cuotasMora,
      valor_mora: valorMora,
      valor_saldo: valorSaldo,
      n_creditos: 1 + Math.floor(azar() * 3),
    }
  })
}

// Usuarios ficticios: ambos roles, uno desactivado y uno de primer ingreso. SIN contraseñas: la carga de usuarios
// en un entorno real debe pasar por el alta del sistema (que genera la temporal y la envía por correo).
export function generarUsuarios() {
  return [
    { id: 1, nombre: 'Juan Pérez', email: 'jperez@example.com', rol: 'ANALISTA_CARTERA', is_active: true, last_login: '2026-09-30T08:14:00-05:00', must_change_password: false },
    { id: 2, nombre: 'Rosa Martínez', email: 'rmartinez@example.com', rol: 'ADMINISTRADOR', is_active: true, last_login: '2026-09-30T09:02:00-05:00', must_change_password: false },
    { id: 3, nombre: 'Carlos Sánchez', email: 'csanchez@example.com', rol: 'ANALISTA_CARTERA', is_active: true, last_login: '2026-09-29T17:40:00-05:00', must_change_password: false },
    { id: 4, nombre: 'Ana Lucía Vargas', email: 'avargas@example.com', rol: 'ANALISTA_CARTERA', is_active: false, last_login: '2026-06-02T11:05:00-05:00', must_change_password: false },
    { id: 5, nombre: 'Pablo Rincón', email: 'princon@example.com', rol: 'ADMINISTRADOR', is_active: true, last_login: '2026-09-30T07:51:00-05:00', must_change_password: false },
    { id: 6, nombre: 'Diana Niño', email: 'dnino@example.com', rol: 'ANALISTA_CARTERA', is_active: true, last_login: '2026-09-30T10:22:00-05:00', must_change_password: false },
    { id: 7, nombre: 'María Gómez', email: 'mgomez@example.com', rol: 'ANALISTA_CARTERA', is_active: true, last_login: null, must_change_password: true },
  ]
}

// CSV con comillas cuando hace falta (comas, comillas o saltos de línea). Valor nulo → vacío.
export function aCsv(filas) {
  if (!filas.length) return ''
  const columnas = Object.keys(filas[0])
  const celda = (v) => {
    const t = v === null || v === undefined ? '' : String(v)
    return /[",\n\r]/.test(t) ? `"${t.replaceAll('"', '""')}"` : t
  }
  return [columnas.join(','), ...filas.map((f) => columnas.map((c) => celda(f[c])).join(','))].join('\n') + '\n'
}

export function generarDatosPrueba(opciones = {}) {
  return { usuarios: generarUsuarios(), obligaciones: generarObligaciones(opciones) }
}

// ── Línea de comandos ──
const MINIMO = 49 // 3 por cada uno de los 15 tramos + 2 saldadas + 2 castigadas
function leerArgumentos(argv) {
  const valor = (nombre, porDefecto) => {
    const i = argv.indexOf(`--${nombre}`)
    return i >= 0 && argv[i + 1] ? argv[i + 1] : porDefecto
  }
  const cantidad = Number(valor('cantidad', 60))
  const semilla = Number(valor('semilla', 1))
  if (!Number.isInteger(cantidad) || cantidad < MINIMO) throw new Error(`--cantidad debe ser un entero de al menos ${MINIMO} (para cubrir todos los tramos, saldadas y castigadas).`)
  if (!Number.isInteger(semilla)) throw new Error('--semilla debe ser un entero.')
  return { cantidad, semilla, salida: valor('salida', 'datos-prueba') }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { cantidad, semilla, salida } = leerArgumentos(process.argv.slice(2))
  const datos = generarDatosPrueba({ cantidad, semilla })
  mkdirSync(salida, { recursive: true })
  writeFileSync(join(salida, 'usuarios.csv'), aCsv(datos.usuarios))
  writeFileSync(join(salida, 'obligaciones.csv'), aCsv(datos.obligaciones))
  writeFileSync(join(salida, 'datos-prueba.json'), JSON.stringify(datos, null, 2))
  console.log(`Datos ficticios generados en ${fileURLToPath(pathToFileURL(salida))}: ${datos.usuarios.length} usuarios y ${datos.obligaciones.length} obligaciones (semilla ${semilla}).`)
}
