// Pantalla 12 · Reporte a TransUnion, parte 1 (RF20, RF21, RF22, RF51, RF53, RF57). Corte del mock:
// el 30/09/2026 (corte 2, en BORRADOR) con su actualización mensual; el último enviado es el 31/08/2026.
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { API_URL } from '../lib/config'
import { ESPERA_REVOCAR_MS } from '../features/report/reportService'
import { forzarErrorCorrectivo } from '../mocks/datos/validaciones'
import { db } from '../mocks/db'
import { server } from '../mocks/server'
import { renderConSesion } from './renderApp'
import { detalleCorrectivas, detalleSinRegistro2, estadisticos, noReportados } from './escenarios/resultadosTU'

const ANALISTA = ['jperez@example.com', 'Analista123']

const abrir = async () => {
  await renderConSesion('/reporte', ...ANALISTA)
  await screen.findByRole('heading', { name: 'Reporte a TransUnion', level: 1 })
  await screen.findByRole('list', { name: 'Validaciones antes de generar' })
  await screen.findByRole('table', { name: 'Archivos generados' })
}
const editar = (numero, cambios) => Object.assign(db.obligaciones.find((o) => o.numero === numero), cambios)
const item = (titulo) => within(screen.getByRole('list', { name: 'Validaciones antes de generar' })).getByText(titulo).closest('li')
const boton = (nombre) => screen.getByRole('button', { name: nombre })
const validarYGenerar = async () => {
  await userEvent.click(boton('Validar corte'))
  await screen.findByText('Corte validado: ya puedes generar el archivo plano.')
  await waitFor(() => expect(boton('Generar archivo plano')).toBeEnabled())
  await userEvent.click(boton('Generar archivo plano'))
}

describe('pantalla 12 · validaciones (RF53)', () => {
  test('muestra el corte, el aviso de entidad y el checklist con su nivel', async () => {
    await abrir()
    expect(screen.getByRole('region', { name: 'Parámetros del reporte' })).toHaveTextContent('30 de septiembre de 2026Último corte · BORRADOR')
    expect(screen.getByRole('region', { name: 'Parámetros del reporte' })).toHaveTextContent('Nombre: SSRXXXXXX20260930')
    expect(screen.getByText(/TransUnion aún no asigna los datos de la entidad/)).toHaveTextContent('no aptos para envío')
    expect(item('Actualización mensual del corte')).toHaveTextContent('(Pasó)RF10RF11Ejecutada el 30/09/2026 10:02 por Juan Pérez.')
    // RF21: compara con el último corte enviado.
    expect(item('Obligaciones del último corte')).toHaveTextContent('9 de 9 obligaciones activas del último corte incluidas.')
    // RF22: los dos cierres del corte están completos.
    expect(item('Campos de cierre (RF22)')).toHaveTextContent('(Pasó)RF222 cierres con saldo, mora y cuota en cero')
    // RF51: informativo y por confirmar. RF57: la entidad con relleno solo advierte.
    expect(item('Valores en miles de pesos (RF51)')).toHaveTextContent('(Informativa)RF51por confirmar')
    expect(item('Datos de la entidad (RF57)')).toHaveTextContent('(Advertencia)RF57')
    expect(boton('Validar corte')).toBeEnabled()
  })

  test('una omisión frente al último corte bloquea y enlaza a la obligación (RF21)', async () => {
    server.use(
      http.get(`${API_URL}/extracciones/2/validaciones/`, () =>
        HttpResponse.json({
          corte_id: 2, fecha_corte: '2026-09-30', estado_corte: 'BORRADOR', puede_generar: false,
          resultados: [
            {
              regla: 'OMISION_VS_ULTIMO_CORTE', titulo: 'Obligaciones del último corte', nivel: 'correctiva', rf: ['RF21'], por_confirmar: false,
              detalle: '8 de 9 obligaciones activas del último corte incluidas.',
              obligaciones: [{ obligacion_id: 4, numero_obligacion: '2260-5543', campo: null, mensaje: 'Estaba activa en el último corte enviado y no está en este.' }],
            },
          ],
        }),
      ),
    )
    await abrir()
    const omision = item('Obligaciones del último corte')
    expect(omision).toHaveTextContent('(Bloquea)RF218 de 9 obligaciones activas del último corte incluidas.')
    expect(within(omision).getByRole('link', { name: '2260-5543' })).toHaveAttribute('href', '/obligaciones?obligacion=4')
    expect(boton('Validar corte')).toBeDisabled()
    expect(screen.getByText('Corrige las validaciones en rojo para poder validar el corte y generar el archivo.')).toBeInTheDocument()
  })

  test('un cierre sin fecha de pago o con cuota es correctivo (RF22)', async () => {
    editar('2259-1092', { cierre: { ...db.obligaciones[2].cierre, fecha_pago: null } })
    editar('2255-7788', { cuota: 5000 })
    await abrir()
    const cierre = item('Campos de cierre (RF22)')
    expect(cierre).toHaveTextContent('(Bloquea)')
    expect(within(cierre).getByRole('link', { name: '2259-1092' }).closest('li')).toHaveTextContent('2259-1092fecha_pago · Falta la fecha de pago del cierre.')
    expect(within(cierre).getByRole('link', { name: '2255-7788' }).closest('li')).toHaveTextContent('valor_cuota · La cuota debe ser 0 al cerrar.')
    expect(boton('Validar corte')).toBeDisabled()
  })

  test('valores de $9.000 y de $120 millones dan advertencia (RF51)', async () => {
    editar('2257-4156', { cuota: 9000, saldo: 120000000, valor_inicial: 150000000 })
    await abrir()
    const rango = item('Valores fuera de rango')
    expect(rango).toHaveTextContent('(Advertencia)')
    expect(rango).toHaveTextContent('La cuota es de $9.000: está fuera de $10.000 a $99.000.000.')
    expect(rango).toHaveTextContent('El saldo es de $120.000.000')
    expect(boton('Validar corte')).toBeEnabled()
  })

  test('identificación faltante y número de 21 caracteres bloquean; saldo mayor que el inicial informa (RF53)', async () => {
    forzarErrorCorrectivo(2)
    editar('2262-3318', { numero: '2262-3318-REFINANC-01' })
    editar('2257-4156', { valor_inicial: 1000000 })
    await abrir()
    expect(item('Campos obligatorios')).toHaveTextContent('(Bloquea)RF53Falta el tipo o el número de identificación.')
    expect(item('Números de obligación')).toHaveTextContent('(Bloquea)RF53Con más de 20 caracteres o caracteres no permitidos: 2262-3318-REFINANC-01.')
    expect(item('Saldo y valor inicial')).toHaveTextContent('(Informativa)')
    expect(item('Saldo y valor inicial')).toHaveTextContent('El saldo ($1.276.016) es mayor que el valor inicial ($1.000.000).')
    expect(boton('Validar corte')).toBeDisabled()
  })
})

describe('pantalla 12 · generar y descargar (RF20)', () => {
  test('valida, genera con los 6 pasos y muestra el archivo no apto con relleno (RF20, RF57)', async () => {
    await abrir()
    await validarYGenerar()
    const tarjeta = await screen.findByRole('region', { name: 'Archivo generado' })
    expect(screen.getByRole('region', { name: 'Generación del archivo completada' })).toHaveTextContent('redondeo por confirmar con TransUnion')
    expect(within(screen.getByRole('region', { name: 'Generación del archivo completada' })).getAllByRole('listitem')).toHaveLength(6)
    expect(tarjeta).toHaveTextContent('SSRXXXXXX20260930No apto para envío')
    expect(tarjeta).toHaveTextContent('No apto para envío: La entidad tiene datos con relleno (XXX): TransUnion lo rechazaría.')
    expect(tarjeta).toHaveTextContent('Obligaciones (registros 2)1113 registros con el 1 y el 9')
    expect(tarjeta).toHaveTextContent('No incluidas1Cerradas antes o eliminadas')
    // Como el mockup v3, con el redondeo de RF51 marcado por confirmar.
    expect(tarjeta).toHaveTextContent('Se reporta en miles: 21.864 redondeo por confirmar con TransUnion')
    expect(await screen.findByText('Archivo generado: SSRXXXXXX20260930 (no apto para envío).')).toBeInTheDocument()
    await waitFor(() => expect(within(screen.getByRole('table', { name: 'Archivos generados' })).getAllByRole('row')).toHaveLength(4))
    expect(screen.getByRole('region', { name: 'Parámetros del reporte' })).toHaveTextContent('Último corte · VALIDADO')
  })

  test('con los datos de la entidad, el archivo se llama SSR001123… y sale apto (RF57)', async () => {
    db.entidad = { ...db.entidad, tipo_entidad: '001', codigo_entidad: '123', codigo_sucursal: 'A1B2C3' }
    await abrir()
    expect(screen.queryByText(/TransUnion aún no asigna los datos de la entidad/)).not.toBeInTheDocument()
    await validarYGenerar()
    const tarjeta = await screen.findByRole('region', { name: 'Archivo generado' })
    expect(tarjeta).toHaveTextContent('SSR00112320260930Apto para envío')
    expect(within(tarjeta).queryByText(/No apto para envío/)).not.toBeInTheDocument()
  })

  test('un campo que no cabe en su posición no genera el archivo e indica la obligación y el campo (RF20)', async () => {
    editar('2262-3318', { titular: 'Centro Educativo Las Palmas de la Ciudad de San José de Cúcuta' })
    await abrir()
    await validarYGenerar()
    const alerta = await screen.findByText(/No se generó el archivo: hay campos que no caben en su posición\./)
    expect(alerta).toHaveTextContent('2262-3318 · nombre_titular: El nombre del titular tiene 62 caracteres y el campo admite 60.')
    expect(within(alerta).getByRole('link', { name: '2262-3318' })).toHaveAttribute('href', '/obligaciones?obligacion=6')
    expect(screen.queryByRole('region', { name: 'Archivo generado' })).not.toBeInTheDocument()
  })

  describe('descarga', () => {
    let crear, revocar, click
    beforeEach(() => {
      crear = vi.fn(() => 'blob:archivo')
      revocar = vi.fn()
      // jsdom no trae createObjectURL: se usa una subclase de URL que sí lo tiene, sin tocar la global.
      vi.stubGlobal('URL', class extends URL {
        static createObjectURL = crear
        static revokeObjectURL = revocar
      })
      click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    })
    afterEach(() => {
      vi.unstubAllGlobals()
      vi.restoreAllMocks()
    })

    test('pide texto, guarda con el nombre del servidor y revoca el enlace después', async () => {
      let accept = null
      server.events.on('request:start', ({ request }) => {
        if (request.url.includes('/descarga/')) accept = request.headers.get('accept')
      })
      const programar = vi.spyOn(globalThis, 'setTimeout')
      await abrir()
      await userEvent.click(boton('Descargar el archivo SSR00112320260831'))
      expect(await screen.findByText('Descarga iniciada: SSR00112320260831.txt.')).toBeInTheDocument()
      server.events.removeAllListeners()
      expect(accept).toBe('text/plain, */*')
      expect(crear).toHaveBeenCalledWith(expect.any(Blob))
      expect(click).toHaveBeenCalled()
      // El enlace no se revoca en el mismo instante del clic, sino después de ESPERA_REVOCAR_MS.
      expect(revocar).not.toHaveBeenCalled()
      const [revocarDespues] = programar.mock.calls.find(([, ms]) => ms === ESPERA_REVOCAR_MS)
      revocarDespues()
      expect(revocar).toHaveBeenCalledWith('blob:archivo')
    })

    test('si falla, muestra el mensaje del servidor', async () => {
      server.use(http.get(`${API_URL}/archivos/1/descarga/`, () => HttpResponse.json({ detail: 'Archivo no encontrado.' }, { status: 404 })))
      await abrir()
      await userEvent.click(boton('Descargar el archivo SSR00112320260831'))
      expect(await screen.findByText('No se pudo descargar el archivo. Archivo no encontrado.')).toBeInTheDocument()
      expect(click).not.toHaveBeenCalled()
    })

    test('cada descarga tiene su propio indicador', async () => {
      let soltar
      const pendiente = new Promise((r) => (soltar = r))
      let llego = false
      server.use(
        http.get(`${API_URL}/archivos/2/descarga/`, async () => {
          llego = true
          await pendiente
        }),
      )
      await abrir()
      await userEvent.click(boton('Descargar el archivo SSRXXXXXX20260930'))
      await waitFor(() => expect(llego).toBe(true))
      await userEvent.click(boton('Descargar el archivo SSR00112320260831'))
      expect(await screen.findByText('Descarga iniciada: SSR00112320260831.txt.')).toBeInTheDocument()
      // Terminó la del 31/08, pero la del 30/09 sigue en curso.
      expect(boton('Descargar el archivo SSRXXXXXX20260930')).toHaveAttribute('aria-busy', 'true')
      expect(boton('Descargar el archivo SSR00112320260831')).not.toHaveAttribute('aria-busy')
      soltar()
      expect(await screen.findByText('Descarga iniciada: SSRXXXXXX20260930.txt.')).toBeInTheDocument()
    })
  })
})

describe('pantalla 12 · estados', () => {
  test('con el corte ya enviado explica que no admite otro archivo y que las correcciones van por RF55', async () => {
    db.cortes = db.cortes.filter((c) => c.id === 1)
    await abrir()
    expect(screen.getByRole('region', { name: 'Parámetros del reporte' })).toHaveTextContent('Último corte · ENVIADO')
    expect(screen.getByText('Este corte ya se envió a TransUnion y no admite otro archivo. Las correcciones de un corte ya enviado se registran como «Corrección» en Novedades Urgentes (RF55).')).toBeInTheDocument()
    expect(boton('Generar archivo plano')).toBeDisabled()
  })

  test('sin cortes lo dice y enlaza a la extracción', async () => {
    db.cortes = []
    await renderConSesion('/reporte', ...ANALISTA)
    expect(await screen.findByText(/Aún no hay cortes/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir a Extracción de Cartera' })).toHaveAttribute('href', '/extraccion')
  })

  test('muestra la carga y, si fallan las validaciones o los archivos, el error con «Reintentar»', async () => {
    let fallar = true
    server.use(
      http.get(`${API_URL}/extracciones/2/validaciones/`, () => (fallar ? HttpResponse.json({ detail: 'x' }, { status: 503 }) : undefined)),
      http.get(`${API_URL}/archivos/`, () => (fallar ? HttpResponse.json({ detail: 'x' }, { status: 503 }) : undefined)),
    )
    await renderConSesion('/reporte', ...ANALISTA)
    expect(await screen.findByRole('status', { name: 'Cargando el corte' })).toBeInTheDocument()
    expect(await screen.findByText(/^No se pudo cargar el corte\./)).toBeInTheDocument()
    expect(await screen.findByText(/^No se pudieron cargar los archivos\./)).toBeInTheDocument()
    fallar = false
    for (const b of screen.getAllByRole('button', { name: 'Reintentar' })) await userEvent.click(b)
    expect(await screen.findByRole('list', { name: 'Validaciones antes de generar' })).toBeInTheDocument()
    expect(await screen.findByRole('table', { name: 'Archivos generados' })).toBeInTheDocument()
  })
})

describe('pantalla 12 · envío y resultados del cargue (RF54)', () => {
  // El archivo del 31/08 (id 1) ya enviado y sin resultados: muestra «Cargar resultados».
  const sinResultados = () => {
    delete db.resultadosCargue[1]
    db.archivos.find((a) => a.id === 1).tiene_resultados = false
    db.cortes.find((c) => c.id === 1).estado = 'ENVIADO'
  }
  const cargar = async (...archivos) => {
    await userEvent.click(boton('Cargar los resultados del archivo SSR00112320260831'))
    const modal = await screen.findByRole('dialog', { name: 'Cargar resultados de TransUnion' })
    await userEvent.upload(within(modal).getByLabelText('Archivos de resultado'), archivos)
    await userEvent.click(within(modal).getByRole('button', { name: 'Cargar resultados' }))
    return modal
  }

  test('cada archivo ofrece su acción: ver resultados, o requiere los datos de la entidad si no es apto', async () => {
    await abrir()
    const tabla = screen.getByRole('table', { name: 'Archivos generados' })
    expect(within(tabla).getByRole('button', { name: 'Ver los resultados del archivo SSR00112320260831' })).toBeInTheDocument()
    // Con resultados también se puede volver a cargar (los archivos de TransUnion que lleguen después).
    expect(within(tabla).getByRole('button', { name: 'Cargar los resultados del archivo SSR00112320260831' })).toBeInTheDocument()
    expect(within(tabla).getByText('SSRXXXXXX20260930').closest('tr')).toHaveTextContent('Requiere los datos de la entidad')
    expect(within(tabla).queryByRole('button', { name: /Registrar el envío/ })).not.toBeInTheDocument()
  })

  test('registra el envío del archivo apto y después deja cargar sus resultados', async () => {
    db.entidad = { ...db.entidad, tipo_entidad: '001', codigo_entidad: '123', codigo_sucursal: 'A1B2C3' }
    await abrir()
    await validarYGenerar()
    await screen.findByText('Archivo generado: SSR00112320260930.')
    // La versión anterior (no apta) del mismo corte ya no se envía: no pide los datos de la entidad.
    await waitFor(() => expect(within(screen.getByRole('table', { name: 'Archivos generados' })).getAllByRole('row')).toHaveLength(4))
    expect(screen.getByText('SSRXXXXXX20260930').closest('tr')).not.toHaveTextContent('Requiere los datos de la entidad')
    await userEvent.click(await screen.findByRole('button', { name: 'Registrar el envío del archivo SSR00112320260930' }))
    // Es irreversible: pide la fecha (hoy, por defecto) y la confirmación.
    const dialogo = await screen.findByRole('dialog', { name: 'Registrar envío a TransUnion' })
    expect(within(dialogo).getByText('30/09/2026')).toBeInTheDocument()
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar envío' }))
    expect(await screen.findByText('Envío registrado. Cuando TransUnion responda, carga aquí sus archivos de resultados.')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Cargar los resultados del archivo SSR00112320260930' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('region', { name: 'Parámetros del reporte' })).toHaveTextContent('Último corte · ENVIADO'))
    expect(within(screen.getByRole('region', { name: 'Archivo generado' })).getByText('Enviado')).toBeInTheDocument()
  })

  test('las correctivas se asocian a la obligación y el corte queda ENVIADO_CON_INCONSISTENCIAS', async () => {
    sinResultados()
    await abrir()
    await cargar(detalleCorrectivas('2026-08-31', [{ numero: '2258-7731', codigo: '707', descripcion: 'VALOR DE MORA ES REQUERIDO' }]))
    expect(await screen.findByText('Resultados cargados: 9 registros cargados, 1 inconsistencia.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const vista = await screen.findByRole('region', { name: 'Resultados del cargue · corte 31/08/2026' })
    expect(within(vista).getByRole('list', { name: 'Resumen del cargue del corte 31/08/2026' })).toHaveTextContent('10Registros recibidos9Cargados1Con inconsistencias0No reportadas (R)')
    const fila = within(vista).getByRole('link', { name: '2258-7731' }).closest('tr')
    expect(within(vista).getByRole('link', { name: '2258-7731' })).toHaveAttribute('href', '/obligaciones?obligacion=2')
    expect(fila).toHaveTextContent('Correctiva707 · VALOR DE MORA ES REQUERIDO')
    expect(db.cortes.find((c) => c.id === 1).estado).toBe('ENVIADO_CON_INCONSISTENCIAS')
    expect(await screen.findByRole('button', { name: 'Ver los resultados del archivo SSR00112320260831' })).toBeInTheDocument()
  })

  test('sin correctivas el corte queda ENVIADO; el norep marca la obligación como no reportada', async () => {
    sinResultados()
    db.cortes.find((c) => c.id === 1).estado = 'ENVIADO_CON_INCONSISTENCIAS'
    await abrir()
    await cargar(estadisticos('2026-08-31'), noReportados('2026-08-31', ['2260-5543']))
    const vista = await screen.findByRole('region', { name: 'Resultados del cargue · corte 31/08/2026' })
    expect(within(vista).getByRole('list', { name: 'Resumen del cargue del corte 31/08/2026' })).toHaveTextContent('10Registros recibidos10Cargados1Con inconsistencias1No reportadas (R)')
    expect(within(vista).getByRole('link', { name: '2260-5543' }).closest('tr')).toHaveTextContent('No reportadaR · Obligación no reportada')
    expect(db.cortes.find((c) => c.id === 1).estado).toBe('ENVIADO')
  })

  test('un archivo de otro corte o con otra estructura se rechaza con el motivo y no se guarda nada', async () => {
    sinResultados()
    await abrir()
    const modal = await cargar(detalleCorrectivas('2026-07-31', []))
    expect(await within(modal).findByText('El archivo Detalle_Inco_CSR_001_123_Correctivas_20260731.txt es del corte 31/07/2026, no del 31/08/2026.')).toBeInTheDocument()
    await userEvent.upload(within(modal).getByLabelText('Archivos de resultado'), [detalleSinRegistro2('2026-08-31')])
    await userEvent.click(within(modal).getByRole('button', { name: 'Cargar resultados' }))
    expect(await within(modal).findByText(/no tiene la estructura esperada \(línea 2: no trae el registro tipo 2/)).toBeInTheDocument()
    expect(db.resultadosCargue[1]).toBeUndefined()
    expect(db.cortes.find((c) => c.id === 1).estado).toBe('ENVIADO')
  })

  test('sin archivos elegidos pide al menos uno', async () => {
    sinResultados()
    await abrir()
    await userEvent.click(boton('Cargar los resultados del archivo SSR00112320260831'))
    const modal = await screen.findByRole('dialog', { name: 'Cargar resultados de TransUnion' })
    await userEvent.click(within(modal).getByRole('button', { name: 'Cargar resultados' }))
    expect(within(modal).getByRole('alert')).toHaveTextContent('Selecciona al menos un archivo de resultados.')
    expect(within(modal).getByLabelText('Archivos de resultado')).toHaveAttribute('aria-invalid', 'true')
  })

  test('mientras se cargan los resultados no se puede cancelar', async () => {
    sinResultados()
    let soltar
    const pendiente = new Promise((r) => (soltar = r))
    let llego = false
    server.use(
      http.post(`${API_URL}/archivos/1/resultados/`, async () => {
        llego = true
        await pendiente
      }),
    )
    await abrir()
    const modal = await cargar(estadisticos('2026-08-31'))
    await waitFor(() => expect(llego).toBe(true))
    expect(within(modal).getByRole('button', { name: 'Cancelar' })).toBeDisabled()
    await userEvent.keyboard('{Escape}')
    expect(screen.getByRole('dialog', { name: 'Cargar resultados de TransUnion' })).toBeInTheDocument()
    soltar()
    expect(await screen.findByRole('region', { name: 'Resultados del cargue · corte 31/08/2026' })).toBeInTheDocument()
  })

  test('ver resultados muestra el cargue guardado y, si falla, el error con «Reintentar»', async () => {
    let fallar = true
    server.use(http.get(`${API_URL}/archivos/1/resultados/`, () => (fallar ? HttpResponse.json({ detail: 'x' }, { status: 503 }) : undefined)))
    await abrir()
    await userEvent.click(boton('Ver los resultados del archivo SSR00112320260831'))
    expect(await screen.findByText(/^No se pudieron cargar los resultados de SSR00112320260831\./)).toBeInTheDocument()
    fallar = false
    await userEvent.click(boton('Reintentar'))
    const vista = await screen.findByRole('region', { name: 'Resultados del cargue · corte 31/08/2026' })
    expect(vista).toHaveTextContent('Archivos de respuesta de TransUnion cargados el 05/09/2026 14:00 (RF54)')
    expect(within(vista).getByRole('table', { name: 'Inconsistencias del cargue del corte 31/08/2026' }).querySelectorAll('tbody tr')).toHaveLength(2)
  })
})
