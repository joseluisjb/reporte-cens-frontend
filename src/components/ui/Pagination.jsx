import Button from './Button'

// Paginación por `limite` y `desplazamiento` (convención de la API: { total, resultados }).
//   <Pagination total={45} limit={20} offset={0} onChange={(nuevoOffset) => ...} />
// `noun` es lo que se cuenta en plural ("registros"); `nounSingular` se usa cuando hay uno solo ("registro"). El resumen es un aviso (`role="status"`)
// para que el lector de pantalla lo anuncie al cambiar de página. Sin resultados no dibuja nada.
export default function Pagination({ total, limit, offset, onChange, loading = false, noun = 'registros', nounSingular }) {
  if (!total) return null
  const desde = offset + 1
  const hasta = Math.min(offset + limit, total)
  const pagina = Math.floor(offset / limit) + 1
  const paginas = Math.ceil(total / limit)
  return (
    <nav aria-label={`Paginación de ${noun}`} className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
      <p role="status" className="text-[13px] text-muted">
        Mostrando {desde}–{hasta} de {total} {total === 1 && nounSingular ? nounSingular : noun} · Página {pagina} de {paginas}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={loading || offset <= 0} onClick={() => onChange(Math.max(0, offset - limit))}>
          Anterior
        </Button>
        <Button variant="outline" size="sm" disabled={loading || offset + limit >= total} onClick={() => onChange(offset + limit)}>
          Siguiente
        </Button>
      </div>
    </nav>
  )
}
