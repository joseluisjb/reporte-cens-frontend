// Tarjetas del panel del Analista (pantalla 4, RF6, RF19, RF23, RF24, RF57) del backend simulado.
// Propuesta del contrato 0.9. SOLO Analista de Cartera: el Administrador recibe 403 (y la pantalla ni
// siquiera la pide).
import { http, HttpResponse } from 'msw'
import { ENDPOINTS } from '../../lib/api/endpoints'
import { aResumen, resumenCartera } from '../datos/obligacionesIteracion2'
import { db } from '../db'
import { espera, exigirSesion, SOLO_ANALISTA, url } from '../utilidades'
import { aEntidad } from './entidad'

// Novedades urgentes pendientes: foto del mockup v3 (n1 y n2) hasta que existan los mocks de
// novedades (pantalla 14, Angel). Cuando estén, se cuentan de su colección.
export const NOVEDADES_PENDIENTES_FOTO = 2

export function panelResumen() {
  const cartera = resumenCartera(db.obligaciones)
  const vivas = db.obligaciones.filter((o) => !o.eliminada).map(aResumen)
  const ultimo = [...db.archivos].sort((a, b) => b.fecha_generacion.localeCompare(a.fecha_generacion))[0] ?? null
  return {
    fecha_ultimo_ciclo: cartera.fecha_ultimo_ciclo,
    total_obligaciones: cartera.total,
    distribucion: cartera.por_estado,
    ultimo_archivo: ultimo,
    en_reclamo: vivas.filter((o) => o.en_reclamo).length,
    novedades_pendientes: NOVEDADES_PENDIENTES_FOTO,
    con_dos_o_mas_cuotas: vivas.filter((o) => !o.cerrada && o.cuotas_mora >= 2).length,
    entidad_con_marcador: aEntidad(db.entidad).con_marcador,
  }
}

export const panelHandlers = [
  http.get(url(ENDPOINTS.panelResumen), async () => {
    await espera()
    const { respuesta } = exigirSesion(SOLO_ANALISTA)
    return respuesta ?? HttpResponse.json(panelResumen())
  }),
]
