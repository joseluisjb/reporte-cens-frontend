// Ninguna pantalla muestra códigos internos (RFxx, HU-, CP-, DF-, MJ-, OBS-, número de pantalla del
// mockup) ni marcas de «por confirmar»: eso vive en la documentación, no en la interfaz. Se recorre
// cada ruta de cada rol y los estados profundos (paneles, diálogos, resultados de ejecuciones).
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from 'msw'
import { NAV_ITEMS, puedeAbrir } from '../app/navigation'
import { ROLES } from '../features/auth/roles'
import { API_URL } from '../lib/config'
import { db } from '../mocks/db'
import { server } from '../mocks/server'
import { cicloConRechazosYRevisiones, corteDeOctubreEnBorrador } from './escenarios/ciclo'
import { renderConSesion } from './renderApp'
import { expectSinTextoInterno, TEXTO_INTERNO, TEXTO_JERGA } from './textoInterno'

const SESION = {
  [ROLES.ADMIN]: ['rmartinez@example.com', 'Admin12345'],
  [ROLES.ANALISTA]: ['jperez@example.com', 'Analista123'],
}
const ANALISTA = SESION[ROLES.ANALISTA]
const ADMIN = SESION[ROLES.ADMIN]

// Título (h1) de cada pantalla: con él se sabe que la ruta cargó. Si se agrega una ruta, hay que
// agregarla aquí y la prueba de rutas la recorre sola.
const TITULOS = {
  '/panel': /^Bienvenido/,
  '/extraccion': 'Extracción y Consolidación de Cartera',
  '/parametrizacion': 'Códigos de Concepto de Energía',
  '/obligaciones': 'Obligaciones y Estados',
  '/ciclo': 'Actualización Mensual de Estados',
  '/refinanciaciones': 'Refinanciaciones',
  '/reporte': 'Reporte a TransUnion',
  '/reclamos': 'Reclamos Habeas Data',
  '/novedades': 'Novedades Urgentes',
  '/usuarios': 'Usuarios del Sistema',
  '/auditoria': 'Registro de auditoría del sistema',
  '/entidad': 'Datos de la Entidad ante TransUnion',
  '/homologacion-estados': 'Homologación de Estados',
}

const terminoDeCargar = () => waitFor(() => expect(screen.queryByRole('status', { name: /^Cargando/ })).not.toBeInTheDocument())
const abrirRuta = async (ruta, sesion) => {
  await renderConSesion(ruta, ...sesion)
  await screen.findByRole('heading', { name: TITULOS[ruta], level: 1 })
  await terminoDeCargar()
}

describe('el detector de texto interno', () => {
  test.each([
    'Primer reporte — RF10',
    'RF11 · 47 días',
    'Validaciones (RF53)',
    'RF13, RF16',
    'HU-C',
    'CP-04',
    'DF-2',
    'MJ-1',
    'OBS-3',
    'Pantalla 10',
    'por confirmar',
    'orden por confirmar con CENS',
    'pendiente de CENS',
    'redondeo por confirmar con TransUnion',
    'por definir',
  ])('detecta «%s»', (texto) => {
    expect(TEXTO_INTERNO.test(texto)).toBe(true)
  })

  test.each(['Primer reporte: las obligaciones nuevas entran con su estado', 'Edad de mora (Tabla 9)', 'Obligación 2257-4156', 'Confirmado'])(
    'deja pasar «%s»',
    (texto) => {
      expect(TEXTO_INTERNO.test(texto)).toBe(false)
    },
  )

  test.each([
    'Edad de mora (Tabla 9)',
    'Ver Manual, p. 43',
    'Primer reporte (p. 38-39)',
    'Sector Real Servicios',
    'Cumplen la matriz de TransUnion',
    'Error 713: no permitido',
    'una falla (error 881)',
    'Primer reporte (regla 881)',
    'Caducado en el SAC',
    'datos con relleno (XXX)',
    'registro 1 y registro 9',
    'Generar archivo plano',
    'Carga inicial (script 12)',
    'Activo (propuesto)',
    'Desconocido: preguntar a CENS',
    'Corte en BORRADOR',
    'Corte VALIDADO',
    'ENVIADO_CON_INCONSISTENCIAS',
    'Log de Auditoría',
    'Se abriría el módulo',
  ])('la jerga detecta «%s»', (texto) => {
    expect(TEXTO_JERGA.test(texto)).toBe(true)
  })

  test.each(['Edad de mora', 'Estados del sistema comercial', 'Datos provisionales', 'Registro de auditoría del sistema', 'Corte en borrador', 'Generar archivo para TransUnion'])(
    'la jerga deja pasar «%s»',
    (texto) => {
      expect(TEXTO_JERGA.test(texto)).toBe(false)
    },
  )

  test('expectSinTextoInterno también falla con jerga, en texto y en atributos', () => {
    const contenedor = document.createElement('div')
    contenedor.innerHTML = '<p>Crédito caducado en el SAC</p>'
    expect(() => expectSinTextoInterno(contenedor)).toThrow(/«SAC»/)
    contenedor.innerHTML = '<span title="Tabla 9">x</span>'
    expect(() => expectSinTextoInterno(contenedor)).toThrow(/«Tabla 9»/)
  })

  test('expectSinTextoInterno falla mostrando el fragmento, también en atributos', () => {
    const contenedor = document.createElement('div')
    contenedor.innerHTML = '<p>Pago total — RF12 y listo</p>'
    expect(() => expectSinTextoInterno(contenedor)).toThrow(/«RF12»/)
    contenedor.innerHTML = '<button aria-label="Guardar (por confirmar)">x</button>'
    expect(() => expectSinTextoInterno(contenedor)).toThrow(/«por confirmar»/)
    contenedor.innerHTML = '<p>Todo en orden</p>'
    expect(() => expectSinTextoInterno(contenedor)).not.toThrow()
  })
})

describe.each(Object.values(ROLES))('rutas del rol %s', (rol) => {
  const rutas = NAV_ITEMS.filter((i) => puedeAbrir(i, rol)).map((i) => i.path)

  test.each(rutas)('%s no muestra texto interno', async (ruta) => {
    expect(TITULOS).toHaveProperty([ruta])
    await abrirRuta(ruta, SESION[rol])
    expectSinTextoInterno()
  })
})

describe('actualización mensual', () => {
  test('mientras corre y con el resultado del 31/10', async () => {
    corteDeOctubreEnBorrador()
    let soltar
    server.use(
      http.post(`${API_URL}/ciclos/`, async () => {
        await new Promise((r) => {
          soltar = r
        })
        return undefined
      }),
    )
    await abrirRuta('/ciclo', ANALISTA)
    await userEvent.click(screen.getByRole('button', { name: 'Ejecutar actualización mensual' }))
    const progreso = await screen.findByRole('region', { name: 'Actualizando los estados de las obligaciones…' })
    expectSinTextoInterno(progreso)
    await waitFor(() => expect(soltar).toBeTypeOf('function'))
    soltar()
    await screen.findByText(/Actualización mensual completada: 10 obligaciones actualizadas/)
    expect(screen.getByRole('table', { name: 'Cambios aplicados' })).toBeInTheDocument()
    expectSinTextoInterno()
  })

  test('con rechazos y revisiones', async () => {
    server.use(...cicloConRechazosYRevisiones())
    await abrirRuta('/ciclo', ANALISTA)
    await userEvent.click(screen.getByRole('button', { name: 'Ejecutar actualización mensual' }))
    await screen.findByRole('table', { name: 'Cambios rechazados' })
    expect(screen.getAllByText('Revisar').length).toBeGreaterThan(0)
    expectSinTextoInterno()
  })

  test('resultado de un ciclo anterior', async () => {
    await abrirRuta('/ciclo', ANALISTA)
    await userEvent.click(screen.getByRole('button', { name: 'Ver el resultado del corte 30/09/2026' }))
    await screen.findByRole('table', { name: 'Cambios aplicados' })
    expectSinTextoInterno()
  })
})

describe('obligaciones: panel de detalle', () => {
  test.each(['2258-7731', '2259-1092', '2257-4156', '2260-5543', '2250-0987', '2261-8820'])('obligación %s', async (numero) => {
    await abrirRuta('/obligaciones', ANALISTA)
    await userEvent.click(await screen.findByRole('button', { name: `Ver el detalle de la obligación ${numero}` }))
    const panel = await screen.findByRole('dialog', { name: `Obligación ${numero}` })
    await within(panel).findByText('Línea de tiempo de estados')
    await terminoDeCargar()
    expectSinTextoInterno()
  })

  test('reestructurada y su obligación anterior', async () => {
    await renderConSesion('/obligaciones?obligacion=12', ...ANALISTA)
    const panel = await screen.findByRole('dialog', { name: 'Obligación 2271-5502' })
    await within(panel).findByText('Línea de tiempo de estados')
    expectSinTextoInterno()
    await userEvent.click(within(panel).getByRole('button', { name: 'Ver el detalle de la obligación 2255-7788' }))
    const anterior = await screen.findByRole('dialog', { name: 'Obligación 2255-7788' })
    await within(anterior).findByText('Línea de tiempo de estados')
    expectSinTextoInterno()
  })

  test('cierre sin fecha de pago', async () => {
    const cierre = db.obligaciones.find((o) => o.numero === '2259-1092').cierre
    Object.assign(db.obligaciones.find((o) => o.numero === '2259-1092'), { cierre: { ...cierre, fecha_pago: null } })
    await renderConSesion('/obligaciones?obligacion=3', ...ANALISTA)
    const panel = await screen.findByRole('dialog', { name: 'Obligación 2259-1092' })
    await within(panel).findByText(/Falta la fecha de pago/)
    expectSinTextoInterno()
  })
})

describe('reporte a TransUnion', () => {
  test('validaciones, archivo generado y resultados del cargue', async () => {
    await abrirRuta('/reporte', ANALISTA)
    await screen.findByRole('list', { name: 'Validaciones antes de generar' })
    await screen.findByRole('table', { name: 'Archivos generados' })
    expectSinTextoInterno()

    await userEvent.click(screen.getByRole('button', { name: 'Validar corte' }))
    await screen.findByText('Corte validado: ya puedes generar el archivo para TransUnion.')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Generar archivo para TransUnion' })).toBeEnabled())
    await userEvent.click(screen.getByRole('button', { name: 'Generar archivo para TransUnion' }))
    await screen.findByRole('region', { name: 'Archivo generado' })
    await screen.findByText('Archivo generado: SSRXXXXXX20260930 (no apto para envío).')
    expectSinTextoInterno()

    await userEvent.click(screen.getByRole('button', { name: 'Ver los resultados del archivo SSR00112320260831' }))
    await screen.findByRole('region', { name: 'Resultados del cargue · corte 31/08/2026' })
    expectSinTextoInterno()
  })

  test('un corte ya enviado', async () => {
    db.cortes = db.cortes.map((c) => (c.id === 2 ? { ...c, estado: 'ENVIADO', fecha_envio: '2026-10-03' } : c))
    await abrirRuta('/reporte', ANALISTA)
    await screen.findByText(/ya se envió a TransUnion/)
    expectSinTextoInterno()
  })
})

describe('refinanciaciones', () => {
  test('modal de registro con distintas obligaciones originales', async () => {
    await abrirRuta('/refinanciaciones', ANALISTA)
    await screen.findByRole('table', { name: 'Refinanciaciones registradas' })
    expectSinTextoInterno()
    await userEvent.click(screen.getByRole('button', { name: 'Registrar refinanciación' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Registrar refinanciación' })
    const select = await within(dialogo).findByLabelText('Obligación original')
    expectSinTextoInterno(dialogo)
    for (const opcion of within(select).getAllByRole('option').slice(1, 6)) {
      await userEvent.selectOptions(select, opcion)
      expectSinTextoInterno(dialogo)
    }
  })
})

describe('novedades urgentes', () => {
  test('modal de registro (eliminación y corrección) y gestión de la novedad creada', async () => {
    await abrirRuta('/novedades', ANALISTA)
    await userEvent.click(screen.getByRole('button', { name: /Registrar novedad/i }))
    const modal = await screen.findByRole('dialog', { name: 'Registrar novedad urgente' })
    expectSinTextoInterno(modal)
    await userEvent.selectOptions(within(modal).getByLabelText('Tipo de novedad'), 'Corrección')
    expectSinTextoInterno(modal)
    await userEvent.selectOptions(within(modal).getByLabelText('Tipo de novedad'), 'Eliminación')
    expectSinTextoInterno(modal)
    await userEvent.type(within(modal).getByLabelText(/Número de obligación o identificación/i), '2299-8800')
    await userEvent.selectOptions(within(modal).getByLabelText(/Motivo de la eliminación/i), '14')
    await userEvent.type(within(modal).getByLabelText('Motivo'), 'Cierre por error de facturación')
    await userEvent.click(within(modal).getByRole('button', { name: 'Registrar novedad' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await screen.findByText('2299-8800')
    expectSinTextoInterno()

    await userEvent.click(screen.getByRole('button', { name: 'Gestionar novedad 2299-8800' }))
    const gestion = await screen.findByRole('dialog', { name: /Gestionar en Actualización en Línea/i })
    expectSinTextoInterno(gestion)
  })

  test('gestión de una actualización pendiente', async () => {
    await abrirRuta('/novedades', ANALISTA)
    await userEvent.click(screen.getByRole('button', { name: 'Gestionar novedad 2260-5543' }))
    const gestion = await screen.findByRole('dialog', { name: /Gestionar en Actualización en Línea/i })
    expectSinTextoInterno(gestion)
  })
})

describe('reclamos', () => {
  test('lista y modal de registro', async () => {
    await abrirRuta('/reclamos', ANALISTA)
    await screen.findByRole('table', { name: 'Reclamos de Habeas Data registrados' })
    expectSinTextoInterno()
    await userEvent.click(screen.getByRole('button', { name: 'Registrar reclamo' }))
    const modal = screen.getByRole('dialog', { name: 'Registrar reclamo' })
    await within(modal).findByRole('option', { name: /^2258-7731 · / })
    expectSinTextoInterno(modal)
  })
})

describe('homologación y entidad', () => {
  test('fila en edición de un estado sin homologar y de uno homologado', async () => {
    await abrirRuta('/homologacion-estados', ADMIN)
    await screen.findByRole('table', { name: 'Estados del sistema comercial' })
    expectSinTextoInterno()
    const botones = screen.getAllByRole('button', { name: /^Editar la homologación del estado / })
    for (const boton of [botones[0], botones.at(-1)]) {
      await userEvent.click(boton)
      expectSinTextoInterno()
      await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    }
  })

  test('datos de la entidad', async () => {
    await abrirRuta('/entidad', ADMIN)
    await screen.findByRole('button', { name: 'Guardar datos' })
    expectSinTextoInterno()
  })
})
