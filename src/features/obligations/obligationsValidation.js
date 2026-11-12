// Filtros de la pantalla 9 que viven en la URL (enlazables desde el panel y la pantalla 12):
//   ?estado=03            un estado de la Tabla 4b (o `eliminadas`, RF50)
//   ?cuotas_mora_min=2    al menos esas cuotas en mora (RF19; lo manda el panel)
//   ?q=texto              número de obligación o nombre del titular
//   ?desde=20             desplazamiento de la paginación (se quita al cambiar un filtro)
//   ?obligacion=7         id de la obligación cuyo detalle está abierto
// Un valor que no se entiende se ignora (no se manda al backend ni rompe la pantalla).
import { ESTADOS_OBLIGACION } from '../transunion/catalogosTU'

export const FILTRO_ELIMINADAS = 'eliminadas'
export const LARGO_MAXIMO_BUSQUEDA = 60

const enteroNoNegativo = (texto, maximo = 9999) => (/^\d{1,7}$/.test(texto ?? '') && Number(texto) <= maximo ? Number(texto) : null)
const enteroPositivo = (texto) => (/^[1-9]\d{0,9}$/.test(texto ?? '') ? Number(texto) : null)

// URLSearchParams → { estado, cuotasMoraMin, q, desplazamiento, obligacionId }. `estado` es '' (todas), un código de
// la Tabla 4b o FILTRO_ELIMINADAS.
export function leerFiltros(params) {
  const estado = params.get('estado') ?? ''
  return {
    estado: estado === FILTRO_ELIMINADAS || Object.hasOwn(ESTADOS_OBLIGACION, estado) ? estado : '',
    cuotasMoraMin: enteroNoNegativo(params.get('cuotas_mora_min')),
    q: (params.get('q') ?? '').trim().slice(0, LARGO_MAXIMO_BUSQUEDA),
    desplazamiento: enteroNoNegativo(params.get('desde'), 9999999) ?? 0,
    obligacionId: enteroPositivo(params.get('obligacion')),
  }
}

// Filtros de la pantalla → parámetros de `listObligations`.
export const aConsulta = ({ estado, cuotasMoraMin, q }) => ({
  estado: estado === FILTRO_ELIMINADAS ? '' : estado,
  eliminadas: estado === FILTRO_ELIMINADAS,
  cuotasMoraMin: cuotasMoraMin ?? '',
  q,
})
