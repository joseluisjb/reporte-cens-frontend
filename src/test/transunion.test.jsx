// Componentes compartidos de TransUnion (features/transunion) y las piezas de UI que usan.
import { render, screen } from '@testing-library/react'
import { Alert, Badge } from '../components/ui'
import CandadoCerrada from '../features/transunion/CandadoCerrada'
import { ESTADOS_OBLIGACION, esEstadoDeCierre } from '../features/transunion/catalogosTU'
import CuotasMoraBadge from '../features/transunion/CuotasMoraBadge'
import EdadMoraBadge from '../features/transunion/EdadMoraBadge'
import EstadoBadge from '../features/transunion/EstadoBadge'
import { formatearDias, formatearFechaISOLarga } from '../lib/format'

describe('EstadoBadge', () => {
  test.each([
    ['01', 'Vigente', 'bg-green-100'],
    ['02', 'Saldada', 'bg-info-claro'],
    ['03', 'Dudoso recaudo', 'bg-aviso-claro'],
    ['06', 'Castigada', 'bg-error-claro'],
    ['07', 'Castigada recuperada', 'bg-turquesa-claro'],
    ['04', 'Suspendida por la entidad', 'bg-slate-100'],
    ['08', 'Inactivo', 'bg-slate-100'],
    ['10', 'Ley 550', 'bg-slate-100'],
    ['11', 'Ley 1116', 'bg-slate-100'],
    ['12', 'Ley 1564 de 2012 Insolvencia PNNC', 'bg-slate-100'],
  ])('%s se muestra como «%s» con el color de la maqueta', (codigo, texto, fondo) => {
    render(<EstadoBadge codigo={codigo} />)
    const insignia = screen.getByText(`${codigo} · ${texto}`)
    expect(insignia).toHaveClass(fondo)
  })

  test('cubre los 10 estados de la Tabla 4b', () => {
    expect(Object.keys(ESTADOS_OBLIGACION).sort()).toEqual(['01', '02', '03', '04', '06', '07', '08', '10', '11', '12'])
  })

  test('usa la descripción de la API cuando llega', () => {
    render(<EstadoBadge codigo="03" descripcion="Dudoso Recaudo" />)
    expect(screen.getByText('03 · Dudoso Recaudo')).toBeInTheDocument()
  })

  test('sin código muestra «Sin estado»', () => {
    render(<EstadoBadge codigo={null} />)
    expect(screen.getByText('Sin estado')).toBeInTheDocument()
  })

  test('un código fuera de la Tabla 4b sale solo y en gris; una descripción vacía usa el catálogo', () => {
    render(
      <>
        <EstadoBadge codigo="05" />
        <EstadoBadge codigo="01" descripcion="" />
      </>,
    )
    expect(screen.getByText('05')).toHaveClass('bg-slate-100')
    expect(screen.getByText('01 · Vigente')).toBeInTheDocument()
  })
})

describe('EdadMoraBadge', () => {
  test('muestra código, descripción y los días de mora', () => {
    const { container } = render(<EdadMoraBadge codigo="01" dias={47} />)
    expect(container).toHaveTextContent('01 - Mora 30')
    expect(screen.getByText('47 días de mora')).toBeInTheDocument()
  })

  test('sin días o con 0 días no muestra la segunda línea', () => {
    const { container } = render(
      <>
        <EdadMoraBadge codigo="00" />
        <EdadMoraBadge codigo="00" dias={0} />
      </>,
    )
    expect(container).toHaveTextContent('00 - Normal')
    expect(container).not.toHaveTextContent('de mora')
  })

  test('un código fuera de la Tabla 9 sale solo', () => {
    const { container } = render(<EdadMoraBadge codigo="15" />)
    expect(container).toHaveTextContent(/^15$/)
  })
})

describe('CuotasMoraBadge (RF19)', () => {
  test.each([
    [0, 'Al día', 'bg-slate-100'],
    [1, '1 cuota en mora', 'bg-aviso-claro'],
    [2, '2 cuotas en mora', 'bg-error-claro'],
    [5, '5 cuotas en mora', 'bg-error-claro'],
  ])('%i cuotas → «%s»', (cuotas, texto, fondo) => {
    render(<CuotasMoraBadge cuotas={cuotas} />)
    expect(screen.getByText(texto)).toHaveClass(fondo)
  })

  test.each([[null], [undefined], [-1], [1.5]])('sin dato válido (%s) muestra «—», no «Al día»', (cuotas) => {
    render(<CuotasMoraBadge cuotas={cuotas} />)
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.queryByText('Al día')).not.toBeInTheDocument()
  })
})

describe('CandadoCerrada', () => {
  test('anuncia la regla completa al lector de pantalla', () => {
    render(<CandadoCerrada />)
    expect(screen.getByText('Obligación cerrada: se reporta una sola vez')).toHaveClass('sr-only')
  })

  test('02 y 07 son estados de cierre; los demás no', () => {
    expect(['02', '07'].every(esEstadoDeCierre)).toBe(true)
    expect(['01', '03', '04', '06', '08', '10', '11', '12'].some(esEstadoDeCierre)).toBe(false)
  })
})

describe('Badge y Alert con los tonos nuevos', () => {
  test.each([
    ['info', 'bg-info-claro'],
    ['aviso', 'bg-aviso-claro'],
    ['error', 'bg-error-claro'],
    ['turquesa', 'bg-turquesa-claro'],
  ])('Badge tone=%s usa sus tokens', (tone, fondo) => {
    render(<Badge tone={tone}>Texto</Badge>)
    expect(screen.getByText('Texto')).toHaveClass(fondo)
  })

  test('Alert info es una nota (no se anuncia como alerta) con sus tokens', () => {
    render(<Alert tone="info">Los valores se reportan en miles.</Alert>)
    const nota = screen.getByRole('note')
    expect(nota).toHaveTextContent('Los valores se reportan en miles.')
    expect(nota).toHaveClass('bg-info-claro', 'text-info-d')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  test('Alert error y aviso siguen con su rol', () => {
    render(
      <>
        <Alert>Error</Alert>
        <Alert tone="aviso">Aviso</Alert>
      </>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Error')
    expect(screen.getByRole('status')).toHaveTextContent('Aviso')
  })

  test('un tono desconocido se ve y se anuncia como aviso', () => {
    render(<Alert tone="warn">Se excluyen los conceptos inactivos.</Alert>)
    expect(screen.getByRole('status')).toHaveClass('bg-amber-50')
  })
})

test('formatearDias', () => {
  expect(formatearDias(1)).toBe('1 día')
  expect(formatearDias(47)).toBe('47 días')
  expect(formatearDias(0)).toBe('0 días')
  expect(formatearDias(null)).toBe('—')
  expect(formatearDias(1500)).toBe('1.500 días')
})
test('formatearFechaISOLarga sin fecha devuelve —', () => { expect(formatearFechaISOLarga(null)).toBe('—') })
