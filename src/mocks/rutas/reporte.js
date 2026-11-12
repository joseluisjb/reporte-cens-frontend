// Reporte a TransUnion (pantalla 12) del backend simulado: validaciones del corte, generación del
// archivo plano, lista de archivos y descarga (Analista y Administrador, como `validar`), y los
// resultados del cargue de TransUnion (RF54, solo Analista). Propuestas del contrato 0.9.
import { http, HttpResponse } from 'msw'
import { ENDPOINTS } from '../../lib/api/endpoints'
import { SUCURSAL_ARCHIVO_INICIAL } from '../datos/archivos'
import { camposLargos, contenidoArchivo, ESTADOS_ENVIADOS, obligacionesDelCorte, obligacionesExistentes, validacionesDelCorte } from '../datos/reporte'
import { ArchivoRechazado, leerResultados } from '../datos/resultadosCargue'
import { db, persistir } from '../db'
import { aEntero, ahoraBogotaISO, error, espera, exigirSesion, idDeRuta, SOLO_ANALISTA, url } from '../utilidades'
import { aEntidad } from './entidad'

const SIN_CORTE = { detail: 'Corte no encontrado.' }
const SIN_ARCHIVO = { detail: 'Archivo no encontrado.' }
const LONGITUD_REGISTRO_2 = 930 // parámetro del backend; el Manual declara 930 y sus campos suman 929 (por confirmar)
const MOTIVO_NO_APTO = 'Faltan los datos de la entidad ante TransUnion: el archivo sería rechazado.'

const buscarCorte = (id) => db.cortes.find((c) => c.id === idDeRuta(id) && c.estado !== 'ANULADO') ?? null
// Del más reciente al más antiguo; dos generados en el mismo segundo se ordenan por id.
const masReciente = (a, b) => Date.parse(b.fecha_generacion) - Date.parse(a.fecha_generacion) || b.id - a.id
const buscarArchivo = (id) => db.archivos.find((a) => a.id === idDeRuta(id)) ?? null

// El archivo más reciente de un corte (el que se envía), o null.
export const ultimoArchivoDelCorte = (corteId) => db.archivos.filter((a) => a.corte_id === corteId).sort(masReciente)[0] ?? null

// Cambia el estado del corte y lo refleja en `estado_corte` de sus archivos.
export function cambiarEstadoCorte(corte, estado) {
  corte.estado = estado
  for (const a of db.archivos) if (a.corte_id === corte.id) a.estado_corte = estado
}

// Las validaciones del corte con la entidad actual.
export const validacionesDe = (corte) => validacionesDelCorte(corte, { entidadConMarcador: aEntidad(db.entidad).con_marcador })

// El contenido de cada archivo se guarda en `db.contenidosArchivo` al generarlo. Los iniciales no lo
// traen: se arma la primera vez que se descargan, con los datos de entidad con que se generaron, y
// desde ahí queda fijo.
function contenidoDe(archivo) {
  if (!(archivo.id in db.contenidosArchivo)) {
    db.contenidosArchivo[archivo.id] = contenidoArchivo({
      fechaCorte: archivo.fecha_corte,
      tipoEntidad: archivo.nombre.slice(3, 6), // SSR + tipo (3) + código (3) + fecha
      codigoEntidad: archivo.nombre.slice(6, 9),
      sucursal: SUCURSAL_ARCHIVO_INICIAL[archivo.id] ?? db.entidad.codigo_sucursal,
      longitud: archivo.longitud_registro_tipo2,
      incluidas: obligacionesDelCorte(archivo.fecha_corte),
    })
    persistir()
  }
  return db.contenidosArchivo[archivo.id]
}

// El archivo plano va en ANSI (Manual, p. 43): Windows-1252, un byte por carácter, para que cada campo
// quede en su posición. Coincide con Latin-1 salvo de 0x80 a 0x9F; un carácter que no existe en
// Windows-1252 sale como «?».
const WINDOWS_1252 = new Map(
  [...'€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ'].map((c, i) => [c, [0x80, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x8b, 0x8c, 0x8e, 0x91, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0x9b, 0x9c, 0x9e, 0x9f][i]]),
)
function enWindows1252(texto) {
  return Uint8Array.from(texto, (c) => {
    const codigo = c.codePointAt(0)
    if (WINDOWS_1252.has(c)) return WINDOWS_1252.get(c)
    return codigo <= 0xff && (codigo < 0x80 || codigo > 0x9f) ? codigo : 0x3f
  })
}

export const reporteHandlers = [
  http.get(url(ENDPOINTS.validacionesCorte(':id')), async ({ params }) => {
    await espera()
    const { respuesta } = exigirSesion()
    if (respuesta) return respuesta
    const corte = buscarCorte(params.id)
    return corte ? HttpResponse.json(validacionesDe(corte)) : error(404, SIN_CORTE)
  }),

  http.post(url(ENDPOINTS.generarArchivo(':id')), async ({ params }) => {
    await espera()
    const { respuesta, usuario } = exigirSesion()
    if (respuesta) return respuesta
    const corte = buscarCorte(params.id)
    if (!corte) return error(404, SIN_CORTE)
    if (corte.estado !== 'VALIDADO' || !validacionesDe(corte).puede_generar) return error(409, { detail: 'Valida el corte antes de generar el archivo.' })
    const incluidas = obligacionesDelCorte(corte.fecha_corte)
    const largos = camposLargos(incluidas)
    if (largos.length) return error(409, { detail: 'No se generó el archivo: hay campos que no caben en su posición.', errores: largos })

    const entidad = aEntidad(db.entidad)
    const archivo = {
      id: Math.max(0, ...db.archivos.map((a) => a.id)) + 1,
      corte_id: corte.id,
      fecha_corte: corte.fecha_corte,
      nombre: `${entidad.prefijo_archivo}${corte.fecha_corte.replaceAll('-', '')}`,
      tipo_reporte: '01',
      fecha_generacion: ahoraBogotaISO(),
      generado_por: usuario.nombre,
      n_registros: incluidas.length,
      total_registros: incluidas.length + 2,
      n_excluidas: obligacionesExistentes(corte.fecha_corte).length - incluidas.length,
      saldo_total: incluidas.reduce((suma, o) => suma + o.valor_saldo, 0),
      longitud_registro_tipo2: LONGITUD_REGISTRO_2,
      apto_envio: !entidad.con_marcador,
      motivo_no_apto: entidad.con_marcador ? MOTIVO_NO_APTO : null,
      enviado: false,
      fecha_envio: null,
      estado_corte: corte.estado,
      tiene_resultados: false,
    }
    db.contenidosArchivo[archivo.id] = contenidoArchivo({
      fechaCorte: corte.fecha_corte,
      tipoEntidad: entidad.tipo_entidad,
      codigoEntidad: entidad.codigo_entidad,
      sucursal: entidad.codigo_sucursal,
      longitud: LONGITUD_REGISTRO_2,
      incluidas,
    })
    db.archivos = [...db.archivos, archivo]
    persistir()
    return HttpResponse.json(archivo, { status: 201 })
  }),

  http.get(url(ENDPOINTS.archivos), async ({ request }) => {
    await espera()
    const { respuesta } = exigirSesion()
    if (respuesta) return respuesta
    const filtro = new URL(request.url).searchParams.get('corte_id')
    if (filtro !== null && filtro.trim() !== '') {
      const corteId = aEntero(filtro)
      if (corteId === null || corteId < 1) return error(400, { corte_id: ['Indica el id numérico del corte.'] })
      return HttpResponse.json(db.archivos.filter((a) => a.corte_id === corteId).sort(masReciente))
    }
    return HttpResponse.json([...db.archivos].sort(masReciente))
  }),

  http.get(url(ENDPOINTS.archivoDescarga(':id')), async ({ params }) => {
    await espera()
    const { respuesta } = exigirSesion()
    if (respuesta) return respuesta
    const archivo = buscarArchivo(params.id)
    if (!archivo) return error(404, SIN_ARCHIVO)
    return new HttpResponse(enWindows1252(contenidoDe(archivo)), {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=windows-1252', 'Content-Disposition': `attachment; filename="${archivo.nombre}.txt"` },
    })
  }),
  http.get(url(ENDPOINTS.resultadosArchivo(':id')), async ({ params }) => {
    await espera()
    const { respuesta } = exigirSesion(SOLO_ANALISTA)
    if (respuesta) return respuesta
    const archivo = buscarArchivo(params.id)
    const resultados = archivo && db.resultadosCargue[archivo.id]
    return resultados ? HttpResponse.json(resultados) : error(404, { detail: archivo ? 'Este archivo todavía no tiene resultados cargados.' : SIN_ARCHIVO.detail })
  }),

  // Multipart con uno o varios `archivos`. Un archivo que no corresponde o sin la estructura esperada da
  // 422 y no se guarda nada. Volver a cargar reemplaza los resultados anteriores del archivo.
  http.post(url(ENDPOINTS.resultadosArchivo(':id')), async ({ params, request }) => {
    await espera()
    const { respuesta, usuario } = exigirSesion(SOLO_ANALISTA)
    if (respuesta) return respuesta
    const archivo = buscarArchivo(params.id)
    if (!archivo) return error(404, SIN_ARCHIVO)
    if (!archivo.enviado) return error(409, { detail: 'Registra el envío del archivo antes de cargar sus resultados.' })
    const formulario = await request.formData().catch(() => null)
    const adjuntos = (formulario?.getAll('archivos') ?? []).filter((f) => typeof f === 'object' && 'name' in f)
    const cargados = await Promise.all(adjuntos.map(async (f) => ({ nombre: f.name, texto: await f.text() })))
    // Por número en todas las obligaciones: el norep trae justo las que no entraron en el archivo.
    const porNumero = new Map(db.obligaciones.map((o) => [o.numero, o.id]))
    let leidos
    try {
      leidos = leerResultados(cargados, { archivo, obligacionId: (numero) => porNumero.get(numero) ?? null })
    } catch (err) {
      if (err instanceof ArchivoRechazado) return error(422, err.cuerpo)
      throw err
    }
    const estado = leidos.inconsistencias.some((i) => i.tipo === 'CORRECTIVA') ? 'ENVIADO_CON_INCONSISTENCIAS' : 'ENVIADO'
    const corte = db.cortes.find((c) => c.id === archivo.corte_id)
    if (corte && ESTADOS_ENVIADOS.includes(corte.estado)) cambiarEstadoCorte(corte, estado)
    else archivo.estado_corte = estado
    const resultados = {
      archivo_id: archivo.id,
      corte_id: archivo.corte_id,
      fecha_corte: archivo.fecha_corte,
      fecha_carga: ahoraBogotaISO(),
      cargado_por: usuario.nombre,
      estado_corte: estado,
      ...leidos,
    }
    db.resultadosCargue[archivo.id] = resultados
    archivo.tiene_resultados = true
    persistir()
    return HttpResponse.json(resultados, { status: 201 })
  }),
]
