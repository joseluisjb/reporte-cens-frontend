// Script de datos de prueba (scripts/datos-prueba.mjs): cobertura de tramos, coherencia con la Tabla 9 de
// TransUnion (la misma de la app, catalogosTU) y con el contrato, determinismo y que todo sea ficticio.
import { aCsv, aleatorio, generarDatosPrueba, generarObligaciones, generarUsuarios, TRAMOS } from '../../scripts/datos-prueba.mjs'
import { edadMoraDesdeDias, TABLA_9 } from '../features/extraction/catalogosTU'
import { expectCumpleContrato } from './contrato'

const obligaciones = generarObligaciones({ cantidad: 60, semilla: 1 })

describe('datos de prueba', () => {
  test('los tramos del script son los 15 de la Tabla 9 de la app, en orden', () => {
    expect(TRAMOS.map(([c]) => c)).toEqual(Object.keys(TABLA_9).toSorted()) // '10'…'14' son claves numéricas: JS las pone primero
    for (const [codigo, desde, hasta] of TRAMOS) expect({ desde, hasta }).toEqual({ desde: TABLA_9[codigo].desde, hasta: TABLA_9[codigo].hasta })
  })

  test('hay obligaciones en los 15 tramos de mora (00 a 14)', () => {
    expect(new Set(obligaciones.map((o) => o.edad_mora))).toEqual(new Set(Object.keys(TABLA_9)))
  })

  test('cubre los bordes de cada tramo (primer y último día)', () => {
    for (const [codigo, desde, hasta] of TRAMOS) {
      const dias = obligaciones.filter((o) => o.edad_mora === codigo && o.estado_tu === '01').map((o) => o.dias_mora)
      expect(dias, `tramo ${codigo}`).toContain(desde)
      if (hasta !== null) expect(dias, `tramo ${codigo}`).toContain(hasta)
    }
  })

  test('hay Saldadas (02, todo en cero) y Castigadas (06)', () => {
    const saldadas = obligaciones.filter((o) => o.estado_tu === '02')
    expect(saldadas.length).toBeGreaterThanOrEqual(2)
    for (const o of saldadas) expect(o).toMatchObject({ valor_saldo: 0, valor_mora: 0, cuotas_mora: 0, dias_mora: 0, edad_mora: '00' })
    expect(obligaciones.filter((o) => o.estado_tu === '06').length).toBeGreaterThanOrEqual(2)
  })

  test('coherencia: edad de mora derivada de los días, mora ≤ saldo, enteros y mora solo con días', () => {
    for (const o of obligaciones) {
      expect(o.edad_mora).toBe(edadMoraDesdeDias(o.dias_mora))
      expect(o.valor_mora).toBeLessThanOrEqual(o.valor_saldo)
      expect(Number.isInteger(o.valor_mora) && Number.isInteger(o.valor_saldo)).toBe(true)
      if (o.dias_mora === 0) expect([o.valor_mora, o.cuotas_mora]).toEqual([0, 0])
      else expect(o.cuotas_mora).toBeGreaterThan(0)
    }
  })

  test('cumple el contrato (ListaPaginada de ObligacionCorte) y los usuarios cumplen User', () => {
    expect(() => expectCumpleContrato('get', '/extracciones/{id}/obligaciones/', 200, { total: obligaciones.length, resultados: obligaciones })).not.toThrow()
    expect(() => expectCumpleContrato('get', '/users/', 200, generarUsuarios())).not.toThrow()
  })

  test('todo es ficticio y único: identificaciones 99…, nombres «(ficticio)», números de obligación sin repetir', () => {
    expect(new Set(obligaciones.map((o) => o.numero_obligacion)).size).toBe(obligaciones.length)
    expect(new Set(obligaciones.map((o) => o.numero_identificacion)).size).toBe(obligaciones.length)
    for (const o of obligaciones) {
      expect(o.numero_identificacion).toMatch(/^99\d{7}$/)
      expect(o.nombre_titular).toMatch(/\(ficticio\)$/)
    }
  })

  test('es determinista: misma semilla, mismos datos; otra semilla, otros montos', () => {
    expect(generarObligaciones({ cantidad: 60, semilla: 1 })).toEqual(obligaciones)
    expect(generarObligaciones({ cantidad: 60, semilla: 2 }).map((o) => o.valor_saldo)).not.toEqual(obligaciones.map((o) => o.valor_saldo))
    const a = aleatorio(5)
    expect(a()).toBe(aleatorio(5)())
  })

  test('respeta la cantidad pedida y los números de obligación son permanentes por posición', () => {
    expect(generarObligaciones({ cantidad: 200 })).toHaveLength(200)
    expect(generarObligaciones({ cantidad: 200 }).slice(0, 60).map((o) => o.numero_obligacion)).toEqual(obligaciones.map((o) => o.numero_obligacion))
  })

  test('usuarios: ambos roles, uno desactivado, uno de primer ingreso y ninguna contraseña', () => {
    const u = generarUsuarios()
    expect(new Set(u.map((x) => x.rol))).toEqual(new Set(['ANALISTA_CARTERA', 'ADMINISTRADOR']))
    expect(u.some((x) => !x.is_active)).toBe(true)
    expect(u.some((x) => x.must_change_password && x.last_login === null)).toBe(true)
    expect(JSON.stringify(u)).not.toMatch(/password"\s*:\s*"/i)
    expect(generarDatosPrueba().usuarios).toEqual(u)
  })

  test('el CSV escapa comas y comillas, deja vacío el nulo y lleva una fila por registro', () => {
    expect(aCsv([{ a: 'x,y', b: 'di "hola"', c: null }])).toBe('a,b,c\n"x,y","di ""hola""",\n')
    expect(aCsv([])).toBe('')
    const csv = aCsv(obligaciones).trimEnd().split('\n')
    expect(csv).toHaveLength(obligaciones.length + 1)
  })
})
