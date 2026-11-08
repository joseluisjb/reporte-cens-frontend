// Componentes compartidos de TransUnion (features/transunion) y las piezas de UI que usan.
import { render, screen } from '@testing-library/react'
import { Alert, Badge, PorConfirmar } from '../components/ui'
import CandadoCerrada from '../features/transunion/CandadoCerrada'
import { ESTADOS_OBLIGACION, esEstadoDeCierre } from '../features/transunion/catalogosTU'
import CuotasMoraBadge from '../features/transunion/CuotasMoraBadge'
import EdadMoraBadge from '../features/transunion/EdadMoraBadge'
import EstadoBadge from '../features/transunion/EstadoBadge'
import RfTag from '../features/transunion/RfTag'
import { formatearDias } from '../lib/format'

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
    ['12', 'Ley 1564 de 2012', 'bg-slate-100'],
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
})

describe('EdadMoraBadge', () => {
  test('muestra código, descripción y los días de mora', () => {
    const { container } = render(<EdadMoraBadge codigo="01" dias={47} />)
    expect(container).toHaveTextContent('01 - Mora 30')
    expect(screen.getByText('47 días de mora')).toBeInTheDocument()
  })

  test('sin días no muestra la segunda línea', () => {
    const { container } = render(<EdadMoraBadge codigo="00" />)
    expect(container).toHaveTextContent('00 - Normal')
    expect(container).not.toHaveTextContent('de mora')
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
})

describe('CandadoCerrada', () => {
  test('anuncia «Obligación cerrada» al lector de pantalla', () => {
    render(<CandadoCerrada />)
    expect(screen.getByText('Obligación cerrada')).toHaveClass('sr-only')
  })

  test('02 y 07 son estados de cierre; los demás no', () => {
    expect(['02', '07'].every(esEstadoDeCierre)).toBe(true)
    expect(['01', '03', '04', '06', '08', '10', '11', '12'].some(esEstadoDeCierre)).toBe(false)
  })
})

test('RfTag muestra el requerimiento', () => {
  render(<RfTag>RF15</RfTag>)
  expect(screen.getByText('RF15')).toBeInTheDocument()
})

describe('PorConfirmar', () => {
  test('por defecto dice «por confirmar»', () => {
    render(<PorConfirmar />)
    expect(screen.getByText('por confirmar')).toHaveClass('bg-aviso-claro', 'text-aviso')
  })

  test('acepta otro texto', () => {
    render(<PorConfirmar>pendiente de CENS</PorConfirmar>)
    expect(screen.getByText('pendiente de CENS')).toBeInTheDocument()
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
})

test('formatearDias', () => {
  expect(formatearDias(1)).toBe('1 día')
  expect(formatearDias(47)).toBe('47 días')
  expect(formatearDias(0)).toBe('0 días')
  expect(formatearDias(null)).toBe('—')
})
