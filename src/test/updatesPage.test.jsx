// Pantalla 14 · Novedades Urgentes, eliminadas y correcciones (RF24, RF50, RF55)
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { API_URL } from '../lib/config'
import { hoyISO } from '../lib/format'
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
    expect(screen.queryByRole('button', { name: /Abrir Actualización en Línea/i })).not.toBeInTheDocument()

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
    expect(within(modal).getByText(/Entra al módulo web/i)).toBeInTheDocument()

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

    // El selector lista los cortes enviados con su número de obligaciones (no «undefined»).
    const opciones = within(within(modal).getByLabelText(/Corte que se rectifica/i)).getAllByRole('option').map((o) => o.textContent)
    expect(opciones.some((o) => /^Corte 31\/08\/2026 · \d+ obligaciones$/.test(o))).toBe(true)
    expect(opciones.join(' ')).not.toMatch(/undefined/)

    await userEvent.type(within(modal).getByLabelText(/Número de obligación o identificación/i), '2258-7731')
    await userEvent.type(within(modal).getByLabelText('Motivo'), 'Ajuste de días de mora reportados')
    await userEvent.clear(within(modal).getByLabelText(/Campo a corregir/i))
    await userEvent.type(within(modal).getByLabelText(/Campo a corregir/i), 'dias_mora')
    await userEvent.type(within(modal).getByLabelText(/Valor corregido/i), '0')
    await userEvent.type(within(modal).getByLabelText(/Justificación de la corrección/i), 'Rectificación autorizada por cartera')

    await userEvent.click(within(modal).getByRole('button', { name: 'Registrar novedad' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getAllByText('Corrección')).toHaveLength(2)
    expect(screen.getAllByText(/Rectifica el corte 31\/08\/2026/)).toHaveLength(2)

    // Dos registros enlazados (contrato 0.9.2): la novedad sin datos del corte y su rectificación.
    const novedad = db.novedades[0]
    expect(novedad).toMatchObject({ tipo: 'CORRECCION', obligacion_id: 2, referencia: '2258-7731' })
    expect(novedad).not.toHaveProperty('corte_id')
    expect(db.rectificaciones[0]).toMatchObject({ novedad_id: novedad.id, obligacion_id: 2, corte_id: 1, campo: 'dias_mora', valor_corregido: '0', medio: 'ACTUALIZACION_LINEA' })
  })

  test('una corrección sobre un número que no existe marca el campo y no crea nada (RF55)', async () => {
    await abrir()
    await userEvent.click(screen.getByRole('button', { name: /Registrar novedad/i }))
    const modal = await screen.findByRole('dialog', { name: 'Registrar novedad urgente' })
    await userEvent.selectOptions(within(modal).getByLabelText('Tipo de novedad'), 'Corrección')
    await userEvent.type(within(modal).getByLabelText(/Número de obligación o identificación/i), '2270-1122')
    await userEvent.type(within(modal).getByLabelText('Motivo'), 'Ajuste')
    await userEvent.type(within(modal).getByLabelText(/Valor corregido/i), '0')
    await userEvent.type(within(modal).getByLabelText(/Justificación de la corrección/i), 'Prueba')
    await userEvent.click(within(modal).getByRole('button', { name: 'Registrar novedad' }))

    expect(await within(modal).findByText('Obligación no encontrada.')).toBeInTheDocument()
    expect(db.novedades).toHaveLength(3)
    expect(db.rectificaciones).toHaveLength(1)
  })

  test('si la rectificación falla, el reintento no duplica la novedad (RF55)', async () => {
    let fallar = true
    server.use(
      http.post(`${API_URL}/rectificaciones/`, () =>
        fallar ? HttpResponse.json({ detail: 'Error de servidor' }, { status: 503 }) : undefined,
      ),
    )
    await abrir()
    await userEvent.click(screen.getByRole('button', { name: /Registrar novedad/i }))
    const modal = await screen.findByRole('dialog', { name: 'Registrar novedad urgente' })
    await userEvent.selectOptions(within(modal).getByLabelText('Tipo de novedad'), 'Corrección')
    await userEvent.type(within(modal).getByLabelText(/Número de obligación o identificación/i), '2258-7731')
    await userEvent.type(within(modal).getByLabelText('Motivo'), 'Ajuste')
    await userEvent.type(within(modal).getByLabelText(/Valor corregido/i), '0')
    await userEvent.type(within(modal).getByLabelText(/Justificación de la corrección/i), 'Prueba')
    await userEvent.click(within(modal).getByRole('button', { name: 'Registrar novedad' }))
    expect(await within(modal).findByRole('alert')).toBeInTheDocument()
    expect(db.novedades).toHaveLength(4)

    fallar = false
    await userEvent.click(within(modal).getByRole('button', { name: 'Registrar novedad' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(db.novedades).toHaveLength(4)
    expect(db.rectificaciones[0].novedad_id).toBe(db.novedades[0].id)
    expect(screen.getByRole('button', { name: 'Todas (4)' })).toBeInTheDocument()
  })

  test('un error por campo del servidor se muestra en su campo (motivo_eliminacion → motivo de la eliminación)', async () => {
    server.use(
      http.post(`${API_URL}/novedades/`, () =>
        HttpResponse.json({ motivo_eliminacion: ['Selecciona el motivo de la eliminación (Tabla 28).'] }, { status: 400 }),
      ),
    )
    await abrir()
    await userEvent.click(screen.getByRole('button', { name: /Registrar novedad/i }))
    const modal = await screen.findByRole('dialog', { name: 'Registrar novedad urgente' })
    await userEvent.selectOptions(within(modal).getByLabelText('Tipo de novedad'), 'Eliminación')
    await userEvent.selectOptions(within(modal).getByLabelText(/Motivo de la eliminación/i), '14')
    await userEvent.type(within(modal).getByLabelText(/Número de obligación o identificación/i), '2299-8800')
    await userEvent.type(within(modal).getByLabelText('Motivo'), 'Prueba')
    await userEvent.click(within(modal).getByRole('button', { name: 'Registrar novedad' }))
    await waitFor(() =>
      expect(within(modal).getByLabelText(/Motivo de la eliminación/i)).toHaveAccessibleDescription('Selecciona el motivo de la eliminación (Tabla 28).'),
    )
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

describe('pantalla 14 · arreglos de la revisión', () => {
  test('gestionar manda la fecha del día y el modal se abre limpio para la siguiente novedad', async () => {
    await abrir()
    await userEvent.click(screen.getByRole('button', { name: 'Gestionar novedad 2260-5543' }))
    let modal = await screen.findByRole('dialog', { name: /Gestionar en Actualización en Línea/i })
    await userEvent.type(within(modal).getByLabelText(/Número de confirmación de TransUnion/i), 'TU-AL-001999')
    await userEvent.click(within(modal).getByRole('button', { name: 'Marcar como gestionada' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(db.novedades.find((n) => n.id === 1).fecha_gestion).toBe(hoyISO())

    await userEvent.click(screen.getByRole('button', { name: 'Gestionar novedad 2258-7731' }))
    modal = await screen.findByRole('dialog', { name: /Gestionar en Actualización en Línea/i })
    expect(within(modal).getByLabelText(/Número de confirmación de TransUnion/i)).toHaveValue('')

    // También después de Cancelar
    await userEvent.type(within(modal).getByLabelText(/Número de confirmación de TransUnion/i), 'TU-AL-000001')
    await userEvent.click(within(modal).getByRole('button', { name: 'Cancelar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Gestionar novedad 2258-7731' }))
    modal = await screen.findByRole('dialog', { name: /Gestionar en Actualización en Línea/i })
    expect(within(modal).getByLabelText(/Número de confirmación de TransUnion/i)).toHaveValue('')
  })

  test('el error por campo del servidor se ve completo en el campo, no solo su primera letra', async () => {
    server.use(
      http.post(`${API_URL}/novedades/:id/gestionar/`, () =>
        HttpResponse.json({ numero_transaccion_tu: ['Ingresa el número de transacción de TransUnion.'] }, { status: 400 }),
      ),
    )
    await abrir()
    await userEvent.click(screen.getByRole('button', { name: 'Gestionar novedad 2260-5543' }))
    const modal = await screen.findByRole('dialog', { name: /Gestionar en Actualización en Línea/i })
    await userEvent.type(within(modal).getByLabelText(/Número de confirmación de TransUnion/i), 'X')
    await userEvent.click(within(modal).getByRole('button', { name: 'Marcar como gestionada' }))
    expect(await within(modal).findByText('Ingresa el número de transacción de TransUnion.')).toBeInTheDocument()
  })

  test('una novedad rechazada muestra el motivo del rechazo, no «Gestionada» (RF24, flujo alterno)', async () => {
    db.novedades[2] = { ...db.novedades[2], estado: 'RECHAZADA', numero_transaccion_tu: null, motivo_rechazo: 'El módulo en línea rechazó la transacción por datos del titular.' }
    await abrir()
    const fila = within(screen.getByRole('table', { name: 'Novedades registradas' })).getByText('2262-3318').closest('tr')
    expect(within(fila).getByText('Rechazada')).toBeInTheDocument()
    expect(within(fila).getByText('El módulo en línea rechazó la transacción por datos del titular.')).toBeInTheDocument()
    expect(within(fila).queryByText('Gestionada')).not.toBeInTheDocument()
  })

  test('gestionar una eliminación agrega la obligación a la tabla de eliminadas (RF50)', async () => {
    db.novedades.unshift({ ...db.novedades[0], id: 9, tipo: 'ELIMINACION', obligacion_id: 2, referencia: '2258-7731', motivo_eliminacion: { codigo: '14', descripcion: 'Por error entidad' } })
    await abrir()
    // Hay dos novedades pendientes con 2258-7731; la primera es la eliminación (id 9).
    await userEvent.click(screen.getAllByRole('button', { name: 'Gestionar novedad 2258-7731' })[0])
    const modal = await screen.findByRole('dialog', { name: /Gestionar en Actualización en Línea/i })
    await userEvent.type(within(modal).getByLabelText(/Número de confirmación de TransUnion/i), 'TU-AL-002000')
    await userEvent.click(within(modal).getByRole('button', { name: 'Marcar como gestionada' }))
    // La tabla se vuelve a pedir: se busca de nuevo cuando termine de cargar.
    await waitFor(() => expect(within(screen.getByRole('table', { name: 'Obligaciones eliminadas' })).getByText('2258-7731')).toBeInTheDocument())
    expect(within(screen.getByRole('table', { name: 'Obligaciones eliminadas' })).getByText('TU-AL-002000')).toBeInTheDocument()
  })

  test('la tabla de eliminadas tiene su propio estado de carga y de error, con reintento', async () => {
    let fallar = true
    server.use(
      http.get(`${API_URL}/eliminaciones/`, () =>
        fallar ? HttpResponse.json({ detail: 'Error de servidor' }, { status: 503 }) : undefined,
      ),
    )
    await abrir()
    // Las novedades cargan aunque fallen las eliminaciones, y no se dice «No hay obligaciones eliminadas».
    expect(screen.getByRole('table', { name: 'Novedades registradas' })).toBeInTheDocument()
    expect(await screen.findByText(/Ocurrió un error en el servidor/i)).toBeInTheDocument()
    expect(screen.queryByText('No hay obligaciones eliminadas')).not.toBeInTheDocument()

    fallar = false
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar eliminaciones' }))
    expect(await screen.findByRole('table', { name: 'Obligaciones eliminadas' })).toBeInTheDocument()
  })
})
