// Respuesta paginada del contrato (`ListaPaginada`): { total, resultados }.
// `total` cuenta todos los registros que cumplen el filtro, no solo los de la página.
// Devuelve { items, total } con cada fila traducida por `mapItem`.
export function mapPagina(data, mapItem) {
  return { items: (data?.resultados ?? []).map(mapItem), total: data?.total ?? 0 }
}
