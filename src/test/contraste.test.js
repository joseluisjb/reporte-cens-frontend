import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createElement } from 'react'
import { render, screen } from '@testing-library/react'
import Switch from '../components/ui/Switch'
import { buttonClasses } from '../components/ui/buttonClasses'
import { renderApp } from './renderApp'

// Guarda la decisión de contraste AA (docs/ACCESIBILIDAD.md): jsdom no mide colores, así que se
// calcula con la fórmula WCAG 2.x sobre los tokens reales de src/index.css.
// Se lee el archivo tal cual: Vitest (jsdom) no entrega el texto del CSS con `?raw`; `npm test` corre desde la raíz del proyecto.
const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf-8')
const TOKENS = Object.fromEntries([...css.matchAll(/--color-([\w-]+):\s*(#[0-9a-f]{6})/gi)].map(([, nombre, hex]) => [nombre, hex]))
const BLANCO = '#ffffff'
const NEGRO = '#000000'

const canales = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))

function luminancia(hex) {
  const [r, g, b] = canales(hex).map((c) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contraste(a, b) {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (claro + 0.05) / (oscuro + 0.05)
}

// Color resultante de poner `arriba` con opacidad `alfa` (0 a 1) sobre `abajo`.
function mezclar(arriba, alfa, abajo) {
  const [a, b] = [canales(arriba), canales(abajo)]
  const mezcla = a.map((c, i) => Math.round(c * alfa + b[i] * (1 - alfa)))
  return `#${mezcla.map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

const t = (nombre) => TOKENS[nombre]

test('los tokens de contraste existen en index.css', () => {
  for (const nombre of ['bosque', 'bosque-d', 'bosque-dd', 'gris-d', 'muted', 'error-d', 'fondo']) {
    expect(TOKENS[nombre], `falta --color-${nombre}`).toMatch(/^#[0-9a-f]{6}$/i)
  }
})

describe('contraste WCAG AA de los tokens', () => {
  test.each([
    ['texto blanco sobre bosque-d (botón primario, menú lateral)', () => [BLANCO, t('bosque-d')], 4.5],
    ['texto blanco sobre bosque-dd (hover del botón primario)', () => [BLANCO, t('bosque-dd')], 4.5],
    ['texto bosque-d sobre blanco (enlaces, botón contorno)', () => [t('bosque-d'), BLANCO], 4.5],
    ['texto bosque-d sobre el fondo de la app', () => [t('bosque-d'), t('fondo')], 4.5],
    ['texto apagado (muted) sobre blanco', () => [t('muted'), BLANCO], 4.5],
    ['texto apagado (muted) sobre el fondo de la app', () => [t('muted'), t('fondo')], 4.5],
    ['texto de error (error-d) sobre blanco', () => [t('error-d'), BLANCO], 4.5],
    ['borde gris-d de los campos sobre blanco', () => [t('gris-d'), BLANCO], 3],
    ['borde gris-d de los campos sobre el fondo de la app', () => [t('gris-d'), t('fondo')], 3],
    ['texto grande blanco sobre bosque (panel del login)', () => [BLANCO, t('bosque')], 3],
    ['texto blanco sobre el hover del menú (negro 10 % sobre bosque-d)', () => [BLANCO, mezclar(NEGRO, 0.1, t('bosque-d'))], 4.5],
    ['texto blanco sobre el ítem activo del menú (negro 20 % sobre bosque-d)', () => [BLANCO, mezclar(NEGRO, 0.2, t('bosque-d'))], 4.5],
  ])('%s', (_nombre, colores, minimo) => {
    const [a, b] = colores()
    expect(contraste(a, b)).toBeGreaterThanOrEqual(minimo)
  })
})

describe('los componentes usan los tokens accesibles', () => {
  test('el botón primario usa bosque-d y su hover bosque-dd', () => {
    const clases = buttonClasses({ variant: 'primary' }).split(' ')
    expect(clases).toContain('bg-bosque-d')
    expect(clases).toContain('enabled:hover:bg-bosque-dd')
    expect(clases).not.toContain('bg-bosque')
  })

  test('el interruptor no trae el verde de marca escrito a mano', () => {
    const { container } = render(createElement(Switch, { checked: true, label: 'Usuario activo' }))
    const conVerde = [...container.querySelectorAll('*')].filter((el) =>
      [...el.attributes].some((a) => a.value.toLowerCase() === '#0d9648'),
    )
    expect(conVerde).toHaveLength(0)
  })

  test('el menú lateral usa el fondo bosque-d', async () => {
    renderApp('/panel')
    await screen.findByRole('heading', { name: /bienvenido/i })
    const menu = screen.getByRole('navigation', { name: 'Navegación principal' }).closest('aside')
    expect(menu).toHaveClass('bg-bosque-d')
  })
})
