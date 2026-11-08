// Pantalla 14 · Novedades Urgentes, eliminadas y correcciones (RF24, RF50, RF55)
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { API_URL } from '../lib/config'
import { eliminacionesIniciales, novedadesIniciales } from '../mocks/datos/novedades'
import { db } from '../mocks/db'
import { server } from '../mocks/server'
import { renderConSesion } from './renderApp'

const ANALISTA = ['jperez@example.com', 'Analista123']

const abrir = async () => {
  await renderConSesion('/novedades', ...ANALISTA)
  await screen.findByRole('heading', { name: 'Novedades Urgentes', level: 1 })
  await waitFor(() => expect(screen.queryByRole('status', { name: 'Cargando novedades' })).not.toBeInTheDocument())
}

describe('pantalla 14 · lista y navegación', () => {
  beforeEach(() => {
    db.novedades = novedadesIniciales()
    db.eliminaciones = eliminacionesIniciales()
  })

  test('muestra el encabezado, el aviso sobre Actualización en Línea y los contadores (RF24)', async () => {
    await abrir()

    // Encabezado y aviso
    expect(screen.getByRole('heading', { name: 'Novedades Urgentes', level: 1 })).toBeInTheDocument()
    expect(screen.getByText(/Las novedades urgentes no esperan al corte mensual/)).toBeInTheDocument()
    expect(screen.getAllByText(/Actualización en Línea/i).length).toBeGreaterThanOrEqual(1)

    // Botones de acción principales
    expect(screen.getByRole('button', { name: /Registrar novedad/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Abrir Actualización en Línea/i })).toBeInTheDocument()

    // Pestañas y contadores iniciales (3 novedades: 2 pendientes, 1 gestionada)
    expect(screen.getByRole('button', { name: 'Todas (3)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pendientes (2)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gestionadas (1)' })).toBeInTheDocument()

    // Tabla de novedades
    const tabla = screen.getByRole('table', { name: 'Novedades registradas' })
    expect(within(tabla).getAllByRole('row')).toHaveLength(4) // 1 cabecera + 3 datos

    // Novedad 1 (Actualización pendiente)
    expect(within(tabla).getByText('2260-5543')).toBeInTheDocument()
    expect(within(tabla).getByText(/Pago del titular posterior al corte/)).toBeInTheDocument()

    // Novedad 2 (Corrección con detalle de corte RF55)
    expect(within(tabla).getByText('2258-7731')).toBeInTheDocument()
    expect(within(tabla).getByText(/Rectifica el corte 31\/08\/2026/)).toBeInTheDocument()

    // Novedad 3 (Gestionada con número de confirmación)
    expect(within(tabla).getByText('2262-3318')).toBeInTheDocument()
    expect(within(tabla).getByText(/TU-AL-001532/)).toBeInTheDocument()
  })

  test('filtra por pestañas (Pendientes y Gestionadas)', async () => {
    await abrir()

    // Click en Pendientes
    await userEvent.click(screen.getByRole('button', { name: 'Pendientes (2)' }))
    let filas = within(screen.getByRole('table', { name: 'Novedades registradas' })).getAllByRole('row')
    expect(filas).toHaveLength(3) // 1 cabecera + 2 pendientes
    expect(screen.getByText('2260-5543')).toBeInTheDocument()
    expect(screen.getByText('2258-7731')).toBeInTheDocument()
    expect(screen.queryByText('2262-3318')).not.toBeInTheDocument()

    // Click en Gestionadas
    await userEvent.click(screen.getByRole('button', { name: 'Gestionadas (1)' }))
    filas = within(screen.getByRole('table', { name: 'Novedades registradas' })).getAllByRole('row')
    expect(filas).toHaveLength(2) // 1 cabecera + 1 gestionada
    expect(screen.getByText('2262-3318')).toBeInTheDocument()
    expect(screen.queryByText('2260-5543')).not.toBeInTheDocument()
    expect(screen.queryByText('2258-7731')).not.toBeInTheDocument()
  })

  test('muestra el error si falla la API y permite reintentar', async () => {
    let fallar = true
    server.use(
      http.get(`${API_URL}/novedades/`, () =>
        fallar ? HttpResponse.json({ detail: 'Error de servidor' }, { status: 503 }) : undefined,
      ),
    )

    await renderConSesion('/novedades', ...ANALISTA)
    expect(await screen.findByText(/Ocurrió un error en el servidor/i)).toBeInTheDocument()

    fallar = false
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('table', { name: 'Novedades registradas' })).toBeInTheDocument()
  })
})

describe('pantalla 14 · gestionar novedad en línea (RF24)', () => {
  beforeEach(() => {
    db.novedades = novedadesIniciales()
    db.eliminaciones = eliminacionesIniciales()
  })

  test('abre el modal con instrucciones de 3 pasos y valida confirmación requerida', async () => {
    await abrir()

    // Click en Gestionar en línea de la novedad 1 (2260-5543)
    const botonGestionar = screen.getByRole('button', { name: 'Gestionar novedad 2260-5543' })
    await userEvent.click(botonGestionar)

    const modal = await screen.findByRole('dialog', { name: /Gestionar en Actualización en Línea/i })
    expect(modal).toBeInTheDocument()
    expect(within(modal).getByText(/Abre el módulo web/i)).toBeInTheDocument()

    // Enviar vacío muestra error de validación
    const botonConfirmar = within(modal).getByRole('button', { name: 'Marcar como gestionada' })
    await userEvent.click(botonConfirmar)
    expect(await within(modal).findByText('Ingresa el número de confirmación de TransUnion.')).toBeInTheDocument()

    // Ingresar código de confirmación válido
    const inputConfirmacion = within(modal).getByLabelText(/Número de confirmación de TransUnion/i)
    await userEvent.type(inputConfirmacion, 'TU-AL-001999')
    await userEvent.click(botonConfirmar)

    // El modal se cierra y la novedad pasa a Gestionada
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByText(/TU-AL-001999/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gestionadas (2)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pendientes (1)' })).toBeInTheDocument()
  })
})

describe('pantalla 14 · registro de novedades (RF24, RF50, RF55)', () => {
  beforeEach(() => {
    db.novedades = novedadesIniciales()
    db.eliminaciones = eliminacionesIniciales()
  })

  test('abre el modal y valida campos obligatorios', async () => {
    await abrir()

    await userEvent.click(screen.getByRole('button', { name: /Registrar novedad/i }))
    const modal = await screen.findByRole('dialog', { name: 'Registrar novedad urgente' })

    const botonGuardar = within(modal).getByRole('button', { name: 'Registrar novedad' })
    await userEvent.click(botonGuardar)

    expect(await within(modal).findByText('Ingresa el número de obligación o la identificación del titular.')).toBeInTheDocument()
    expect(within(modal).getByText('Explica el motivo de la novedad.')).toBeInTheDocument()
  })

  test('permite registrar una novedad de tipo Eliminación con advertencia de exclusión (RF50)', async () => {
    await abrir()

    await userEvent.click(screen.getByRole('button', { name: /Registrar novedad/i }))
    const modal = await screen.findByRole('dialog', { name: 'Registrar novedad urgente' })

    // Seleccionar tipo Eliminación
    const selectTipo = within(modal).getByLabelText('Tipo de novedad')
    await userEvent.selectOptions(selectTipo, 'Eliminación')

    // Aparece el aviso de exclusión RF50
    expect(within(modal).getByText(/deja de reportarse/i)).toBeInTheDocument()

    // Aparece el selector de motivo de eliminación (Tabla 28)
    const selectMotivoElim = within(modal).getByLabelText(/Motivo de la eliminación/i)
    expect(selectMotivoElim).toBeInTheDocument()
    await userEvent.selectOptions(selectMotivoElim, '14')

    // Llenar campos requeridos
    const inputRef = within(modal).getByLabelText(/Número de obligación o identificación/i)
    await userEvent.type(inputRef, '2299-8800')

    const inputMotivo = within(modal).getByLabelText('Motivo')
    await userEvent.type(inputMotivo, 'Cierre por error de facturación CENS')

    // Guardar
    await userEvent.click(within(modal).getByRole('button', { name: 'Registrar novedad' }))

    // Modal se cierra y la novedad se agrega a la lista
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByText('2299-8800')).toBeInTheDocument()
    expect(screen.getByText('Eliminación')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Todas (4)' })).toBeInTheDocument()
  })

  test('permite registrar una novedad de tipo Corrección sobre corte enviado (RF55)', async () => {
    await abrir()

    await userEvent.click(screen.getByRole('button', { name: /Registrar novedad/i }))
    const modal = await screen.findByRole('dialog', { name: 'Registrar novedad urgente' })

    // Seleccionar tipo Corrección
    await userEvent.selectOptions(within(modal).getByLabelText('Tipo de novedad'), 'Corrección')

    // Se muestran campos de RF55
    expect(within(modal).getByLabelText(/Corte que se rectifica/i)).toBeInTheDocument()
    expect(within(modal).getByLabelText(/Medio de la rectificación/i)).toBeInTheDocument()
    expect(within(modal).getByLabelText(/Campo a corregir/i)).toBeInTheDocument()
    expect(within(modal).getByLabelText(/Valor corregido/i)).toBeInTheDocument()

    await userEvent.type(within(modal).getByLabelText(/Número de obligación o identificación/i), '2270-1122')
    await userEvent.type(within(modal).getByLabelText('Motivo'), 'Ajuste de días de mora reportados')
    await userEvent.clear(within(modal).getByLabelText(/Campo a corregir/i))
    await userEvent.type(within(modal).getByLabelText(/Campo a corregir/i), 'dias_mora')
    await userEvent.type(within(modal).getByLabelText(/Valor corregido/i), '0')
    await userEvent.type(within(modal).getByLabelText(/Justificación de la corrección/i), 'Rectificación autorizada por cartera')

    await userEvent.click(within(modal).getByRole('button', { name: 'Registrar novedad' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByText('2270-1122')).toBeInTheDocument()
    expect(screen.getAllByText('Corrección')).toHaveLength(2)
  })
})

describe('pantalla 14 · obligaciones eliminadas en TransUnion (RF50)', () => {
  beforeEach(() => {
    db.novedades = novedadesIniciales()
    db.eliminaciones = eliminacionesIniciales()
  })

  test('muestra la tabla de eliminaciones y permite reactivar con código de activación', async () => {
    await abrir()

    // Sección inferior de eliminaciones
    const tablaElim = screen.getByRole('table', { name: 'Obligaciones eliminadas' })
    expect(tablaElim).toBeInTheDocument()
    expect(within(tablaElim).getByText('2249-1180')).toBeInTheDocument()
    expect(within(tablaElim).getByText(/Por error entidad/)).toBeInTheDocument()

    // Click en botón Reactivar
    const botonReactivar = screen.getByRole('button', { name: 'Reactivar obligación 2249-1180' })
    await userEvent.click(botonReactivar)

    const modal = await screen.findByRole('dialog', { name: 'Reactivar obligación eliminada' })
    expect(within(modal).getByText(/Obligación: 2249-1180/)).toBeInTheDocument()

    // Validar código requerido
    const botonGuardar = within(modal).getByRole('button', { name: 'Reactivar obligación' })
    await userEvent.click(botonGuardar)
    expect(await within(modal).findByText('Ingresa el número de confirmación de activación de TransUnion.')).toBeInTheDocument()

    // Ingresar código de activación
    await userEvent.type(
      within(modal).getByLabelText(/Número de confirmación de activación de TransUnion/i),
      'TU-ACT-123456',
    )
    await userEvent.click(botonGuardar)

    // Se reactiva y muestra badge de reactivada
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(within(tablaElim).getByText(/Reactivada/)).toBeInTheDocument()
    expect(within(tablaElim).queryByRole('button', { name: /Reactivar/i })).not.toBeInTheDocument()
  })
})
