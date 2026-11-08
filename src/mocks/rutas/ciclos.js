// Actualización mensual de estados (pantalla 10) y matriz de cambios de estado del backend simulado.
// Propuestas del contrato 0.9. SOLO Analista de Cartera (el Administrador recibe 403).
//
// `POST /ciclos/` trabaja sobre el corte en BORRADOR de la fecha (lo crea la extracción): sin él
// responde 409. El mock no recalcula: aplica la foto del corte 2026-10-31 (mocks/datos/ciclos.js) y,
// para el 2026-09-30, vuelve al estado inicial; otros cortes salen sin cambios.
import { http, HttpResponse } from 'msw'
import { errorFechaCorte, MSG_CICLO } from '../../features/cycle/cycleValidation'
import { ENDPOINTS } from '../../lib/api/endpoints'
import { cicloInicial, FECHA_CICLO_CON_FOTO, obligacionesTrasCiclo, resultadoCiclo2026_10_31, resultadoSinCambios } from '../datos/ciclos'
import { matrizEstados } from '../datos/matrizEstados'
import { FECHA_ULTIMO_CICLO, obligacionesIniciales } from '../datos/obligacionesIteracion2'
import { db, persistir } from '../db'
import { ahoraBogotaISO, error, espera, exigirSesion, idDeRuta, leerCuerpo, SOLO_ANALISTA, url } from '../utilidades'

const SIN_CICLO = { detail: 'Ese corte no tiene una actualización mensual ejecutada.' }
const SIN_BORRADOR = { detail: 'Primero genera la extracción de ese corte.' }

const CAMPOS_RESUMEN = ['corte_id', 'fecha_corte', 'fecha_ejecucion', 'ejecutada_por', 'primer_reporte', 'cambios_estado', 'cierres', 'rechazados']
const aResumen = (ciclo) => Object.fromEntries(CAMPOS_RESUMEN.map((k) => [k, ciclo[k]]))
const masRecientePrimero = (a, b) => b.fecha_corte.localeCompare(a.fecha_corte)

// Fecha del último ciclo ejecutado: la mora de las obligaciones se calcula a ese corte.
export const corteVigente = () => [...db.ciclos].sort(masRecientePrimero)[0]?.fecha_corte ?? FECHA_ULTIMO_CICLO

// Obligaciones y resultado del ciclo de `fecha` (el mock no recalcula; ver mocks/datos/ciclos.js).
function calcular(fecha) {
  if (fecha === FECHA_CICLO_CON_FOTO) return { obligaciones: obligacionesTrasCiclo(obligacionesIniciales()), resultado: resultadoCiclo2026_10_31() }
  if (fecha === FECHA_ULTIMO_CICLO) {
    const resultado = cicloInicial()
    for (const campo of ['corte_id', 'fecha_corte', 'fecha_ejecucion', 'ejecutada_por']) delete resultado[campo]
    return { obligaciones: obligacionesIniciales(), resultado }
  }
  return { obligaciones: db.obligaciones, resultado: resultadoSinCambios() }
}

export const ciclosHandlers = [
  http.get(url(ENDPOINTS.matrizEstados), async () => {
    await espera()
    const { respuesta } = exigirSesion(SOLO_ANALISTA)
    return respuesta ?? HttpResponse.json(matrizEstados())
  }),

  http.get(url(ENDPOINTS.ciclos), async () => {
    await espera()
    const { respuesta } = exigirSesion(SOLO_ANALISTA)
    return respuesta ?? HttpResponse.json([...db.ciclos].sort(masRecientePrimero).map(aResumen))
  }),

  http.post(url(ENDPOINTS.ciclos), async ({ request }) => {
    await espera()
    const { respuesta, usuario } = exigirSesion(SOLO_ANALISTA)
    if (respuesta) return respuesta
    const { fecha_corte: valor } = await leerCuerpo(request)
    const errorFecha = errorFechaCorte(valor)
    if (errorFecha) return error(400, { fecha_corte: [errorFecha] })
    const fecha = valor.trim()
    const ultimaEnviada = db.cortes.filter((c) => c.estado === 'ENVIADO').reduce((max, c) => (c.fecha_corte > max ? c.fecha_corte : max), '')
    if (ultimaEnviada && fecha <= ultimaEnviada) return error(400, { fecha_corte: [MSG_CICLO.anterior(ultimaEnviada)] })
    const borrador = db.cortes.find((c) => c.fecha_corte === fecha && c.estado === 'BORRADOR')
    if (!borrador) return error(409, SIN_BORRADOR)

    const { obligaciones, resultado } = calcular(fecha)
    const ciclo = { corte_id: borrador.id, fecha_corte: fecha, fecha_ejecucion: ahoraBogotaISO(), ejecutada_por: usuario.nombre, ...resultado }
    // Volver a ejecutarlo sobre el mismo BORRADOR reemplaza el resultado anterior.
    db.ciclos = [...db.ciclos.filter((c) => c.corte_id !== borrador.id), ciclo]
    db.obligaciones = obligaciones
    persistir()
    return HttpResponse.json(ciclo, { status: 201 })
  }),

  http.get(url(ENDPOINTS.ciclo(':corteId')), async ({ params }) => {
    await espera()
    const { respuesta } = exigirSesion(SOLO_ANALISTA)
    if (respuesta) return respuesta
    const ciclo = db.ciclos.find((c) => c.corte_id === idDeRuta(params.corteId))
    return ciclo ? HttpResponse.json(ciclo) : error(404, SIN_CICLO)
  }),
]
