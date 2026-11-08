// Refinanciaciones (pantalla 11, RF18) del backend simulado. Propuesta del contrato 0.9. SOLO Analista.
//
// `POST /refinanciaciones/` es el registro manual de respaldo: cierra la original con modo de extinción
// 16 Refinanciación y tipo de pago 02 No voluntario (en 02, o en 07 si estaba en 03 o 06), comprueba el
// cambio con la matriz (409 si TransUnion no lo acepta) y crea la nueva obligación en primer reporte,
// reestructurada, con número propio. Cada registro guarda una FOTO de las dos obligaciones: un ciclo
// posterior puede reemplazar `db.obligaciones` (el mock no recalcula), y el historial no debe romperse.
import { http, HttpResponse } from 'msw'
import { cuotasValidas, errorFechaRefinanciacion, estadoDeCierre, MSG_REFI } from '../../features/refinancing/refinancingValidation'
import { descripcionEstado, esEstadoDeCierre } from '../../features/transunion/catalogosTU'
import { ENDPOINTS } from '../../lib/api/endpoints'
import { CATALOGOS } from '../datos/catalogos'
import { REFINANCIACION } from '../datos/refinanciaciones'
import { matrizEstados } from '../datos/matrizEstados'
import { aResumen, cuotas, eventos, obligacion } from '../datos/obligacionesIteracion2'
import { db, persistir } from '../db'
import { aEntero, ahoraBogotaISO, error, espera, exigirSesion, hoyLocalISO, leerCuerpo, SOLO_ANALISTA, url } from '../utilidades'
import { corteVigente } from './ciclos'

const NO_VOLUNTARIO = { codigo: '02', descripcion: 'No voluntario' }
const estadoTexto = (codigo) => `${codigo} · ${descripcionEstado(codigo)}`
const finDeMes = (fecha) => {
  const [anio, mes] = fecha.split('-').map(Number)
  return `${anio}-${String(mes).padStart(2, '0')}-${String(new Date(Date.UTC(anio, mes, 0)).getUTCDate()).padStart(2, '0')}`
}

// El estado de la nueva sale de la base si sigue ahí (un ciclo pudo cambiarlo).
const aRespuesta = (r) => {
  const nueva = db.obligaciones.find((o) => o.id === r.obligacion_nueva.obligacion_id)
  return nueva ? { ...r, obligacion_nueva: { ...r.obligacion_nueva, estado_tu: nueva.estado } } : r
}

// Número propio de la nueva obligación (RF5): 2272-6100 en adelante, sin repetir.
function numeroNuevo() {
  const usados = new Set(db.obligaciones.map((o) => o.numero))
  let n = 6100 + db.refinanciaciones.length
  while (usados.has(`2272-${n}`)) n++
  return `2272-${n}`
}

// Errores por campo (400), como DRF.
function erroresDe(cuerpo) {
  const errores = {}
  const id = aEntero(cuerpo.obligacion_original_id)
  if (id === null || id < 1) errores.obligacion_original_id = [MSG_REFI.obligacion]
  const naturaleza = CATALOGOS['naturalezas-reestructuracion'].find((n) => n.codigo === cuerpo.naturaleza)
  if (!naturaleza) errores.naturaleza = [MSG_REFI.naturaleza]
  if (typeof cuerpo.numero_cuotas !== 'number' || cuotasValidas(cuerpo.numero_cuotas) === null) errores.numero_cuotas = [MSG_REFI.cuotas]
  const errorFecha = errorFechaRefinanciacion(cuerpo.fecha, hoyLocalISO())
  if (errorFecha) errores.fecha = [errorFecha]
  return { errores, id, naturaleza }
}

export const refinanciacionesHandlers = [
  http.get(url(ENDPOINTS.refinanciaciones), async () => {
    await espera()
    const { respuesta } = exigirSesion(SOLO_ANALISTA)
    if (respuesta) return respuesta
    const lista = [...db.refinanciaciones].sort((a, b) => Date.parse(b.fecha_registro) - Date.parse(a.fecha_registro))
    return HttpResponse.json(lista.map(aRespuesta))
  }),

  http.post(url(ENDPOINTS.refinanciaciones), async ({ request }) => {
    await espera()
    const { respuesta, usuario } = exigirSesion(SOLO_ANALISTA)
    if (respuesta) return respuesta
    const cuerpo = await leerCuerpo(request)
    const { errores, id, naturaleza } = erroresDe(cuerpo)
    if (Object.keys(errores).length) return error(400, errores)

    const original = db.obligaciones.find((o) => o.id === id)
    if (!original) return error(404, { detail: 'Obligación no encontrada.' })
    if (original.eliminada) {
      return error(409, { detail: `La obligación ${original.numero} está eliminada en TransUnion: no se puede refinanciar.`, code: 'obligacion_eliminada' })
    }
    if (esEstadoDeCierre(original.estado)) {
      return error(409, { detail: `La obligación ${original.numero} ya está cerrada: no se puede refinanciar.`, code: 'obligacion_cerrada' })
    }
    const cierre = estadoDeCierre(original.estado)
    const conMora = aResumen(original, corteVigente()).valor_mora > 0
    const permitida = matrizEstados().transiciones.find(
      (t) => t.desde === original.estado && t.desde_con_mora === conMora && t.hacia === cierre && !t.hacia_con_mora,
    ).permitida
    if (!permitida) {
      return error(409, {
        detail: `TransUnion no acepta pasar de ${estadoTexto(original.estado)} a ${estadoTexto(cierre)} (error 713). Define el tratamiento con CENS.`,
        code: 'transicion_no_permitida',
      })
    }

    const numeroCuotas = cuerpo.numero_cuotas
    const fecha = cuerpo.fecha.trim()
    const numero = numeroNuevo()
    const nuevaId = Math.max(...db.obligaciones.map((o) => o.id)) + 1
    const saldo = original.saldo
    const nueva = obligacion({
      id: nuevaId,
      numero,
      titular: original.titular,
      concepto: original.concepto,
      estado: '01',
      saldo,
      cuota: Math.ceil(saldo / numeroCuotas / 1000) * 1000,
      valor_inicial: saldo,
      ingreso: fecha,
      primer_reporte: true,
      atrasos_permitidos: original.atrasos_permitidos,
      reestructuracion: {
        numero_reestructuraciones: (original.reestructuracion?.numero_reestructuraciones ?? 0) + 1,
        naturaleza: { ...naturaleza },
        obligacion_anterior: { obligacion_id: original.id, numero_obligacion: original.numero },
      },
      eventos: eventos([fecha, '01', `Nueva obligación por la refinanciación de ${original.numero}: primer reporte en Vigente (01), marcada como reestructurada`]),
    })
    db.obligaciones = db.obligaciones
      .map((o) =>
        o.id !== original.id
          ? o
          : {
              ...o,
              estado: cierre,
              saldo: 0,
              cuota: 0,
              cuota_antes_cierre: o.cuota,
              vencidas: cuotas(),
              cierre: { fecha_corte: finDeMes(fecha), fecha_pago: fecha, modo_extincion: REFINANCIACION, tipo_pago: NO_VOLUNTARIO },
              refinanciada_en: { obligacion_id: nuevaId, numero_obligacion: numero },
              eventos: [
                ...o.eventos,
                ...eventos([fecha, cierre, `Refinanciada: se cierra en ${estadoTexto(cierre)} con modo de extinción 16 Refinanciación (antes ${estadoTexto(o.estado)})`]),
              ],
            },
      )
      .concat(nueva)

    const registro = {
      id: Math.max(0, ...db.refinanciaciones.map((r) => r.id)) + 1,
      fecha,
      fecha_registro: ahoraBogotaISO(),
      registrada_por: usuario.nombre,
      origen: 'MANUAL',
      obligacion_original: { obligacion_id: original.id, numero_obligacion: original.numero, nombre_titular: original.titular, estado_cierre: cierre, modo_extincion: REFINANCIACION },
      obligacion_nueva: { obligacion_id: nuevaId, numero_obligacion: numero, estado_tu: '01', numero_reestructuraciones: nueva.reestructuracion.numero_reestructuraciones },
      saldo_refinanciado: saldo,
      naturaleza: { ...naturaleza },
      numero_cuotas: numeroCuotas,
    }
    db.refinanciaciones = [...db.refinanciaciones, registro]
    persistir()
    return HttpResponse.json(registro, { status: 201 })
  }),
]
