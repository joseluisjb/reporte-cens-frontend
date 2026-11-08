// Reporte a TransUnion (pantalla 12) del backend simulado: validaciones del corte, generación del
// archivo plano, lista de archivos y descarga. Propuestas del contrato 0.9. Analista y Administrador
// (como `validar`).
import { http, HttpResponse } from 'msw'
import { ENDPOINTS } from '../../lib/api/endpoints'
import { camposLargos, contenidoArchivo, obligacionesDelCorte, validacionesDelCorte } from '../datos/reporte'
import { db, persistir } from '../db'
import { aEntero, ahoraBogotaISO, error, espera, exigirSesion, idDeRuta, url } from '../utilidades'
import { aEntidad } from './entidad'

const SIN_CORTE = { detail: 'Corte no encontrado.' }
const SIN_ARCHIVO = { detail: 'Archivo no encontrado.' }
const LONGITUD_REGISTRO_2 = 930 // parámetro del backend; el Manual declara 930 y sus campos suman 929 (por confirmar)
const MOTIVO_NO_APTO = 'La entidad tiene datos con relleno (XXX): TransUnion lo rechazaría.'

const buscarCorte = (id) => db.cortes.find((c) => c.id === idDeRuta(id) && c.estado !== 'ANULADO') ?? null
const masReciente = (a, b) => Date.parse(b.fecha_generacion) - Date.parse(a.fecha_generacion)

// Las validaciones del corte con la entidad actual.
export const validacionesDe = (corte) => validacionesDelCorte(corte, { entidadConMarcador: aEntidad(db.entidad).con_marcador })

// El contenido de cada archivo generado vive solo en memoria. Uno sin contenido (los iniciales, o
// después de recargar la página) se arma de nuevo con las obligaciones actuales de su corte.
const contenidos = new Map()
function contenidoDe(archivo) {
  if (contenidos.has(archivo.id)) return contenidos.get(archivo.id)
  const prefijo = archivo.nombre.slice(3, 9) // SSR + tipo (3) + código (3) + fecha
  return contenidoArchivo({
    fechaCorte: archivo.fecha_corte,
    tipoEntidad: prefijo.slice(0, 3),
    codigoEntidad: prefijo.slice(3, 6),
    sucursal: db.entidad.codigo_sucursal,
    longitud: archivo.longitud_registro_tipo2,
    incluidas: obligacionesDelCorte(archivo.fecha_corte),
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
      n_excluidas: db.obligaciones.length - incluidas.length,
      saldo_total: incluidas.reduce((suma, o) => suma + o.valor_saldo, 0),
      longitud_registro_tipo2: LONGITUD_REGISTRO_2,
      apto_envio: !entidad.con_marcador,
      motivo_no_apto: entidad.con_marcador ? MOTIVO_NO_APTO : null,
      enviado: false,
      fecha_envio: null,
      estado_corte: corte.estado,
      tiene_resultados: false,
    }
    contenidos.set(
      archivo.id,
      contenidoArchivo({
        fechaCorte: corte.fecha_corte,
        tipoEntidad: entidad.tipo_entidad,
        codigoEntidad: entidad.codigo_entidad,
        sucursal: entidad.codigo_sucursal,
        longitud: LONGITUD_REGISTRO_2,
        incluidas,
      }),
    )
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
    const archivo = db.archivos.find((a) => a.id === idDeRuta(params.id))
    if (!archivo) return error(404, SIN_ARCHIVO)
    return new HttpResponse(contenidoDe(archivo), {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=windows-1252', 'Content-Disposition': `attachment; filename="${archivo.nombre}.txt"` },
    })
  }),
]
