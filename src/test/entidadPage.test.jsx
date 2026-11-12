// Pantalla 15 · Datos de la Entidad ante TransUnion (RF57). «Listo cuando» de la ficha:
//   - el Administrador guarda 001 / 123 / A1B2C3 → se guarda y los archivos nuevos salen aptos;
//   - 12 en el tipo de entidad → error en el campo (y 400 del backend);
//   - el Analista intenta el PUT → 403 en español, y la ruta lo devuelve al inicio.
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { login } from '../features/auth/authService'
import { MSG_ENTIDAD } from '../features/entity/entityValidation'
import { getEntity, updateEntity } from '../features/entity/entityService'
import { API_URL } from '../lib/config'
import { server } from '../mocks/server'
import { renderConSesion } from './renderApp'

const TITULO = 'Datos de la Entidad ante TransUnion'

async function abrirComoAdmin() {
  await renderConSesion('/entidad')
  await screen.findByRole('button', { name: 'Guardar datos' })
}

async function escribir(etiqueta, valor) {
  const campo = screen.getByLabelText(etiqueta)
  await userEvent.clear(campo)
  if (valor) await userEvent.type(campo, valor)
}

describe('pantalla 15 · Datos de la Entidad (Administrador)', () => {
  test('con el marcador avisa que los archivos salen no aptos y muestra el nombre del próximo archivo', async () => {
    await abrirComoAdmin()
    expect(screen.getByRole('heading', { name: TITULO })).toBeInTheDocument()
    expect(screen.getByText(/TransUnion aún no asigna los datos de la entidad/)).toHaveTextContent(/no aptos para envío/)
    expect(screen.getByLabelText('Tipo de entidad')).toHaveValue('XXX')
    expect(screen.getByLabelText('Código de entidad')).toHaveValue('XXX')
    expect(screen.getByLabelText('Código de sucursal')).toHaveValue('XXXXXX')
    expect(screen.getByLabelText('Código de sucursal')).toHaveAccessibleDescription(/6 caracteres/)
    expect(await screen.findByText('SSRXXXXXX20260930')).toBeInTheDocument() // prefijo + último corte
    expect(screen.queryByText('por definir')).not.toBeInTheDocument()
  })

  test('guarda 001 / 123 / A1B2C3: el aviso pasa a «aptos» y cambia el nombre del archivo', async () => {
    await abrirComoAdmin()
    await escribir('Tipo de entidad', '001')
    await escribir('Código de entidad', '123')
    await escribir('Código de sucursal', 'a1b2c3') // se envía en mayúsculas
    await userEvent.click(screen.getByRole('button', { name: 'Guardar datos' }))
    expect(await screen.findByText('Datos guardados: los archivos nuevos saldrán aptos para envío.')).toBeInTheDocument()
    expect(await screen.findByRole('note')).toHaveTextContent('Los datos están completos: los archivos nuevos salen aptos para envío.')
    expect(screen.getByLabelText('Código de sucursal')).toHaveValue('A1B2C3')
    expect(screen.getByText('SSR00112320260930')).toBeInTheDocument()
    expect(screen.getByText(/Última actualización: Rosa Martínez/)).toBeInTheDocument()
  })

  test('12 en el tipo de entidad da error en el campo y no se envía', async () => {
    await abrirComoAdmin()
    await escribir('Tipo de entidad', '12')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar datos' }))
    const tipo = screen.getByLabelText('Tipo de entidad')
    expect(tipo).toHaveAttribute('aria-invalid', 'true')
    expect(tipo).toHaveAccessibleDescription(expect.stringContaining(MSG_ENTIDAD.tipoEntidad))
    expect(tipo).toHaveFocus()
    expect(screen.getByText(/TransUnion aún no asigna/)).toBeInTheDocument() // no cambió
  })

  test('el error del servidor (400) se muestra en su campo', async () => {
    server.use(
      http.put(`${API_URL}/entidad/`, () => HttpResponse.json({ codigo_sucursal: ['El código de sucursal no existe en TransUnion.'] }, { status: 400 })),
    )
    await abrirComoAdmin()
    await escribir('Código de sucursal', 'ZZZ999')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar datos' }))
    const sucursal = screen.getByLabelText('Código de sucursal')
    expect(await within(sucursal.parentElement).findByText('El código de sucursal no existe en TransUnion.')).toBeInTheDocument()
    expect(sucursal).toHaveAttribute('aria-invalid', 'true')
  })

  test('«Restablecer datos provisionales» deja XXX, XXX y XXXXXX', async () => {
    await abrirComoAdmin()
    await escribir('Tipo de entidad', '001')
    await escribir('Código de entidad', '123')
    await escribir('Código de sucursal', 'A1B2C3')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar datos' }))
    await screen.findByRole('note')
    await userEvent.click(screen.getByRole('button', { name: 'Restablecer datos provisionales' }))
    const dialogo = await screen.findByRole('alertdialog', { name: 'Restablecer datos provisionales' })
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Restablecer datos provisionales' }))
    expect(await screen.findByText('Los datos de la entidad son provisionales: los archivos saldrán no aptos para envío.')).toBeInTheDocument()
    expect(screen.getByLabelText('Tipo de entidad')).toHaveValue('XXX')
    expect(screen.getByLabelText('Código de entidad')).toHaveValue('XXX')
    expect(screen.getByLabelText('Código de sucursal')).toHaveValue('XXXXXX')
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  test('«Restablecer datos provisionales» con el marcador ya guardado deja los botones activos y limpia lo escrito', async () => {
    await abrirComoAdmin()
    await escribir('Tipo de entidad', '001')
    await userEvent.click(screen.getByRole('button', { name: 'Restablecer datos provisionales' }))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Restablecer datos provisionales' }))
    await screen.findByText('Los datos de la entidad son provisionales: los archivos saldrán no aptos para envío.')
    expect(screen.getByLabelText('Tipo de entidad')).toHaveValue('XXX')
    expect(screen.getByRole('button', { name: 'Guardar datos' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Restablecer datos provisionales' })).toBeEnabled()
  })

  test('cancelar la confirmación no cambia nada', async () => {
    await abrirComoAdmin()
    await userEvent.click(screen.getByRole('button', { name: 'Restablecer datos provisionales' }))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Tipo de entidad')).toHaveValue('XXX')
  })

  test('al guardar, el campo muestra lo guardado (en mayúsculas) y el foco no se pierde', async () => {
    await abrirComoAdmin()
    await escribir('Código de sucursal', 'xxxxxx')
    const guardar = screen.getByRole('button', { name: 'Guardar datos' })
    await userEvent.click(guardar)
    await screen.findByText('Datos guardados: todavía hay datos provisionales, los archivos saldrán no aptos para envío.')
    expect(screen.getByLabelText('Código de sucursal')).toHaveValue('XXXXXX')
    expect(screen.getByRole('button', { name: 'Guardar datos' })).toBe(guardar) // el mismo botón: no se remontó
  })

  test('si la carga falla muestra el error y permite reintentar', async () => {
    let fallar = true
    server.use(
      http.get(`${API_URL}/entidad/`, () => (fallar ? HttpResponse.json({ detail: 'Servicio no disponible.' }, { status: 503 }) : undefined)),
    )
    await renderConSesion('/entidad')
    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    fallar = false
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('button', { name: 'Guardar datos' })).toBeInTheDocument()
  })
})

describe('RF57 · reglas del backend simulado', () => {
  test('el Administrador guarda 001 / 123 / A1B2C3 y la entidad queda sin marcador', async () => {
    await login('rmartinez@example.com', 'Admin12345')
    const guardada = await updateEntity({ tipoEntidad: '001', codigoEntidad: '123', codigoSucursal: 'A1B2C3' })
    expect(guardada).toMatchObject({ conMarcador: false, prefijoArchivo: 'SSR001123', actualizadoPor: 'Rosa Martínez' })
    expect(guardada.fechaActualizacion).toBeInstanceOf(Date)
    expect(await getEntity()).toMatchObject({ tipoEntidad: '001', codigoSucursal: 'A1B2C3' })
  })

  test('12 en el tipo de entidad → 400 con el mensaje en el campo', async () => {
    await login('rmartinez@example.com', 'Admin12345')
    await expect(updateEntity({ tipoEntidad: '12', codigoEntidad: '123', codigoSucursal: 'A1B2C3' })).rejects.toMatchObject({
      status: 400,
      fieldErrors: { tipo_entidad: MSG_ENTIDAD.tipoEntidad },
    })
  })

  test('el Analista intenta el PUT → 403 en español', async () => {
    await login('jperez@example.com', 'Analista123')
    await expect(updateEntity({ tipoEntidad: '001', codigoEntidad: '123', codigoSucursal: 'A1B2C3' })).rejects.toMatchObject({
      status: 403,
      message: 'No tienes permiso para realizar esta acción.',
    })
  })
})
