import { campoTexto, estadoCorteTexto, humanizar, reglaTexto } from '../lib/textos'

describe('textos legibles', () => {
  test.each([
    ['BORRADOR', 'Borrador'],
    ['VALIDADO', 'Validado'],
    ['ENVIADO', 'Enviado'],
    ['ENVIADO_CON_INCONSISTENCIAS', 'Enviado con inconsistencias'],
    ['EN_REVISION', 'En revision'],
    [null, ''],
  ])('estado del corte %s → «%s»', (estado, texto) => {
    expect(estadoCorteTexto(estado)).toBe(texto)
  })

  test.each([
    ['fecha_pago', 'Fecha de pago'],
    ['modo_extincion', 'Modo de extinción'],
    ['estado_tu', 'Estado en TransUnion'],
    ['campo_nuevo', 'Campo nuevo'],
  ])('campo %s → «%s»', (campo, texto) => {
    expect(campoTexto(campo)).toBe(texto)
  })

  test('reglas conocidas y desconocidas', () => {
    expect(reglaTexto('SALDADA_CON_MORA')).toBe('Saldada con mora')
    expect(reglaTexto('REGLA_NUEVA')).toBe('Regla nueva')
    expect(humanizar('A_B')).toBe('A b')
  })
})
