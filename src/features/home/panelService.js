// Tarjetas de HU-B y HU-C del panel (pantalla 4, RF6, RF19, RF23, RF24, RF57). SOLO Analista de
// Cartera: el Administrador recibe 403, y la pantalla no la pide para él. Implementado en el backend (contrato 0.9.5);
// con VITE_USE_MOCKS=true responden los mocks.
import { api, ENDPOINTS } from '../../lib/api'
import { soloFecha } from '../../lib/format'
import { mapConteoEstado, ordenarConteosEstado } from '../obligations/obligationsMapper'
import { mapArchivo } from '../report/reportMapper'

//   PanelResumen → { fechaUltimoCiclo, totalObligaciones, distribucion: [{ estado: { codigo, descripcion }, cantidad }],
//                    ultimoArchivo (Archivo|null), enReclamo, novedadesPendientes, conDosOMasCuotas, entidadConMarcador }
export function mapPanelResumen(raw) {
  return {
    fechaUltimoCiclo: soloFecha(raw.fecha_ultimo_ciclo),
    totalObligaciones: raw.total_obligaciones,
    distribucion: ordenarConteosEstado(raw.distribucion.map(mapConteoEstado)),
    ultimoArchivo: raw.ultimo_archivo ? mapArchivo(raw.ultimo_archivo) : null,
    enReclamo: raw.en_reclamo,
    novedadesPendientes: raw.novedades_pendientes,
    conDosOMasCuotas: raw.con_dos_o_mas_cuotas,
    entidadConMarcador: raw.entidad_con_marcador,
  }
}

// `skipAuthRedirect`, como la tarjeta «Última extracción» de la misma página: un error del panel no saca al
// usuario del inicio, la tarjeta muestra su error. La sesión vencida la detectan el cierre por inactividad
// (RF26) y las demás pantallas.
export async function getPanelSummary() {
  const { data } = await api.get(ENDPOINTS.panelResumen, { skipAuthRedirect: true })
  return mapPanelResumen(data)
}
