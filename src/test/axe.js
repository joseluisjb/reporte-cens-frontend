// Auditoría de accesibilidad automática con axe-core (reglas WCAG 2.x A y AA).
// jsdom no calcula colores ni tamaños, por eso 'color-contrast' va desactivado aquí: el contraste
// se revisó aparte con la fórmula WCAG (ver docs/ACCESIBILIDAD.md).
import axe from 'axe-core'

export async function violaciones(contexto = document) {
  const resultado = await axe.run(contexto, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] },
    rules: { 'color-contrast': { enabled: false } },
  })
  return resultado.violations.map((v) => `${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)
}

export async function expectAccesible(contexto = document) {
  expect(await violaciones(contexto)).toEqual([])
}
