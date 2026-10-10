// Catálogos de TransUnion (Manual Sector Real v34, sector Servicios) y enmascarado de la identificación.
import {
  descripcionEdadMora,
  descripcionEstado,
  descripcionTipoId,
  edadMoraDesdeDias,
  ESTADOS_OBLIGACION,
  TABLA_9,
  TIPOS_IDENTIFICACION,
} from '../features/extraction/catalogosTU'
import { enmascararIdentificacion } from '../lib/format'

describe('Tabla 9: edad de mora', () => {
  test.each([
    [0, '00'],
    [29, '00'],
    [30, '01'],
    [59, '01'],
    [60, '02'],
    [89, '02'],
    [90, '03'],
    [119, '03'],
    [120, '04'],
    [149, '04'],
    [150, '05'],
    [179, '05'],
    [180, '06'],
    [209, '06'],
    [210, '07'],
    [239, '07'],
    [240, '08'],
    [269, '08'],
    [270, '09'],
    [299, '09'],
    [300, '10'],
    [329, '10'],
    [330, '11'],
    [359, '11'],
    [360, '12'],
    [539, '12'],
    [540, '13'],
    [729, '13'],
    [730, '14'],
    [5000, '14'],
  ])('%i días de mora → código %s', (dias, codigo) => {
    expect(edadMoraDesdeDias(dias)).toBe(codigo)
  })

  test('días negativos o no enteros lanzan RangeError', () => {
    expect(() => edadMoraDesdeDias(-1)).toThrow(RangeError)
    expect(() => edadMoraDesdeDias(1.5)).toThrow(RangeError)
    expect(() => edadMoraDesdeDias('30')).toThrow(RangeError)
    expect(() => edadMoraDesdeDias(NaN)).toThrow(RangeError)
  })

  test('los tramos no se solapan ni dejan huecos', () => {
    const tramos = Object.values(TABLA_9).toSorted((a, b) => a.desde - b.desde)
    expect(tramos).toHaveLength(15)
    expect(tramos[0].desde).toBe(0)
    tramos.slice(1).forEach((t, i) => expect(t.desde).toBe(tramos[i].hasta + 1))
    expect(tramos.at(-1).hasta).toBeNull()
  })

  test('descripciones y código desconocido', () => {
    expect(descripcionEdadMora('00')).toBe('Normal')
    expect(descripcionEdadMora('01')).toBe('Mora 30')
    expect(descripcionEdadMora('11')).toBe('Mora 330')
    expect(descripcionEdadMora('12')).toBe('Mora 360')
    expect(descripcionEdadMora('14')).toBe('Mora 730')
    expect(descripcionEdadMora('99')).toBe('99')
    expect(descripcionEdadMora('toString')).toBe('toString')
  })
})

describe('Tabla 4b: estado de la obligación (Servicios)', () => {
  test('no existen los códigos 05 ni 09', () => {
    expect(Object.keys(ESTADOS_OBLIGACION).toSorted()).toEqual(['01', '02', '03', '04', '06', '07', '08', '10', '11', '12'])
    expect(ESTADOS_OBLIGACION).not.toHaveProperty('05')
    expect(ESTADOS_OBLIGACION).not.toHaveProperty('09')
  })

  test('descripciones y código desconocido', () => {
    expect(descripcionEstado('01')).toBe('Vigente')
    expect(descripcionEstado('02')).toBe('Saldada')
    expect(descripcionEstado('03')).toBe('Dudoso recaudo')
    expect(descripcionEstado('04')).toBe('Suspendida por la entidad')
    expect(descripcionEstado('06')).toBe('Castigada')
    expect(descripcionEstado('07')).toBe('Castigada recuperada')
    expect(descripcionEstado('08')).toBe('Inactivo')
    expect(descripcionEstado('10')).toBe('Ley 550')
    expect(descripcionEstado('11')).toBe('Ley 1116')
    expect(descripcionEstado('12')).toBe('Ley 1564 de 2012')
    expect(descripcionEstado('05')).toBe('05')
  })
})

describe('Tabla 2: tipo de identificación', () => {
  test('no existe el código 11', () => {
    expect(Object.keys(TIPOS_IDENTIFICACION).toSorted()).toEqual(['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '12', '13'])
    expect(TIPOS_IDENTIFICACION).not.toHaveProperty('11')
  })

  test('descripciones y código desconocido', () => {
    expect(descripcionTipoId('01')).toBe('Cédula de ciudadanía')
    expect(descripcionTipoId('02')).toBe('NIT')
    expect(descripcionTipoId('10')).toBe('Carnet diplomático')
    expect(descripcionTipoId('12')).toBe('PEP')
    expect(descripcionTipoId('13')).toBe('PPT')
    expect(descripcionTipoId('CC')).toBe('CC') // el código viejo del backend no se traduce
  })
})

describe('enmascararIdentificacion', () => {
  test('deja los últimos 4 dígitos y oculta el resto', () => {
    expect(enmascararIdentificacion('1000000001')).toBe('******0001')
    expect(enmascararIdentificacion('12345')).toBe('*2345')
    expect(enmascararIdentificacion(1000000002)).toBe('******0002')
  })

  test('4 caracteres o menos se ocultan por completo', () => {
    expect(enmascararIdentificacion('1234')).toBe('****')
    expect(enmascararIdentificacion('12')).toBe('**')
  })

  test('sin valor devuelve "—"', () => {
    expect(enmascararIdentificacion(null)).toBe('—')
    expect(enmascararIdentificacion(undefined)).toBe('—')
    expect(enmascararIdentificacion('')).toBe('—')
    expect(enmascararIdentificacion('   ')).toBe('—')
  })
})
