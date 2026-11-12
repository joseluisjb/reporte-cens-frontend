// Cada rol ve solo sus opciones y sus rutas. Las expectativas salen de NAV_ITEMS: si alguien agrega
// una opción para el rol equivocado o reintroduce etiquetas de rol en el menú, esta prueba falla.
import { screen, within } from '@testing-library/react'
import { NAV_ITEMS, SECCIONES, puedeAbrir } from '../app/navigation'
import { ROLES } from '../features/auth/roles'
import { ADMIN, ANALISTA, renderApp } from './renderApp'

const PERFILES = [
  { rol: ROLES.ADMIN, usuario: ADMIN, saludo: 'Bienvenido, Rosa' },
  { rol: ROLES.ANALISTA, usuario: ANALISTA, saludo: 'Bienvenido, Juan' },
]

const menu = () => within(screen.getByRole('navigation', { name: 'Navegación principal' }))

describe.each(PERFILES)('menú del rol $rol', ({ rol, usuario, saludo }) => {
  const permitidas = NAV_ITEMS.filter((i) => puedeAbrir(i, rol))
  const prohibidas = NAV_ITEMS.filter((i) => !puedeAbrir(i, rol))
  const seccionesConOpciones = SECCIONES.filter((s) => permitidas.some((i) => i.section === s))

  test('los enlaces son exactamente las opciones que puede abrir, en orden, sin etiquetas de rol', async () => {
    renderApp('/panel', usuario)
    await screen.findByRole('heading', { name: saludo })
    const enlaces = menu().getAllByRole('link')
    const esperado = [...permitidas].sort(
      (a, b) => (a.section ? SECCIONES.indexOf(a.section) + 1 : 0) - (b.section ? SECCIONES.indexOf(b.section) + 1 : 0),
    )
    expect(enlaces.map((a) => a.textContent)).toEqual(esperado.map((i) => i.label))
    expect(enlaces.map((a) => a.getAttribute('href'))).toEqual(esperado.map((i) => i.path))
    expect(screen.getByRole('navigation', { name: 'Navegación principal' })).not.toHaveTextContent(/ADMIN|ANALISTA/)
    expect(screen.queryByText(/solo para el rol/i)).not.toBeInTheDocument()
  })

  test('muestra los títulos de las secciones que tienen opciones y ningún otro', async () => {
    renderApp('/panel', usuario)
    await screen.findByRole('heading', { name: saludo })
    for (const seccion of SECCIONES) {
      const titulo = menu().queryByText(seccion)
      if (seccionesConOpciones.includes(seccion)) expect(titulo).toBeInTheDocument()
      else expect(titulo).not.toBeInTheDocument()
    }
  })

  test.each(prohibidas.map((i) => [i.path, i.label]))('al escribir %s (%s) vuelve al inicio sin cargar la pantalla', async (ruta, etiqueta) => {
    renderApp(ruta, usuario)
    expect(await screen.findByRole('heading', { name: saludo })).toBeInTheDocument()
    expect(menu().queryByRole('link', { name: etiqueta })).not.toBeInTheDocument()
    expect(menu().getByRole('link', { name: 'Inicio' })).toHaveAttribute('aria-current', 'page')
  })
})

describe('reparto de secciones entre roles', () => {
  const titulosDe = (rol) => SECCIONES.filter((s) => NAV_ITEMS.some((i) => i.section === s && puedeAbrir(i, rol)))

  test('el Analista tiene Extracción, Ciclo de vida y Reporte a TransUnion, sin Administración', () => {
    expect(titulosDe(ROLES.ANALISTA)).toEqual(['Extracción', 'Ciclo de vida', 'Reporte a TransUnion'])
  })

  test('el Administrador tiene Extracción y Administración, sin Ciclo de vida ni Reporte a TransUnion', () => {
    expect(titulosDe(ROLES.ADMIN)).toEqual(['Extracción', 'Administración'])
  })
})
