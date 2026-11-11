// El backend entrega `distribucion` y `por_estado` por código; el frontend los ordena: 01, 03, 06, 02, 07
// y luego el resto por código ascendente.
import { mapPanelResumen } from '../features/home/panelService'
import { mapResumenCartera } from '../features/obligations/obligationsMapper'

const alfabetico = ['01', '02', '03', '04', '06', '07', '12'].map((estado_tu, i) => ({ estado_tu, cantidad: i + 1 }))
const ESPERADO = ['01', '03', '06', '02', '07', '04', '12']
const codigos = (conteos) => conteos.map((c) => c.estado.codigo)

describe('orden de los estados', () => {
  test('mapResumenCartera ordena por_estado con el orden de la pantalla', () => {
    const raw = {
      fecha_ultimo_ciclo: '2026-09-30',
      total: 28,
      abiertas: 20,
      por_estado: alfabetico,
      eliminadas: 0,
      por_cuotas_mora: { al_dia: 1, una: 1, dos_a_tres: 1, cuatro_o_mas: 1 },
      financiaciones_nuevas: [],
    }
    const resumen = mapResumenCartera(raw)
    expect(codigos(resumen.porEstado)).toEqual(ESPERADO)
    expect(resumen.porEstado[1].cantidad).toBe(3)
  })

  test('mapPanelResumen ordena distribucion con el orden de la pantalla', () => {
    const raw = {
      fecha_ultimo_ciclo: '2026-09-30',
      total_obligaciones: 28,
      distribucion: alfabetico,
      ultimo_archivo: null,
      en_reclamo: 0,
      novedades_pendientes: 0,
      con_dos_o_mas_cuotas: 0,
      entidad_con_marcador: false,
    }
    expect(codigos(mapPanelResumen(raw).distribucion)).toEqual(ESPERADO)
  })
})
