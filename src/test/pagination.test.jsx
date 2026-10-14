import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Pagination } from '../components/ui'
import { expectAccesible } from './axe'

describe('Pagination', () => {
  test('no dibuja nada sin resultados', () => {
    const { container } = render(<Pagination total={0} limit={20} offset={0} onChange={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  test('primera página: resumen, "Anterior" deshabilitado y "Siguiente" pide el desplazamiento 20', async () => {
    const onChange = vi.fn()
    render(<Pagination total={45} limit={20} offset={0} onChange={onChange} noun="registros" />)
    expect(screen.getByRole('status')).toHaveTextContent('Mostrando 1–20 de 45 registros · Página 1 de 3')
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(onChange).toHaveBeenCalledWith(20)
  })

  test('última página: el rango se recorta al total y "Siguiente" queda deshabilitado', async () => {
    const onChange = vi.fn()
    render(<Pagination total={45} limit={20} offset={40} onChange={onChange} />)
    expect(screen.getByRole('status')).toHaveTextContent('Mostrando 41–45 de 45')
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Anterior' }))
    expect(onChange).toHaveBeenCalledWith(20)
  })

  test('con un solo resultado usa el singular', () => {
    render(<Pagination total={1} limit={20} offset={0} onChange={() => {}} noun="obligaciones" nounSingular="obligación" />)
    expect(screen.getByRole('status')).toHaveTextContent('Mostrando 1–1 de 1 obligación · Página 1 de 1')
  })

  test('cargando deshabilita ambos botones y es accesible', async () => {
    const { container } = render(<Pagination total={45} limit={20} offset={20} onChange={() => {}} loading />)
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
    await expectAccesible(container)
  })
})
