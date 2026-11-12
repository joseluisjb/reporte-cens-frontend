// Texto interno que no debe verse en pantalla: códigos de requerimiento (RF, CP, DF, MJ, OBS), de
// historia de usuario (HU-A…HU-E), números de pantalla del mockup y marcas de «pendiente».
export const TEXTO_INTERNO =
  /\b(RF|CP|DF|MJ|OBS)[- ]?\d+|\bHU[- ]?[A-E]\b|por (confirmar|definir)|pendiente de CENS|confirmar con (CENS|TransUnion)|Pantalla \d+/i

// Falla mostrando el fragmento que delata el texto interno. Revisa el texto visible y también los
// atributos que se leen en pantalla (title, aria-label, placeholder, alt).
export function expectSinTextoInterno(contenedor = document.body) {
  const fragmentos = [contenedor.textContent]
  for (const el of contenedor.querySelectorAll('[title], [aria-label], [placeholder], [alt]')) {
    for (const atributo of ['title', 'aria-label', 'placeholder', 'alt']) {
      const valor = el.getAttribute(atributo)
      if (valor) fragmentos.push(valor)
    }
  }
  for (const texto of fragmentos) {
    const hallado = TEXTO_INTERNO.exec(texto)
    if (hallado) {
      const desde = Math.max(0, hallado.index - 40)
      throw new Error(`Texto interno en pantalla: «${hallado[0]}» en «…${texto.slice(desde, hallado.index + hallado[0].length + 40)}…»`)
    }
  }
}
