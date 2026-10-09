// Página temporal del paso 2: muestra colores y tipografías de marca.
// Se reemplaza por el catálogo de componentes en el paso 3.
const COLORES = [
  { clase: 'bg-bosque', nombre: 'Bosque', hex: '#0D9648', uso: 'Principal' },
  { clase: 'bg-bosque-d', nombre: 'Bosque oscuro', hex: '#0A7A3A', uso: 'Hover' },
  { clase: 'bg-citrico', nombre: 'Cítrico', hex: '#9FCF67', uso: 'Acento' },
  { clase: 'bg-gris', nombre: 'Gris', hex: '#A1A1A5', uso: 'Bordes' },
  { clase: 'bg-ink', nombre: 'Tinta', hex: '#1E293B', uso: 'Texto' },
  { clase: 'bg-muted', nombre: 'Apagado', hex: '#64748B', uso: 'Texto secundario' },
  { clase: 'bg-line', nombre: 'Línea', hex: '#E2E8F0', uso: 'Divisores' },
  { clase: 'bg-error', nombre: 'Error', hex: '#DC2626', uso: 'Errores' },
]

export default function BrandPreviewPage() {
  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="font-hd text-4xl font-bold text-bosque">
        Nexo<span className="text-citrico">Volt</span>
      </h1>
      <p className="mt-1 text-muted">Andamiaje del frontend · colores y tipografías de marca</p>

      <h2 className="mt-8 mb-3 font-hd text-xl font-bold">Colores</h2>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {COLORES.map((c) => (
          <li key={c.nombre} className="overflow-hidden rounded-card border border-line bg-white">
            <div className={`h-16 ${c.clase}`} />
            <div className="p-3">
              <div className="font-semibold">{c.nombre}</div>
              <div className="text-xs text-muted">{c.hex} · {c.uso}</div>
            </div>
          </li>
        ))}
      </ul>

      <h2 className="mt-8 mb-3 font-hd text-xl font-bold">Tipografías</h2>
      <div className="rounded-card border border-line bg-white p-6">
        <p className="font-hd text-3xl font-bold">Baloo 2 — Gestión y Control de Cartera</p>
        <p className="mt-3 font-body text-base">
          Mulish — Extracción y consolidación de cartera de energía. 0123456789
        </p>
      </div>

      <h2 className="mt-8 mb-3 font-hd text-xl font-bold">Radios y sombras</h2>
      <div className="flex flex-wrap gap-4">
        <div className="rounded-ctl border border-gris bg-white px-4 py-3">rounded-ctl (8)</div>
        <div className="rounded-card border border-line bg-white px-4 py-3">rounded-card (12)</div>
        <div className="rounded-dlg bg-white px-4 py-3 shadow-dlg">rounded-dlg + shadow-dlg (16)</div>
      </div>
    </main>
  )
}
