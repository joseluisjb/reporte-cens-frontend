// Extracción de cartera y ciclo de corte (RF1–RF5, RF7, RF44): servicio + mapper contra los mocks, que
// siguen el contrato 0.4 y el manual de TransUnion (sector Servicios). Ver docs/contrato/DISCREPANCIAS.md.
// Se fija la fecha de HOY en 2026-10-10 (solo `Date`: con todos los temporizadores falsos, MSW y axios se cuelgan).
import { login } from '../features/auth/authService'
import { edadMoraDesdeDias } from '../features/extraction/catalogosTU'
import { mapCorte, mapCorteFieldErrors, mapCorteValidado, mapObligacionCorte } from '../features/extraction/extractionMapper'
import { generateCut, getCut, getLatestCut, listCutObligations, listCuts, registerSubmission, validateCut } from '../features/extraction/extractionService'
import { updateConceptGroup } from '../features/parameters/parametersService'
import { api, ENDPOINTS } from '../lib/api'
import { mapPagina } from '../lib/api/pagina'
import { generarObligaciones, OBLIGACIONES_SIN_FECHA_LIMITE, totalesCorte } from '../mocks/datos/obligaciones'
import { forzarErrorCorrectivo, validarCorte } from '../mocks/datos/validaciones'
import { db } from '../mocks/db'
import { leerPaginacion } from '../mocks/rutas/extracciones'
import { hoyLocalISO } from '../mocks/utilidades'

const entrarAdmin = () => login('rmartinez@cens.com.co', 'Admin12345')
const entrarAnalista = () => login('jperez@cens.com.co', 'Analista123')
const ids = (cortes) => cortes.map((c) => c.id)
const corteDb = (id) => db.cortes.find((c) => c.id === id)
const CLAVES_RESUMEN = ['id', 'fecha_corte', 'fecha_ejecucion', 'grupo', 'obligaciones', 'saldo_consolidado', 'estado', 'ejecutada_por']

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-10T12:00:00-05:00'))
})
afterEach(() => vi.useRealTimers())

describe('listar y consultar cortes', () => {
  test('la lista va del más reciente al más antiguo por fecha de ejecución y mapea el corte', async () => {
    await entrarAnalista()
    const cortes = await listCuts()
    expect(ids(cortes)).toEqual([2, 1])
    expect(cortes[0]).toEqual({
      id: 2,
      fechaCorte: '2026-09-30',
      fechaEjecucion: new Date('2026-10-01T07:40:00-05:00'),
      grupo: { id: 2, nombre: 'Solo cuota de energía' },
      totalObligaciones: 24,
      saldoConsolidado: totalesCorte({ id: 2 }).saldoConsolidado,
      estado: 'BORRADOR',
      ejecutadaPor: 'Juan Pérez',
      esBorrador: true,
      esValidado: false,
      esEnviado: false,
    })
    expect(cortes[1]).toMatchObject({ id: 1, estado: 'ENVIADO', esEnviado: true, esBorrador: false })
  })

  test('el orden sale de fecha_ejecucion, no del id', async () => {
    await entrarAdmin()
    corteDb(1).fecha_ejecucion = '2026-10-05T09:00:00-05:00'
    expect(ids(await listCuts())).toEqual([1, 2])
    expect((await getLatestCut()).id).toBe(1)
  })

  test('la lista excluye los ANULADO, pero el detalle sí los entrega', async () => {
    await entrarAdmin()
    corteDb(1).estado = 'ANULADO'
    expect(ids(await listCuts())).toEqual([2])
    expect((await getCut(1)).estado).toBe('ANULADO')
    corteDb(2).estado = 'ANULADO'
    expect(await listCuts()).toEqual([])
    expect(await getLatestCut()).toBeNull() // todos anulados = no hay último
  })

  test('CorteResumen sale con las claves en el orden del contrato', async () => {
    await entrarAdmin()
    const { data } = await api.get(ENDPOINTS.extraccion(1))
    expect(Object.keys(data)).toEqual(CLAVES_RESUMEN)
    expect(data.grupo).toEqual({ id: 1, nombre: 'Energía financiada' })
  })

  test('getLatestCut devuelve el más reciente y null si no hay cortes (204 sin cuerpo)', async () => {
    await entrarAnalista()
    expect((await getLatestCut()).id).toBe(2)
    db.cortes = []
    expect(await getLatestCut()).toBeNull()
    const res = await api.get(ENDPOINTS.extraccionUltima)
    expect(res.status).toBe(204)
    expect(await listCuts()).toEqual([])
  })

  test('getCut: corte inexistente o id no numérico → 404 "Corte no encontrado."', async () => {
    await entrarAnalista()
    await expect(getCut(999)).rejects.toMatchObject({ status: 404, message: 'Corte no encontrado.' })
    for (const malo of ['abc', '1.5', '-1']) {
      await expect(getCut(malo)).rejects.toMatchObject({ status: 404, message: 'Corte no encontrado.' })
      await expect(validateCut(malo)).rejects.toMatchObject({ status: 404 })
      await expect(registerSubmission(malo)).rejects.toMatchObject({ status: 404 })
      await expect(listCutObligations(malo)).rejects.toMatchObject({ status: 404 })
    }
  })

  test('el grupo del corte es una foto: renombrar el grupo no reescribe el historial', async () => {
    await entrarAdmin()
    await updateConceptGroup(1, { nombre: 'Grupo renombrado' })
    expect((await getCut(1)).grupo).toEqual({ id: 1, nombre: 'Energía financiada' })
    const nuevo = await generateCut({ fechaCorte: '2026-09-30', grupoId: 1 }) // reemplaza el BORRADOR
    expect(nuevo.grupo).toEqual({ id: 1, nombre: 'Grupo renombrado' })
  })

  test('sin sesión todas las funciones responden 401', async () => {
    for (const llamada of [
      () => listCuts(),
      () => getLatestCut(),
      () => getCut(1),
      () => generateCut({ fechaCorte: '2026-10-05' }),
      () => validateCut(2),
      () => registerSubmission(2),
      () => listCutObligations(1),
    ]) {
      await expect(llamada()).rejects.toMatchObject({ status: 401 })
    }
  })
})

describe('generar un corte', () => {
  test('errores de campo en español, con los nombres de campo del formulario', async () => {
    await entrarAnalista()
    const falta = await generateCut({ fechaCorte: undefined }).catch((e) => e)
    expect(falta).toMatchObject({ status: 400, fieldErrors: { fecha_corte: 'Selecciona una fecha de corte.' } })
    expect(mapCorteFieldErrors(falta.fieldErrors)).toEqual({ fechaCorte: 'Selecciona una fecha de corte.' })

    for (const mala of ['30/09/2026', '2026-02-30', '2026-9-3', 'hoy', 20260930]) {
      await expect(generateCut({ fechaCorte: mala })).rejects.toMatchObject({ status: 400, fieldErrors: { fecha_corte: 'La fecha de corte no es válida.' } })
    }
    for (const malo of [0, -1, 1.5, 'abc', true]) {
      const e = await generateCut({ fechaCorte: '2026-10-05', grupoId: malo }).catch((x) => x)
      expect(e).toMatchObject({ status: 400, fieldErrors: { grupo_id: 'El grupo de conceptos no es válido.' } })
      expect(mapCorteFieldErrors(e.fieldErrors)).toEqual({ grupoId: 'El grupo de conceptos no es válido.' })
    }
  })

  test('una fecha futura responde 400 con detail', async () => {
    await entrarAnalista()
    await expect(generateCut({ fechaCorte: '2099-01-01' })).rejects.toMatchObject({ status: 400, message: 'La fecha de corte no puede ser futura.', fieldErrors: {} })
  })

  test('grupo inexistente → 404 y grupo inactivo → 409', async () => {
    await entrarAnalista()
    await expect(generateCut({ fechaCorte: '2026-10-05', grupoId: 999 })).rejects.toMatchObject({ status: 404, message: 'Grupo no encontrado.' })
    await expect(generateCut({ fechaCorte: '2026-10-05', grupoId: 3 })).rejects.toMatchObject({ status: 409, message: 'El grupo está inactivo.' })
  })

  test('hay otro BORRADOR con distinta fecha → 409 con la fecha en el texto', async () => {
    await entrarAnalista()
    await expect(generateCut({ fechaCorte: '2026-10-05' })).rejects.toMatchObject({
      status: 409,
      message: 'Ya existe un corte en BORRADOR con fecha 2026-09-30. Debe completarlo o eliminarlo primero.',
    })
  })

  test('misma fecha de un corte que no es BORRADOR → 409 (no hay reemplazo)', async () => {
    await entrarAnalista()
    await expect(generateCut({ fechaCorte: '2026-08-31' })).rejects.toMatchObject({
      status: 409,
      message: 'Ya existe un corte con esa fecha en un estado que no permite reemplazo.',
    })
  })

  test('A9: la fecha debe ser posterior a la del último corte ENVIADO (409 si es menor)', async () => {
    await entrarAnalista()
    db.cortes = db.cortes.filter((c) => c.id !== 2) // sin BORRADOR; queda solo el corte 1, ENVIADO el 2026-08-31
    await expect(generateCut({ fechaCorte: '2026-08-15' })).rejects.toMatchObject({
      status: 409,
      message: 'La fecha de corte debe ser posterior a la del último corte enviado.',
    })
    const ok = await generateCut({ fechaCorte: '2026-09-01' }) // el día siguiente sí vale
    expect(ok).toMatchObject({ id: 3, fechaCorte: '2026-09-01', estado: 'BORRADOR' })
  })

  test('un BORRADOR de la misma fecha se reemplaza y conserva el id', async () => {
    await entrarAdmin()
    const nuevo = await generateCut({ fechaCorte: '2026-09-30', grupoId: 1 })
    expect(nuevo).toMatchObject({ id: 2, estado: 'BORRADOR', grupo: { id: 1, nombre: 'Energía financiada' }, ejecutadaPor: 'Rosa Martínez' })
    expect(nuevo.fechaEjecucion).toEqual(new Date('2026-10-10T12:00:00-05:00'))
    expect(db.cortes).toHaveLength(2)
    expect(db.siguienteCorteId).toBe(3) // no se gastó un id
  })

  test('sin grupo (omitido o null) usa todos los conceptos reportables: grupo null', async () => {
    await entrarAnalista()
    const { data } = await api.post(ENDPOINTS.extracciones, { fecha_corte: '2026-09-30' }) // reemplaza el BORRADOR, sin grupo_id
    expect(data).toMatchObject({ id: 2, grupo: null, ejecutada_por: 'Juan Pérez' })
    expect(Object.keys(data)).toEqual(CLAVES_RESUMEN)
    expect(await generateCut({ fechaCorte: '2026-09-30', grupoId: null })).toMatchObject({ id: 2, grupo: null })
  })
})

describe('ciclo del corte: BORRADOR, VALIDADO y ENVIADO', () => {
  test('ciclo completo', async () => {
    await entrarAnalista()

    // No se puede enviar un BORRADOR.
    await expect(registerSubmission(2)).rejects.toMatchObject({ status: 409, message: 'El corte no está en estado VALIDADO.' })

    // Validar: BORRADOR → VALIDADO con advertencias que no bloquean.
    const validado = await validateCut(2)
    expect(validado.corte).toMatchObject({ id: 2, estado: 'VALIDADO', esValidado: true, esBorrador: false })
    expect(validado.advertencias.length).toBeGreaterThanOrEqual(1)
    expect(validado.advertencias).toContainEqual({ regla: 'SIN_FECHA_LIMITE_PAGO', mensaje: 'No se encontró una factura con fecha de vencimiento.' })
    expect(validado.advertencias.every((a) => a.regla && a.mensaje)).toBe(true)
    expect((await getCut(2)).estado).toBe('VALIDADO')

    // Validar de nuevo: ya no es BORRADOR.
    await expect(validateCut(2)).rejects.toMatchObject({ status: 409, message: 'El corte no está en estado BORRADOR.' })

    // Fecha de envío futura o con mal formato.
    await expect(registerSubmission(2, { fechaEnvio: '2099-01-01' })).rejects.toMatchObject({ status: 400, message: 'La fecha de envío no puede ser futura.' })
    const malaFecha = await registerSubmission(2, { fechaEnvio: '10/10/2026' }).catch((e) => e)
    expect(malaFecha).toMatchObject({ status: 400, fieldErrors: { fecha_envio: 'La fecha de envío no es válida.' } })
    expect(mapCorteFieldErrors(malaFecha.fieldErrors)).toEqual({ fechaEnvio: 'La fecha de envío no es válida.' })
    expect(corteDb(2).estado).toBe('VALIDADO')

    // Registrar el envío con fecha.
    const enviado = await registerSubmission(2, { fechaEnvio: '2026-10-09' })
    expect(enviado).toMatchObject({ id: 2, estado: 'ENVIADO', esEnviado: true })
    expect(corteDb(2).fecha_envio).toBe('2026-10-09') // CorteResumen no trae fecha_envio: se mira en la base
    await expect(registerSubmission(2)).rejects.toMatchObject({ status: 409 })

    // Con el corte enviado: la misma fecha ya no se puede reemplazar...
    await expect(generateCut({ fechaCorte: '2026-09-30' })).rejects.toMatchObject({
      status: 409,
      message: 'Ya existe un corte con esa fecha en un estado que no permite reemplazo.',
    })
    // ...una fecha anterior al último enviado tampoco (A9)...
    await expect(generateCut({ fechaCorte: '2026-09-15' })).rejects.toMatchObject({
      status: 409,
      message: 'La fecha de corte debe ser posterior a la del último corte enviado.',
    })
    // ...y una posterior (y ya pasada) genera un BORRADOR nuevo, sin grupo.
    const nuevo = await generateCut({ fechaCorte: '2026-10-05' })
    expect(nuevo).toMatchObject({ id: 3, fechaCorte: '2026-10-05', estado: 'BORRADOR', grupo: null, ejecutadaPor: 'Juan Pérez' })
    expect(ids(await listCuts())).toEqual([3, 2, 1]) // el nuevo se ejecutó "hoy": el más reciente
    expect((await getLatestCut()).id).toBe(3)
  })

  test('registrar el envío sin fecha usa la de hoy', async () => {
    await entrarAdmin()
    await validateCut(2)
    const enviado = await registerSubmission(2)
    expect(enviado.estado).toBe('ENVIADO')
    expect(corteDb(2).fecha_envio).toBe(hoyLocalISO())
  })

  test('un error correctivo bloquea la validación: 409 con la lista en err.datos.errores y el corte sigue en BORRADOR', async () => {
    await entrarAnalista()
    forzarErrorCorrectivo(2)
    const err = await validateCut(2).catch((e) => e)
    expect(err).toMatchObject({ status: 409, message: 'El corte tiene errores correctivos que deben resolverse.', fieldErrors: {} })
    expect(err.datos.errores).toHaveLength(1)
    expect(err.datos.errores[0]).toEqual({ regla: 'SIN_IDENTIFICACION', mensaje: 'Falta el tipo o el número de identificación' })
    expect((await getCut(2)).estado).toBe('BORRADOR')
    expect(corteDb(2).estado).toBe('BORRADOR')
  })

  test('ambos roles pueden generar, validar y registrar el envío', async () => {
    await entrarAdmin()
    expect((await generateCut({ fechaCorte: '2026-09-30' })).ejecutadaPor).toBe('Rosa Martínez')
    expect((await validateCut(2)).corte.estado).toBe('VALIDADO')
    await entrarAnalista()
    expect((await registerSubmission(2)).estado).toBe('ENVIADO')
    expect((await generateCut({ fechaCorte: '2026-10-05' })).ejecutadaPor).toBe('Juan Pérez')
  })

  test('validar un corte ya ENVIADO → 409 "no está en estado BORRADOR"', async () => {
    await entrarAnalista()
    await expect(validateCut(1)).rejects.toMatchObject({ status: 409, message: 'El corte no está en estado BORRADOR.' })
  })
})

describe('obligaciones del corte', () => {
  test('total 24 y paginación con limite y desplazamiento, ordenadas por número de obligación', async () => {
    await entrarAnalista()
    const primera = await listCutObligations(2)
    expect(primera.total).toBe(24)
    expect(primera.items).toHaveLength(20) // limite por defecto
    const segunda = await listCutObligations(2, { desplazamiento: 20 })
    expect(segunda.items).toHaveLength(4)
    const todas = [...primera.items, ...segunda.items].map((o) => o.numeroObligacion)
    expect(todas).toEqual(todas.toSorted())
    expect(new Set(todas).size).toBe(24)

    const medio = await listCutObligations(2, { limite: 5, desplazamiento: 5 })
    expect(medio.total).toBe(24)
    expect(medio.items.map((o) => o.numeroObligacion)).toEqual(todas.slice(5, 10))
    expect((await listCutObligations(2, { desplazamiento: 30 })).items).toEqual([])
  })

  test('limite 500 se recorta a 100 (cabe todo) y los parámetros inválidos dan 400', async () => {
    await entrarAnalista()
    expect((await listCutObligations(1, { limite: 500 })).items).toHaveLength(24)
    expect(leerPaginacion(new URLSearchParams('limite=500'))).toEqual({ limite: 100, desplazamiento: 0 })
    expect(leerPaginacion(new URLSearchParams('limite=100&desplazamiento=3'))).toEqual({ limite: 100, desplazamiento: 3 })
    expect(leerPaginacion(new URLSearchParams(''))).toEqual({ limite: 20, desplazamiento: 0 })

    const noEnteros = 'Los parámetros limite y desplazamiento deben ser enteros.'
    const fueraDeRango = 'El límite debe ser mayor que 0 y el desplazamiento no puede ser negativo.'
    const casos = [
      [{ limite: 'abc' }, noEnteros],
      [{ limite: '1.5' }, noEnteros],
      [{ limite: '' }, noEnteros],
      [{ desplazamiento: 'x' }, noEnteros],
      [{ limite: 0 }, fueraDeRango],
      [{ limite: -1 }, fueraDeRango],
      [{ desplazamiento: -1 }, fueraDeRango],
    ]
    for (const [params, mensaje] of casos) {
      const e = await api.get(ENDPOINTS.obligacionesCorte(1), { params }).catch((x) => x)
      expect(e, JSON.stringify(params)).toMatchObject({ status: 400, message: mensaje })
    }
    expect(leerPaginacion(new URLSearchParams('limite=abc'))).toEqual({ error: noEnteros })
    expect(leerPaginacion(new URLSearchParams('limite=0&desplazamiento=x'))).toEqual({ error: noEnteros }) // no enteros gana
  })

  test('el mapper nunca entrega la identificación completa', async () => {
    await entrarAnalista()
    const { data } = await api.get(ENDPOINTS.obligacionesCorte(2), { params: { limite: 100 } })
    expect(data.resultados[0].numero_identificacion).toMatch(/^10000000\d\d$/) // la API sí la trae completa (diferencia Q)

    const { items } = await listCutObligations(2, { limite: 100 })
    expect(JSON.stringify(items)).not.toContain('10000000')
    for (const item of items) {
      expect(item.identificacion).toMatch(/^\*{6}\d{4}$/)
      expect(item).not.toHaveProperty('numeroIdentificacion')
    }
    expect(items[0]).toEqual({
      numeroObligacion: data.resultados[0].numero_obligacion,
      nombreTitular: 'TITULAR FICTICIO 01',
      identificacion: '******0001',
      estado: { codigo: '01', descripcion: 'Vigente' },
      edadMora: { codigo: '00', descripcion: 'Normal' },
      diasMora: 0,
      cuotasMora: 0,
      valorMora: 0,
      valorSaldo: data.resultados[0].valor_saldo,
      nCreditos: data.resultados[0].n_creditos,
    })
  })

  test('cada fila es coherente con el manual (edad de mora, saldadas, castigada)', async () => {
    await entrarAnalista()
    const { items } = await listCutObligations(2, { limite: 100 })
    for (const o of items) {
      expect(o.edadMora.codigo).toBe(edadMoraDesdeDias(o.diasMora))
      if (o.valorMora > 0) expect(o.cuotasMora).toBeGreaterThanOrEqual(1)
      expect(o.valorMora === 0).toBe(o.diasMora === 0)
      expect(o.valorMora).toBeLessThanOrEqual(o.valorSaldo)
    }
    const saldadas = items.filter((o) => o.estado.codigo === '02')
    expect(saldadas).toHaveLength(2)
    for (const o of saldadas) {
      expect(o.estado.descripcion).toBe('Saldada')
      expect(o).toMatchObject({ valorSaldo: 0, valorMora: 0, cuotasMora: 0, diasMora: 0, edadMora: { codigo: '00' } })
    }
    const castigadas = items.filter((o) => o.estado.codigo === '06')
    expect(castigadas).toHaveLength(1)
    expect(castigadas[0].diasMora).toBeGreaterThanOrEqual(30)
    expect(castigadas[0].valorMora).toBeGreaterThan(0)
  })
})

describe('datos generados de las obligaciones', () => {
  const corte = (id) => ({ id })

  test('son coherentes con el manual para cualquier corte y pasan la validación sin errores correctivos', () => {
    for (const id of [1, 2, 3, 4, 5, 57]) {
      const filas = generarObligaciones(corte(id))
      expect(filas).toHaveLength(24)
      expect(filas.map((f) => f.numero_obligacion)).toEqual(filas.map((f) => f.numero_obligacion).toSorted())
      for (const f of filas) {
        expect(Object.keys(f)).toEqual(['numero_obligacion', 'nombre_titular', 'numero_identificacion', 'estado_tu', 'edad_mora', 'dias_mora', 'cuotas_mora', 'valor_mora', 'valor_saldo', 'n_creditos'])
        expect(f.numero_obligacion).toMatch(/^FIC-\d{6}$/)
        expect(f.nombre_titular).toMatch(/^TITULAR FICTICIO \d\d$/)
        expect(f.numero_identificacion).toMatch(/^10000000\d\d$/)
        expect(f.edad_mora).toBe(edadMoraDesdeDias(f.dias_mora))
        expect(f.valor_mora === 0).toBe(f.dias_mora === 0)
        if (f.valor_mora > 0) expect(f.cuotas_mora).toBeGreaterThanOrEqual(1)
        expect(f.valor_mora).toBeLessThanOrEqual(f.valor_saldo)
        expect(f.n_creditos).toBeGreaterThanOrEqual(1)
        expect(f.n_creditos).toBeLessThanOrEqual(3)
        for (const v of [f.dias_mora, f.cuotas_mora, f.valor_mora, f.valor_saldo]) expect(Number.isInteger(v)).toBe(true)
      }
      expect(filas.filter((f) => f.estado_tu === '02')).toHaveLength(2)
      expect(filas.filter((f) => f.estado_tu === '06').every((f) => f.dias_mora >= 30 && f.valor_mora > 0)).toBe(true)
      expect(filas.some((f) => f.dias_mora > 0 && f.dias_mora < 30 && f.edad_mora === '00' && f.valor_mora > 0 && f.cuotas_mora >= 1)).toBe(true)
      expect(new Set(filas.map((f) => f.edad_mora)).size).toBeGreaterThanOrEqual(8) // recorre varios tramos de la Tabla 9

      const { errores, advertencias } = validarCorte(corte(id), filas)
      expect(errores).toEqual([])
      expect(advertencias.length).toBeGreaterThanOrEqual(1)
    }
  })

  test('el número de obligación es permanente entre cortes y los montos son estables por corte', () => {
    const numeros = (id) => generarObligaciones(corte(id)).map((f) => f.numero_obligacion)
    expect(numeros(1)).toEqual(numeros(2))
    expect(generarObligaciones(corte(2))).toEqual(generarObligaciones(corte(2)))
    expect(generarObligaciones(corte(1)).map((f) => f.valor_saldo)).not.toEqual(generarObligaciones(corte(2)).map((f) => f.valor_saldo))
    const { totalObligaciones, saldoConsolidado } = totalesCorte(corte(2))
    expect(totalObligaciones).toBe(24)
    expect(saldoConsolidado).toBe(generarObligaciones(corte(2)).reduce((s, f) => s + f.valor_saldo, 0))
  })

  test('las reglas correctivas detectan una obligación incoherente', () => {
    const base = generarObligaciones(corte(2))
    const saldadaConMora = base.map((f) => (f.estado_tu === '02' ? { ...f, valor_mora: 5000, edad_mora: '01', dias_mora: 31 } : f))
    expect(validarCorte(corte(2), saldadaConMora).errores.map((e) => e.regla)).toContain('SALDADA_CON_MORA')
    const sinValor = base.map((f, i) => (i === 0 ? { ...f, edad_mora: '03', valor_mora: 0 } : f))
    expect(validarCorte(corte(2), sinValor).errores.map((e) => e.regla)).toContain('EDAD_SIN_VALOR_MORA')
    expect(OBLIGACIONES_SIN_FECHA_LIMITE.size).toBe(1)
  })
})

describe('mappers', () => {
  const crudo = { id: 7, fecha_corte: '2026-09-30T00:00:00', fecha_ejecucion: null, grupo: null, obligaciones: 3, saldo_consolidado: 100, estado: 'ANULADO', ejecutada_por: null }

  test('mapCorte toma los 10 primeros caracteres de la fecha y tolera fecha_ejecucion y grupo en null', () => {
    expect(mapCorte(crudo)).toEqual({
      id: 7,
      fechaCorte: '2026-09-30',
      fechaEjecucion: null,
      grupo: null,
      totalObligaciones: 3,
      saldoConsolidado: 100,
      estado: 'ANULADO',
      ejecutadaPor: null,
      esBorrador: false,
      esValidado: false,
      esEnviado: false,
    })
  })

  test('mapCorteValidado separa el corte de las advertencias', () => {
    const r = mapCorteValidado({ ...crudo, estado: 'VALIDADO', advertencias: [{ regla: 'X', mensaje: 'Y' }] })
    expect(r.corte).toMatchObject({ id: 7, estado: 'VALIDADO', esValidado: true })
    expect(r.advertencias).toEqual([{ regla: 'X', mensaje: 'Y' }])
    expect(mapCorteValidado({ ...crudo, estado: 'VALIDADO' }).advertencias).toEqual([])
  })

  test('mapObligacionCorte traduce los códigos y tolera códigos desconocidos; mapPagina arma { items, total }', () => {
    const fila = { numero_obligacion: 'A-1', nombre_titular: 'TITULAR FICTICIO 99', numero_identificacion: '1000000099', estado_tu: '05', edad_mora: '14', dias_mora: 900, cuotas_mora: 30, valor_mora: 10, valor_saldo: 20, n_creditos: 1 }
    const o = mapObligacionCorte(fila)
    expect(o.estado).toEqual({ codigo: '05', descripcion: '05' })
    expect(o.edadMora).toEqual({ codigo: '14', descripcion: 'Mora 730' })
    expect(o.identificacion).toBe('******0099')
    expect(mapPagina({ total: 40, resultados: [fila] }, mapObligacionCorte)).toEqual({ items: [o], total: 40 })
  })
})
