// Conceptos de energía (RF35) y grupos de conceptos (RF43): servicio + mapper contra los mocks,
// que reproducen lo que responde el backend real (ver docs/contrato/README.md, diferencias A, B, L, O, P).
import { login } from '../features/auth/authService'
import { api, ENDPOINTS } from '../lib/api'
import { mapConcepto, mapGrupo } from '../features/parameters/conceptMapper'
import {
  createConcept,
  createConceptGroup,
  deleteConceptGroup,
  getConceptGroup,
  listConceptGroups,
  listConcepts,
  setConceptActive,
  setConceptGroupActive,
  updateConcept,
  updateConceptGroup,
} from '../features/parameters/parametersService'

const entrarAdmin = () => login('rmartinez@cens.com.co', 'Admin12345')
const entrarAnalista = () => login('jperez@cens.com.co', 'Analista123')
const codigos = (lista) => lista.map((c) => c.codigo)
const SIN_PERMISO = { status: 403, message: 'No tienes permiso para realizar esta acción.' }

describe('conceptos de energía', () => {
  test('ambos roles listan los conceptos ordenados por código', async () => {
    await entrarAdmin()
    const comoAdmin = await listConcepts()
    expect(codigos(comoAdmin)).toEqual([30, 94, 9001, 9002])
    expect(comoAdmin[0]).toMatchObject({ codigo: 30, descripcion: 'CUOTA FINANCIACION ENERGIA', activo: true, estado: 'Activo', observacion: '', fechaCreacion: null })
    expect(comoAdmin[2].observacion).toBe('Dato ficticio')
    expect(comoAdmin[3]).toMatchObject({ activo: false, estado: 'Inactivo' })

    await entrarAnalista()
    expect(codigos(await listConcepts())).toEqual([30, 94, 9001, 9002])
  })

  test('el filtro activo devuelve activos o inactivos; sin filtro, todos', async () => {
    await entrarAdmin()
    expect(codigos(await listConcepts({ activo: true }))).toEqual([30, 94, 9001])
    expect(codigos(await listConcepts({ activo: false }))).toEqual([9002])
    expect(await listConcepts({ activo: undefined })).toHaveLength(4)
  })

  test('el filtro activo solo vale con "true" o "false" exactos; cualquier otro valor se ignora', async () => {
    await entrarAdmin()

    for (const valor of ['True', '1', 'si', '']) {
      const { data } = await api.get(ENDPOINTS.conceptos, { params: { activo: valor } })
      expect(data).toHaveLength(4)
    }
  })

  test('sin sesión responde 401', async () => {
    await expect(listConcepts()).rejects.toMatchObject({ status: 401 })
    await expect(createConcept({ codigo: 1, descripcion: 'X' })).rejects.toMatchObject({ status: 401 })
  })

  test('crear usa activo=true por defecto y el concepto aparece en la lista', async () => {
    await entrarAdmin()
    const creado = await createConcept({ codigo: 95, descripcion: '  CONCEPTO NUEVO  ', observacion: 'Ficticio' })
    expect(creado).toMatchObject({ codigo: 95, descripcion: 'CONCEPTO NUEVO', activo: true, estado: 'Activo', observacion: 'Ficticio' })
    expect(codigos(await listConcepts())).toEqual([30, 94, 95, 9001, 9002])
    expect(codigos(await listConcepts({ activo: true }))).toContain(95)
  })

  test('crear respeta activo=false y la respuesta tiene el orden { codigo, descripcion, activo, observacion }', async () => {
    await entrarAdmin()

    const { data, status } = await api.post(ENDPOINTS.conceptos, { codigo: 96, descripcion: 'Otro', activo: false })
    expect(status).toBe(201)
    expect(Object.keys(data)).toEqual(['codigo', 'descripcion', 'activo', 'observacion'])
    expect(data).toEqual({ codigo: 96, descripcion: 'Otro', activo: false, observacion: null })
  })

  test('un código repetido responde 409 con el mensaje del backend', async () => {
    await entrarAdmin()
    await expect(createConcept({ codigo: 30, descripcion: 'REPETIDO' })).rejects.toMatchObject({ status: 409, message: 'El código de concepto ya existe.' })
  })

  test('valida el código: 0, 10000 y faltante', async () => {
    await entrarAdmin()
    const rango = 'El código debe ser un número entero entre 1 y 9999.'
    await expect(createConcept({ codigo: 0, descripcion: 'X' })).rejects.toMatchObject({ status: 400, fieldErrors: { codigo: rango } })
    await expect(createConcept({ codigo: 10000, descripcion: 'X' })).rejects.toMatchObject({ status: 400, fieldErrors: { codigo: rango } })
    await expect(createConcept({ codigo: 1.5, descripcion: 'X' })).rejects.toMatchObject({ fieldErrors: { codigo: rango } })
    await expect(createConcept({ descripcion: 'X' })).rejects.toMatchObject({ status: 400, fieldErrors: { codigo: 'Ingresa el código del concepto.' } })
  })

  test('el código acepta enteros como texto de dígitos (como DRF) y rechaza decimales, booleanos y texto', async () => {
    await entrarAdmin()
    const creado = await createConcept({ codigo: '9100', descripcion: 'POR TEXTO' })
    expect(creado.codigo).toBe(9100)
    expect(typeof creado.codigo).toBe('number')
    await expect(createConcept({ codigo: ' 9101 ', descripcion: 'CON ESPACIOS' })).resolves.toMatchObject({ codigo: 9101 })
    const rango = 'El código debe ser un número entero entre 1 y 9999.'
    for (const malo of ['30.5', 30.5, true, 'abc', '0', '10000']) {
      await expect(createConcept({ codigo: malo, descripcion: 'X' })).rejects.toMatchObject({ status: 400, fieldErrors: { codigo: rango } })
    }
    await expect(createConcept({ codigo: '', descripcion: 'X' })).rejects.toMatchObject({ fieldErrors: { codigo: 'Ingresa el código del concepto.' } })
    await expect(createConcept({ codigo: '30', descripcion: 'X' })).rejects.toMatchObject({ status: 409 }) // "30" es el 30
  })

  test('valida la descripción: vacía y de más de 60 caracteres', async () => {
    await entrarAdmin()
    await expect(createConcept({ codigo: 97, descripcion: '' })).rejects.toMatchObject({ fieldErrors: { descripcion: 'Ingresa la descripción.' } })
    await expect(createConcept({ codigo: 97, descripcion: '   ' })).rejects.toMatchObject({ fieldErrors: { descripcion: 'Ingresa la descripción.' } })
    await expect(createConcept({ codigo: 97, descripcion: 'A'.repeat(61) })).rejects.toMatchObject({ fieldErrors: { descripcion: 'La descripción admite máximo 60 caracteres.' } })
    await expect(createConcept({ codigo: 97, descripcion: 'A'.repeat(60) })).resolves.toMatchObject({ codigo: 97 })
  })

  test('valida la observación (máximo 200) y el estado', async () => {
    await entrarAdmin()
    await expect(createConcept({ codigo: 98, descripcion: 'X', observacion: 'o'.repeat(201) })).rejects.toMatchObject({ fieldErrors: { observacion: 'La observación admite máximo 200 caracteres.' } })
    await expect(createConcept({ codigo: 98, descripcion: 'X', activo: 'si' })).rejects.toMatchObject({ fieldErrors: { activo: 'El estado debe ser verdadero o falso.' } })
    await expect(createConcept({ codigo: 98, descripcion: 'X', observacion: 'o'.repeat(200) })).resolves.toMatchObject({ codigo: 98 })
  })

  test('los errores de campo van antes que el 409 por código repetido', async () => {
    await entrarAdmin()
    await expect(createConcept({ codigo: 30, descripcion: '' })).rejects.toMatchObject({ status: 400 })
  })

  test('actualiza la descripción y activa o desactiva sin tocar lo demás', async () => {
    await entrarAdmin()
    const editado = await updateConcept(9001, { descripcion: 'DESCRIPCION NUEVA' })
    expect(editado).toMatchObject({ codigo: 9001, descripcion: 'DESCRIPCION NUEVA', activo: true, observacion: 'Dato ficticio' })

    expect(await setConceptActive(94, false)).toMatchObject({ codigo: 94, activo: false, estado: 'Inactivo' })
    expect(codigos(await listConcepts({ activo: false }))).toEqual([94, 9002])
    expect(await setConceptActive(94, true)).toMatchObject({ activo: true, estado: 'Activo' })

    expect(await updateConcept(30, { observacion: null })).toMatchObject({ observacion: '' })
    expect(await updateConcept(30, { observacion: 'Con nota' })).toMatchObject({ observacion: 'Con nota' })
  })

  test('actualizar valida los campos enviados', async () => {
    await entrarAdmin()
    await expect(updateConcept(30, { descripcion: '' })).rejects.toMatchObject({ status: 400, fieldErrors: { descripcion: 'Ingresa la descripción.' } })
    await expect(updateConcept(30, { observacion: 'o'.repeat(201) })).rejects.toMatchObject({ status: 400 })
  })

  test('actualizar un concepto que no existe responde 404', async () => {
    await entrarAdmin()
    await expect(updateConcept(5555, { activo: false })).rejects.toMatchObject({ status: 404, message: 'Concepto no encontrado.' })
    await expect(updateConcept('abc', { activo: false })).rejects.toMatchObject({ status: 404, message: 'Concepto no encontrado.' })
  })

  test('un PATCH vacío devuelve el concepto actual', async () => {
    await entrarAdmin()
    expect(await updateConcept(30, {})).toMatchObject({ codigo: 30, descripcion: 'CUOTA FINANCIACION ENERGIA', activo: true })
    expect(await updateConcept(30, { descripcion: undefined })).toMatchObject({ codigo: 30 })
  })

  test('el Analista puede leer pero no crear ni editar (403)', async () => {
    await entrarAnalista()
    await expect(listConcepts()).resolves.toHaveLength(4)
    await expect(createConcept({ codigo: 99, descripcion: 'X' })).rejects.toMatchObject(SIN_PERMISO)
    await expect(updateConcept(30, { descripcion: 'X' })).rejects.toMatchObject(SIN_PERMISO)
    await expect(setConceptActive(30, false)).rejects.toMatchObject(SIN_PERMISO)
    await entrarAdmin()
    expect(codigos(await listConcepts())).toEqual([30, 94, 9001, 9002]) // nada cambió
  })
})

describe('mapper de conceptos y grupos', () => {
  test('un concepto sin fecha_creacion (diferencia B) queda con fechaCreacion null', () => {
    const c = mapConcepto({ codigo: 30, descripcion: 'X', activo: true, observacion: null })
    expect(c).toEqual({ codigo: 30, descripcion: 'X', activo: true, estado: 'Activo', observacion: '', fechaCreacion: null })
  })

  test('un concepto con fecha_creacion la convierte en Date', () => {
    const c = mapConcepto({ codigo: 30, descripcion: 'X', activo: false, observacion: 'n', fecha_creacion: '2026-10-10T08:00:00-05:00' })
    expect(c.fechaCreacion).toBeInstanceOf(Date)
    expect(c.fechaCreacion.toISOString()).toBe('2026-10-10T13:00:00.000Z')
    expect(c).toMatchObject({ estado: 'Inactivo', observacion: 'n' })
  })

  test('un grupo conserva "creado" como texto YYYY-MM-DD', () => {
    const g = mapGrupo({ id: 1, nombre: 'G', activo: false, conceptos: [{ codigo: 30, descripcion: 'X', otro: 1 }], creado: '2026-10-01' })
    expect(g).toEqual({ id: 1, nombre: 'G', activo: false, estado: 'Inactivo', conceptos: [{ codigo: 30, descripcion: 'X' }], creado: '2026-10-01' })
    expect(mapGrupo({ id: 2, nombre: 'H', activo: true, conceptos: [] }).creado).toBeNull()
  })
})

describe('grupos de conceptos', () => {
  test('lista los grupos por id con sus conceptos (código y descripción) ordenados', async () => {
    await entrarAdmin()
    const grupos = await listConceptGroups()
    expect(grupos.map((g) => g.id)).toEqual([1, 2, 3])
    expect(grupos[0]).toEqual({
      id: 1,
      nombre: 'Energía financiada',
      activo: true,
      estado: 'Activo',
      conceptos: [
        { codigo: 30, descripcion: 'CUOTA FINANCIACION ENERGIA' },
        { codigo: 94, descripcion: 'INTERES FINANCIACION ENERGIA' },
      ],
      creado: '2026-10-01',
    })
    expect(grupos[2]).toMatchObject({ nombre: 'Grupo de prueba inactivo', estado: 'Inactivo', conceptos: [{ codigo: 9001, descripcion: 'CONCEPTO DE PRUEBA ACTIVO' }] })
  })

  test('devuelve el detalle de un grupo y 404 si no existe', async () => {
    await entrarAdmin()
    expect(await getConceptGroup(2)).toMatchObject({ id: 2, nombre: 'Solo cuota de energía', creado: '2026-10-03' })
    await expect(getConceptGroup(999)).rejects.toMatchObject({ status: 404, message: 'Grupo no encontrado.' })
    await expect(getConceptGroup('abc')).rejects.toMatchObject({ status: 404, message: 'Grupo no encontrado.' })
  })

  test('crear un grupo: queda activo, con fecha de hoy como texto y sale en la lista', async () => {
    await entrarAdmin()
    const grupo = await createConceptGroup({ nombre: '  Grupo nuevo  ', conceptos: [94, 30] })
    expect(grupo).toMatchObject({ id: 4, nombre: 'Grupo nuevo', activo: true, estado: 'Activo' })
    expect(grupo.conceptos.map((c) => c.codigo)).toEqual([30, 94]) // ordenados por código
    expect(typeof grupo.creado).toBe('string')
    expect(grupo.creado).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect((await listConceptGroups()).map((g) => g.id)).toEqual([1, 2, 3, 4])
    expect(await getConceptGroup(4)).toEqual(grupo)
  })

  test('valida nombre y conceptos', async () => {
    await entrarAdmin()
    await expect(createConceptGroup({ nombre: '', conceptos: [30] })).rejects.toMatchObject({ status: 400, fieldErrors: { nombre: 'Ingresa el nombre del grupo.' } })
    await expect(createConceptGroup({ nombre: 'N'.repeat(61), conceptos: [30] })).rejects.toMatchObject({ fieldErrors: { nombre: 'El nombre admite máximo 60 caracteres.' } })
    await expect(createConceptGroup({ nombre: 'G', conceptos: [] })).rejects.toMatchObject({ fieldErrors: { conceptos: 'Selecciona al menos un concepto.' } })
    await expect(createConceptGroup({ nombre: 'G' })).rejects.toMatchObject({ fieldErrors: { conceptos: 'Selecciona al menos un concepto.' } })
    await expect(createConceptGroup({ nombre: 'G', conceptos: [0] })).rejects.toMatchObject({ fieldErrors: { conceptos: 'Cada concepto debe ser un número entero entre 1 y 9999.' } })
    await expect(createConceptGroup({ nombre: 'G', conceptos: [30, 30] })).rejects.toMatchObject({ status: 400, fieldErrors: { conceptos: 'No repitas conceptos.' } })
  })

  test('los conceptos de un grupo aceptan enteros como texto y se guardan como números', async () => {
    await entrarAdmin()
    const grupo = await createConceptGroup({ nombre: 'Con textos', conceptos: ['30', 94] })
    expect(grupo.conceptos.map((c) => c.codigo)).toEqual([30, 94])
    const editado = await updateConceptGroup(grupo.id, { conceptos: [' 94 '] })
    expect(editado.conceptos.map((c) => c.codigo)).toEqual([94])
    await expect(createConceptGroup({ nombre: 'Repetidos', conceptos: ['30', 30] })).rejects.toMatchObject({ status: 400, fieldErrors: { conceptos: 'No repitas conceptos.' } })
    for (const malo of ['30.5', 30.5, true, 'abc', '']) {
      await expect(createConceptGroup({ nombre: 'Malo', conceptos: [30, malo] })).rejects.toMatchObject({ fieldErrors: { conceptos: 'Cada concepto debe ser un número entero entre 1 y 9999.' } })
    }
  })

  test('un concepto inactivo o inexistente responde 400 con el primer código ofensor', async () => {
    await entrarAdmin()
    await expect(createConceptGroup({ nombre: 'G', conceptos: [30, 9002] })).rejects.toMatchObject({ status: 400, message: 'El concepto 9002 no existe o no está activo.' })
    await expect(createConceptGroup({ nombre: 'G', conceptos: [30, 1234] })).rejects.toMatchObject({ status: 400, message: 'El concepto 1234 no existe o no está activo.' })
    await expect(createConceptGroup({ nombre: 'G', conceptos: [1234, 9002] })).rejects.toMatchObject({ message: 'El concepto 1234 no existe o no está activo.' })
    expect(await listConceptGroups()).toHaveLength(3)
  })

  test('un nombre repetido responde 409 (después de revisar los conceptos)', async () => {
    await entrarAdmin()
    await expect(createConceptGroup({ nombre: 'Energía financiada', conceptos: [30] })).rejects.toMatchObject({ status: 409, message: 'El nombre de grupo ya existe.' })
    await expect(createConceptGroup({ nombre: ' Energía financiada ', conceptos: [30] })).rejects.toMatchObject({ status: 409 })
    await expect(createConceptGroup({ nombre: 'Energía financiada', conceptos: [9002] })).rejects.toMatchObject({ status: 400 })
    // La comparación es exacta: otra capitalización es otro nombre.
    await expect(createConceptGroup({ nombre: 'energía financiada', conceptos: [30] })).resolves.toMatchObject({ id: 4 })
  })

  test('PATCH reemplaza la lista de conceptos y puede cambiar el nombre y el estado', async () => {
    await entrarAdmin()
    const g = await updateConceptGroup(1, { conceptos: [9001] })
    expect(g.conceptos).toEqual([{ codigo: 9001, descripcion: 'CONCEPTO DE PRUEBA ACTIVO' }])
    expect(g.nombre).toBe('Energía financiada')

    expect(await updateConceptGroup(1, { nombre: 'Renombrado' })).toMatchObject({ nombre: 'Renombrado', conceptos: [{ codigo: 9001, descripcion: 'CONCEPTO DE PRUEBA ACTIVO' }] })
    expect(await setConceptGroupActive(1, false)).toMatchObject({ activo: false, estado: 'Inactivo' })
    expect(await setConceptGroupActive(1, true)).toMatchObject({ activo: true, estado: 'Activo' })
  })

  test('PATCH: nombre de otro grupo → 409; el propio nombre → 200; conceptos inactivos → 400', async () => {
    await entrarAdmin()
    await expect(updateConceptGroup(2, { nombre: 'Energía financiada' })).rejects.toMatchObject({ status: 409, message: 'El nombre de grupo ya existe.' })
    await expect(updateConceptGroup(2, { nombre: 'Solo cuota de energía' })).resolves.toMatchObject({ id: 2 })
    await expect(updateConceptGroup(2, { conceptos: [30, 9002] })).rejects.toMatchObject({ status: 400, message: 'El concepto 9002 no existe o no está activo.' })
    await expect(updateConceptGroup(2, { conceptos: [] })).rejects.toMatchObject({ fieldErrors: { conceptos: 'Selecciona al menos un concepto.' } })
    await expect(updateConceptGroup(2, { conceptos: [30, 30] })).rejects.toMatchObject({ fieldErrors: { conceptos: 'No repitas conceptos.' } })
    expect((await getConceptGroup(2)).conceptos.map((c) => c.codigo)).toEqual([30]) // los rechazos no cambian nada
  })

  test('PATCH: grupo inexistente → 404 y cuerpo vacío → el grupo actual', async () => {
    await entrarAdmin()
    await expect(updateConceptGroup(999, { activo: false })).rejects.toMatchObject({ status: 404, message: 'Grupo no encontrado.' })
    expect(await updateConceptGroup(1, {})).toEqual(await getConceptGroup(1))
  })

  test('eliminar un grupo responde 204 y desaparece', async () => {
    await entrarAdmin()
    await expect(deleteConceptGroup(1)).resolves.toBeUndefined()
    await expect(getConceptGroup(1)).rejects.toMatchObject({ status: 404 })
    expect((await listConceptGroups()).map((g) => g.id)).toEqual([2, 3])
  })

  test('un grupo asociado a un corte en BORRADOR no se elimina (409)', async () => {
    await entrarAdmin()
    await expect(deleteConceptGroup(2)).rejects.toMatchObject({ status: 409, message: 'El grupo está asociado a un corte en estado BORRADOR.' })
    expect(await getConceptGroup(2)).toMatchObject({ id: 2 })
  })

  test('eliminar un grupo que no existe responde 404', async () => {
    await entrarAdmin()
    await expect(deleteConceptGroup(999)).rejects.toMatchObject({ status: 404, message: 'Grupo no encontrado.' })
  })

  test('el Analista puede listar y ver el detalle, pero no crear, editar ni eliminar (403)', async () => {
    await entrarAnalista()
    await expect(listConceptGroups()).resolves.toHaveLength(3)
    await expect(getConceptGroup(1)).resolves.toMatchObject({ id: 1 })
    await expect(createConceptGroup({ nombre: 'Nuevo', conceptos: [30] })).rejects.toMatchObject(SIN_PERMISO)
    await expect(updateConceptGroup(1, { nombre: 'Otro' })).rejects.toMatchObject(SIN_PERMISO)
    await expect(setConceptGroupActive(1, false)).rejects.toMatchObject(SIN_PERMISO)
    await expect(deleteConceptGroup(1)).rejects.toMatchObject(SIN_PERMISO)
  })

  test('sin sesión responde 401', async () => {
    await expect(listConceptGroups()).rejects.toMatchObject({ status: 401 })
    await expect(getConceptGroup(1)).rejects.toMatchObject({ status: 401 })
    await expect(deleteConceptGroup(1)).rejects.toMatchObject({ status: 401 })
  })
})

describe('persistencia de la base simulada', () => {
  test('los conceptos y grupos sobreviven a una recarga', async () => {
    await entrarAdmin()
    await createConcept({ codigo: 95, descripcion: 'CONCEPTO PERSISTIDO' })
    await updateConcept(9001, { descripcion: 'EDITADO' })
    await createConceptGroup({ nombre: 'Grupo persistido', conceptos: [95] })
    await deleteConceptGroup(1)

    vi.resetModules() // equivale a recargar la página: la base se vuelve a leer de sessionStorage
    const { db } = await import('../mocks/db')
    expect(db.conceptos.map((c) => c.codigo)).toContain(95)
    expect(db.conceptos.find((c) => c.codigo === 9001).descripcion).toBe('EDITADO')
    expect(db.grupos.map((g) => g.nombre)).toContain('Grupo persistido')
    expect(db.grupos.map((g) => g.id)).not.toContain(1)
    expect(db.siguienteGrupoId).toBe(5)
    expect(db.cortes.map((c) => [c.id, c.grupo_id, c.estado])).toEqual([
      [1, 1, 'ENVIADO'],
      [2, 2, 'BORRADOR'],
    ])
    expect(db.siguienteCorteId).toBe(3)
  })

  test('una base guardada sin conceptos se completa con los iniciales', async () => {
    const guardada = { usuarios: [{ id: 1, nombre: 'Juan Pérez', email: 'jperez@cens.com.co', rol: 'ANALISTA_CARTERA', is_active: true, last_login: null, must_change_password: false, password: 'Analista123' }], siguienteId: 8 }
    sessionStorage.setItem('nexovolt-mock-db-v3', JSON.stringify(guardada))

    vi.resetModules()
    const { db } = await import('../mocks/db')
    expect(db.usuarios).toHaveLength(1)
    expect(db.siguienteId).toBe(8)
    expect(db.conceptos).toEqual([
      { codigo: 30, descripcion: 'CUOTA FINANCIACION ENERGIA', activo: true, observacion: null },
      { codigo: 94, descripcion: 'INTERES FINANCIACION ENERGIA', activo: true, observacion: null },
      { codigo: 9001, descripcion: 'CONCEPTO DE PRUEBA ACTIVO', activo: true, observacion: 'Dato ficticio' },
      { codigo: 9002, descripcion: 'CONCEPTO DE PRUEBA INACTIVO', activo: false, observacion: null },
    ])
    expect(db.grupos.map((g) => g.id)).toEqual([1, 2, 3])
    expect(db.siguienteGrupoId).toBe(4)
    expect(db.cortes).toHaveLength(2)
  })
})
