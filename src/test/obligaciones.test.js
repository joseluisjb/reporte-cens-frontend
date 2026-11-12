// Servicios y mappers de la Iteración 2: obligaciones (pantalla 9), entidad (RF57) y catálogos.
// Datos: las 12 obligaciones del mockup v3 (mocks/datos/obligacionesIteracion2.js).
import { login } from '../features/auth/authService'
import { getEntity } from '../features/entity/entityService'
import { getObligation, getObligationsSummary, getObligationTimeline, listObligations } from '../features/obligations/obligationsService'
import { CATALOGOS, getCatalog } from '../features/transunion/catalogosService'
import { mapObligacionesFieldErrors } from '../features/obligations/obligationsMapper'
import { aDetalle, obligacionesIniciales } from '../mocks/datos/obligacionesIteracion2'
import { exigirSesion } from '../mocks/utilidades'

const comoAnalista = () => login('jperez@example.com', 'Analista123')
const comoAdmin = () => login('rmartinez@example.com', 'Admin12345')

describe('obligationsService', () => {
  test('listObligations entrega la página en camelCase, con la identificación enmascarada', async () => {
    await comoAnalista()
    const { items, total } = await listObligations()
    expect(total).toBe(12)
    const nueva = items.find((o) => o.numeroObligacion === '2263-9004')
    expect(nueva).toEqual({
      id: 10,
      numeroObligacion: '2263-9004',
      nombreTitular: 'Ferretería La Esquina',
      identificacion: '******0010',
      estado: { codigo: '01', descripcion: 'Vigente' },
      edadMora: { codigo: '00', descripcion: 'Normal' },
      diasMora: 0,
      cuotasMora: 0,
      valorMora: 0,
      valorSaldo: 1450000,
      cerrada: false,
      primerReporte: true,
      caducado: false,
      enReclamo: false,
      eliminada: false,
      requiereRevision: false,
    })
    for (const o of items) expect(o.identificacion).toMatch(/^\*+\d{4}$/)
  })

  test('listObligations manda los filtros con los nombres del contrato', async () => {
    await comoAnalista()
    expect((await listObligations({ estado: '06' })).items.map((o) => o.numeroObligacion)).toEqual(['2244-6410'])
    expect((await listObligations({ cuotasMoraMin: 2 })).total).toBe(5)
    expect((await listObligations({ q: '  ferretería ' })).total).toBe(1)
    expect((await listObligations({ eliminadas: true })).total).toBe(0)
    expect((await listObligations({ limite: 5, desplazamiento: 5 })).items).toHaveLength(5)
  })

  test('el Administrador recibe 403 en español (HU-B es solo del Analista)', async () => {
    await comoAdmin()
    await expect(listObligations()).rejects.toMatchObject({ status: 403 })
  })

  test('getObligationsSummary: con 12 obligaciones, las 4 agrupaciones de cuotas suman las abiertas (RF19)', async () => {
    await comoAnalista()
    const resumen = await getObligationsSummary()
    expect(resumen).toMatchObject({ fechaUltimoCiclo: '2026-09-30', total: 12, abiertas: 9, eliminadas: 0 })
    const { alDia, una, dosATres, cuatroOMas } = resumen.porCuotasMora
    expect(alDia + una + dosATres + cuatroOMas).toBe(resumen.abiertas)
    expect(resumen.porEstado[0]).toEqual({ estado: { codigo: '01', descripcion: 'Vigente' }, cantidad: 7 })
    expect(resumen.financiacionesNuevas[0]).toEqual({ numeroObligacion: '2265-2208', nombreTitular: 'Panadería La Espiga' })
  })

  test('getObligation: detalle de una obligación en mora (RF17, RF49) y de una cerrada (RF12, RF52)', async () => {
    await comoAnalista()
    const enMora = await getObligation(2)
    expect(enMora).toMatchObject({
      numeroObligacion: '2258-7731',
      concepto: { codigo: 3625, descripcion: 'Cuota financiación energía no regulados' },
      fechaExigibilidad: '2026-08-14',
      aniosMora: null,
      valorCuota: 70000,
      cierre: null,
    })
    expect(enMora.cuotasVencidas).toEqual([
      { fechaVencimiento: '2026-08-14', valorPendiente: 70000, dias: 47 },
      { fechaVencimiento: '2026-09-14', valorPendiente: 70000, dias: 16 },
    ])
    expect(enMora.posiblesTransiciones.find((r) => r.rf === 'RF14')).toMatchObject({ porConfirmar: true })

    const cerrada = await getObligation(3)
    expect(cerrada).toMatchObject({ cerrada: true, valorCuota: 0, valorCuotaAntesCierre: 85000 })
    expect(cerrada.cierre).toEqual({
      fechaCorte: '2026-09-30',
      fechaPago: '2026-09-12',
      modoExtincion: { codigo: '01', descripcion: 'Voluntario' },
      tipoPago: { codigo: '01', descripcion: 'Voluntario' },
    })
    expect(cerrada.pagos[0]).toMatchObject({ fechaCorte: '2026-09-30', valor: 170000 })
  })

  test('getObligation: refinanciación (RF18) enlaza la original y la nueva', async () => {
    await comoAnalista()
    expect((await getObligation(11)).refinanciadaEn).toEqual({ id: 12, numeroObligacion: '2271-5502' })
    expect((await getObligation(12)).reestructuracion).toEqual({
      numeroReestructuraciones: 1,
      naturaleza: { codigo: '07', descripcion: 'Otra', confirmado: false },
      obligacionAnterior: { id: 11, numeroObligacion: '2255-7788' },
    })
  })

  test('getObligation de una que no existe da 404 con el mensaje del contrato', async () => {
    await comoAnalista()
    await expect(getObligation(99)).rejects.toMatchObject({ status: 404, message: 'Obligación no encontrada.' })
  })

  test('getObligationTimeline: del evento más reciente al más antiguo, con estado y edad descritos', async () => {
    await comoAnalista()
    const eventos = await getObligationTimeline(8)
    expect(eventos[0]).toEqual({
      fecha: '2026-09-30',
      estado: { codigo: '06', descripcion: 'Castigada' },
      edadMora: { codigo: '08', descripcion: 'Mora 240' },
      descripcion: '240 días desde la cuota más antigua sin pagar',
    })
    expect(eventos.at(-1).fecha).toBe('2025-01-31')
  })
})

describe('entityService', () => {
  test.each([
    ['Analista', comoAnalista],
    ['Administrador', comoAdmin],
  ])('getEntity como %s entrega el marcador y el prefijo del archivo', async (_rol, entrar) => {
    await entrar()
    expect(await getEntity()).toEqual({
      tipoEntidad: 'XXX',
      codigoEntidad: 'XXX',
      codigoSucursal: 'XXXXXX',
      conMarcador: true,
      prefijoArchivo: 'SSRXXXXXX',
      actualizadoPor: null,
      fechaActualizacion: null,
    })
  })
})

describe('catalogosService', () => {
  test('getCatalog trae los códigos con su marca de confirmación', async () => {
    await comoAdmin()
    expect(await getCatalog(CATALOGOS.tiposPago)).toEqual([
      { codigo: '01', descripcion: 'Voluntario', confirmado: true },
      { codigo: '02', descripcion: 'No voluntario', confirmado: true },
    ])
    const modos = await getCatalog(CATALOGOS.modosExtincion)
    expect(modos.find((m) => m.codigo === '16')).toEqual({ codigo: '16', descripcion: 'Refinanciación', confirmado: true })
    expect((await getCatalog(CATALOGOS.tipologiasReclamo)).every((t) => !t.confirmado)).toBe(true)
  })
})

describe('reglas de la revisión del PR #43', () => {
  test('exigirSesion rechaza la forma vieja exigirSesion(true) en vez de dejar la ruta abierta', () => {
    expect(() => exigirSesion(true)).toThrow(TypeError)
  })

  test('mapObligacionesFieldErrors lleva los errores de los filtros a los nombres del servicio', () => {
    expect(mapObligacionesFieldErrors({ estado_tu: 'Estado no válido.', cuotas_mora_min: 'x' })).toMatchObject({ estado: 'Estado no válido.', cuotasMoraMin: 'x' })
  })

  test('en 04, 08, 10, 11 y 12 «Qué puede pasar» remite a las reglas de TransUnion, con «por confirmar»', () => {
    for (const estado of ['04', '08', '10', '11', '12']) {
      const [regla, ...resto] = aDetalle({ ...obligacionesIniciales()[0], estado }).posibles_transiciones
      expect(resto).toHaveLength(0)
      expect(regla).toMatchObject({ rf: 'RF48', por_confirmar: true })
      expect(regla.texto).toMatch(/reglas de TransUnion/)
    }
  })

  test('las obligaciones cerradas traen la cuota que tenían antes de cerrar (RF52)', () => {
    for (const o of obligacionesIniciales().filter((x) => ['02', '07'].includes(x.estado))) {
      expect(aDetalle(o).valor_cuota_antes_cierre, o.numero).toBeGreaterThan(0)
    }
  })
})
