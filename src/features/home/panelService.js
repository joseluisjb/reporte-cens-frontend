// Tarjetas de HU-B y HU-C del panel (pantalla 4, RF6, RF19, RF23, RF24, RF57). SOLO Analista de
// Cartera: el Administrador recibe 403, y la pantalla no la pide para él. Propuesto en el contrato 0.9;
// hoy responden los mocks.
import { api, ENDPOINTS } from '../../lib/api'
import { descripcionEstado } from '../transunion/catalogosTU'
import { mapArchivo } from '../report/reportMapper'

//   PanelResumen → { fechaUltimoCiclo, totalObligaciones, distribucion: [{ estado: { codigo, descripcion }, cantidad }],
//                    ultimoArchivo (Archivo|null), enReclamo, novedadesPendientes, conDosOMasCuotas, entidadConMarcador }
export function mapPanelResumen(raw) {
  return {
    fechaUltimoCiclo: raw.fecha_ultimo_ciclo ? String(raw.fecha_ultimo_ciclo).slice(0, 10) : null,
    totalObligaciones: raw.total_obligaciones,
    distribucion: raw.distribucion.map((c) => ({ estado: { codigo: c.estado_tu, descripcion: descripcionEstado(c.estado_tu) }, cantidad: c.cantidad })),
    ultimoArchivo: raw.ultimo_archivo ? mapArchivo(raw.ultimo_archivo) : null,
    enReclamo: raw.en_reclamo,
    novedadesPendientes: raw.novedades_pendientes,
    conDosOMasCuotas: raw.con_dos_o_mas_cuotas,
    entidadConMarcador: raw.entidad_con_marcador,
  }
}

// `skipAuthRedirect`: un 401 o 403 aquí no debe sacar al usuario del inicio; la tarjeta muestra su error.
export async function getPanelSummary() {
  const { data } = await api.get(ENDPOINTS.panelResumen, { skipAuthRedirect: true })
  return mapPanelResumen(data)
}
