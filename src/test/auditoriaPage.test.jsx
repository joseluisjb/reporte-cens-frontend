// Pantalla de auditoría (RF30): lista, filtros, paginación, errores y acceso solo para el Administrador.
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { ENDPOINTS } from '../lib/api/endpoints'
import { API_URL } from '../lib/config'
import { TOTAL_REGISTROS_AUDITORIA } from '../mocks/datos/auditoria'
import { server } from '../mocks/server'
import { ANALISTA, renderApp, renderConSesion } from './renderApp'

const abrir = async () => {
  await renderConSesion('/auditoria')
  await screen.findByRole('table', { name: 'Registros de auditoría' })
}
const filas = () => within(screen.getByRole('table', { name: 'Registros de auditoría' })).getAllByRole('row').slice(1) // sin el encabezado
const filtrar = () => userEvent.click(screen.getByRole('button', { name: 'Filtrar' }))

describe('Log de auditoría', () => {
  test('el Administrador ve la primera página, más reciente primero, con rol y detalle', async () => {
    await abrir()
    expect(screen.getByRole('heading', { name: 'Log de Auditoría del Sistema' })).toBeInTheDocument()
    expect(filas()).toHaveLength(20)
    expect(screen.getByText(`Mostrando 1–20 de ${TOTAL_REGISTROS_AUDITORIA} registros · Página 1 de 3`)).toBeInTheDocument()
    expect(within(filas()[0]).getByText('09/10/2026 17:20')).toBeInTheDocument() // el más reciente
    expect(within(filas()[0]).getByText('Cierre de sesión')).toBeInTheDocument()
    expect(within(filas()[0]).getByText('Administrador')).toBeInTheDocument()
  })

  test('la paginación avanza y retrocede', async () => {
    await abrir()
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    await screen.findByText(/Mostrando 21–40/)
    expect(filas()).toHaveLength(20)
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    await screen.findByText(new RegExp(`Mostrando 41–${TOTAL_REGISTROS_AUDITORIA}`))
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Anterior' }))
    await screen.findByText(/Mostrando 21–40/)
  })

  test('filtra por módulo y tipo de acción, vuelve a la página 1 y "Limpiar filtros" restaura todo', async () => {
    await abrir()
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    await screen.findByText(/Mostrando 21–40/)
    await userEvent.selectOptions(screen.getByLabelText('Módulo'), 'Usuarios')
    await filtrar()
    await screen.findByText(/Mostrando 1–\d+ de \d+ registros/)
    expect(filas().length).toBeGreaterThan(0)
    for (const f of filas()) expect(within(f).getAllByText('Usuarios').length).toBeGreaterThan(0)
    await userEvent.selectOptions(screen.getByLabelText('Tipo de acción'), 'desactivacion')
    await filtrar()
    await screen.findByText(/Mostrando 1–1 de 1 registro ·/)
    await userEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    await screen.findByText(new RegExp(`de ${TOTAL_REGISTROS_AUDITORIA} registros`))
    expect(screen.getByLabelText('Módulo')).toHaveValue('')
  })

  test('las acciones del sistema se muestran como "Sistema" y sin etiqueta de rol', async () => {
    await abrir()
    await userEvent.selectOptions(screen.getByLabelText('Tipo de acción'), 'calculo')
    await filtrar()
    await screen.findByText(/Mostrando 1–\d+ de \d+ registros/)
    const delSistema = filas().filter((f) => within(f).queryByText('Sistema'))
    expect(delSistema).toHaveLength(2)
    for (const f of delSistema) {
      expect(within(f).queryByText('Administrador')).not.toBeInTheDocument()
      expect(within(f).queryByText('Analista de Cartera')).not.toBeInTheDocument()
      expect(within(f).getByText('Actualización mensual')).toBeInTheDocument()
    }
  })

  test('el filtro de usuario se llena con los usuarios del sistema', async () => {
    await abrir()
    const select = screen.getByLabelText('Usuario')
    await within(select).findByRole('option', { name: 'Juan Pérez' })
    await userEvent.selectOptions(select, 'Juan Pérez')
    await filtrar()
    await screen.findByText(/de \d+ registros/)
    for (const f of filas()) expect(within(f).getByText('Juan Pérez')).toBeInTheDocument()
  })

  test('un rango de fechas con la final anterior a la inicial se rechaza antes de pedir nada y enfoca el campo', async () => {
    await abrir()
    await userEvent.type(screen.getByLabelText('Desde'), '2026-10-05')
    await userEvent.type(screen.getByLabelText('Hasta'), '2026-10-01')
    await filtrar()
    expect(await screen.findByText('La fecha final no puede ser anterior a la inicial.')).toBeInTheDocument()
    expect(screen.getByLabelText('Hasta')).toHaveFocus()
    expect(filas()).toHaveLength(20) // la tabla no cambió
  })

  test('un rango de fechas válido filtra (inclusivo) y sin coincidencias muestra el aviso vacío', async () => {
    await abrir()
    await userEvent.type(screen.getByLabelText('Desde'), '2026-09-29')
    await userEvent.type(screen.getByLabelText('Hasta'), '2026-09-29')
    await filtrar()
    await screen.findByText(/Mostrando 1–\d+ de \d+ registros/)
    for (const f of filas()) expect(within(f).getByText(/^29\/09\/2026/)).toBeInTheDocument()
    await userEvent.clear(screen.getByLabelText('Desde'))
    await userEvent.clear(screen.getByLabelText('Hasta'))
    await userEvent.type(screen.getByLabelText('Desde'), '2030-01-01')
    await filtrar()
    expect(await screen.findByText('No hay registros que coincidan con los filtros.')).toBeInTheDocument()
  })

  test('si el servidor rechaza un filtro, el error sale en el campo', async () => {
    await abrir()
    server.use(http.get(`${API_URL}${ENDPOINTS.auditoria}`, () => HttpResponse.json({ modulo: ['Módulo no válido.'] }, { status: 400 })))
    await userEvent.selectOptions(screen.getByLabelText('Módulo'), 'Usuarios')
    await filtrar()
    expect(await screen.findByText('Módulo no válido.')).toBeInTheDocument()
    expect(screen.getByLabelText('Módulo')).toHaveFocus()
  })

  test('si falla la carga muestra el error con "Reintentar" y no cierra la sesión', async () => {
    server.use(http.get(`${API_URL}${ENDPOINTS.auditoria}`, () => HttpResponse.json({ detail: 'x' }, { status: 500 }), { once: true }))
    await renderConSesion('/auditoria')
    expect(await screen.findByText('Ocurrió un error en el servidor. Intenta de nuevo más tarde.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await screen.findByRole('table', { name: 'Registros de auditoría' })
    expect(screen.queryByText('Ocurrió un error en el servidor. Intenta de nuevo más tarde.')).not.toBeInTheDocument()
  })

  test('el Analista ve "Acceso restringido" (y la sección no aparece en su menú)', async () => {
    renderApp('/auditoria', ANALISTA)
    expect(await screen.findByRole('heading', { name: 'Acceso restringido' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Auditoría/ })).not.toBeInTheDocument()
  })
})
