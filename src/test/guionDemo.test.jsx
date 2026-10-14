// Ejecuta el recorrido de docs/GUION_DEMO.md contra la API simulada. Si esta prueba falla, el guion
// de la demostración dejó de ser cierto y hay que corregir el código o el guion.
// "Escribir la dirección en la barra" es una recarga completa de la página: se simula desmontando y
// volviendo a montar la app (la sesión y los datos ficticios sobreviven, como en el navegador).
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ultimoCorreo } from '../mocks/db'
import { renderApp } from './renderApp'

const boton = (nombre) => screen.getByRole('button', { name: nombre })
const menuPrincipal = () => screen.getByRole('navigation', { name: 'Navegación principal' })
const recargar = (ruta) => {
  cleanup()
  renderApp(ruta, null)
}

async function iniciarSesion(correo, clave) {
  await userEvent.type(await screen.findByLabelText('Correo electrónico'), correo)
  await userEvent.type(screen.getByLabelText('Contraseña'), clave)
  await userEvent.click(boton('Iniciar sesión'))
}

async function cerrarSesion(nombreEnMenu) {
  await userEvent.click(screen.getByRole('button', { name: nombreEnMenu }))
  await userEvent.click(screen.getByRole('menuitem', { name: /cerrar sesión/i }))
  await screen.findByRole('button', { name: 'Iniciar sesión' })
}

test('recorrido completo del guion: usuarios, parametrización, auditoría, primer ingreso, roles y extracción', async () => {
  renderApp('/login', null)

  // 0:00 validaciones y credenciales incorrectas
  await userEvent.click(await screen.findByRole('button', { name: 'Iniciar sesión' }))
  expect(screen.getByText('Ingresa tu correo electrónico.')).toBeInTheDocument()
  await iniciarSesion('rmartinez@example.com', 'ClaveMala1')
  expect(await screen.findByRole('alert')).toHaveTextContent('Usuario o contraseña incorrectos.')

  // 1:00 usuario desactivado
  await userEvent.clear(screen.getByLabelText('Correo electrónico'))
  await userEvent.type(screen.getByLabelText('Correo electrónico'), 'avargas@example.com')
  await userEvent.type(screen.getByLabelText('Contraseña'), 'Cartera123')
  await userEvent.click(boton('Iniciar sesión'))
  expect(await screen.findByRole('alert')).toHaveTextContent(/desactivado/i)

  // 1:30 administrador con el menú completo
  await userEvent.clear(screen.getByLabelText('Correo electrónico'))
  await userEvent.type(screen.getByLabelText('Correo electrónico'), 'rmartinez@example.com')
  await userEvent.type(screen.getByLabelText('Contraseña'), 'Admin12345')
  await userEvent.click(boton('Iniciar sesión'))
  expect(await screen.findByRole('heading', { name: 'Bienvenido, Rosa' })).toBeInTheDocument()
  expect(within(menuPrincipal()).getAllByRole('link')).toHaveLength(5)

  // 2:00 crear usuario: la contraseña temporal se envía por correo (simulado)
  await userEvent.click(within(menuPrincipal()).getByRole('link', { name: /gestión de usuarios/i }))
  await screen.findByText('Juan Pérez')
  await userEvent.click(boton('Crear usuario'))
  await userEvent.type(screen.getByLabelText('Nombre completo'), 'Laura Díaz')
  await userEvent.type(screen.getByLabelText('Correo corporativo'), 'ldiaz@example.com')
  await userEvent.click(screen.getByRole('dialog').querySelector('button[type=submit]'))
  expect(await screen.findByText(/la contraseña temporal se envió a su correo/i)).toBeInTheDocument()
  expect(screen.queryByRole('dialog', { name: 'Usuario creado' })).not.toBeInTheDocument()
  expect(ultimoCorreo().para).toBe('ldiaz@example.com')

  // 3:00 editar y desactivar con confirmación
  await userEvent.click(screen.getByRole('button', { name: 'Editar a Carlos Sánchez' }))
  const nombre = screen.getByLabelText('Nombre completo')
  await userEvent.clear(nombre)
  await userEvent.type(nombre, 'Carlos A. Sánchez')
  await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
  await screen.findByText('Usuario actualizado correctamente.')
  await userEvent.click(screen.getByRole('switch', { name: 'Usuario Diana Niño activo' }))
  await userEvent.click(screen.getByRole('button', { name: 'Desactivar' }))
  await screen.findByText('Usuario «Diana Niño» desactivado.')

  // 4:00 parametrización: búsqueda, validaciones, código repetido, alta, desactivar y grupos
  await userEvent.click(within(menuPrincipal()).getByRole('link', { name: /parametrización de conceptos/i }))
  await screen.findByText('CUOTA FINANCIACION ENERGIA')
  const buscar = screen.getByLabelText('Buscar concepto por código o descripción')
  await userEvent.type(buscar, 'interes')
  expect(screen.queryByText('CUOTA FINANCIACION ENERGIA')).not.toBeInTheDocument()
  expect(screen.getByText('INTERES FINANCIACION ENERGIA')).toBeInTheDocument()
  await userEvent.clear(buscar)
  await userEvent.click(boton('Agregar concepto'))
  const alta = within(screen.getByRole('dialog'))
  await userEvent.click(alta.getByRole('button', { name: 'Agregar concepto' }))
  expect(await alta.findByText('Ingresa el código del concepto.')).toBeInTheDocument()
  await userEvent.type(alta.getByLabelText('Código de concepto'), '30')
  await userEvent.type(alta.getByLabelText('Descripción'), 'CONCEPTO DUPLICADO')
  await userEvent.click(alta.getByRole('button', { name: 'Agregar concepto' }))
  expect(await alta.findByText('El código de concepto ya existe.')).toBeInTheDocument()
  await userEvent.clear(alta.getByLabelText('Código de concepto'))
  await userEvent.type(alta.getByLabelText('Código de concepto'), '8888')
  await userEvent.clear(alta.getByLabelText('Descripción'))
  await userEvent.type(alta.getByLabelText('Descripción'), 'CONCEPTO DEMO')
  await userEvent.click(alta.getByRole('button', { name: 'Agregar concepto' }))
  expect(await screen.findByText('CONCEPTO DEMO')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('switch', { name: 'Concepto 9001 activo' }))
  await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Desactivar' }))
  expect(await screen.findByRole('switch', { name: 'Concepto 9001 activo' })).not.toBeChecked()
  await userEvent.click(screen.getByRole('button', { name: /grupos de conceptos/i }))
  expect(await screen.findByText('Energía financiada')).toBeInTheDocument()

  // 6:00 auditoría: cierre manual y por inactividad; acciones del sistema
  await userEvent.click(within(menuPrincipal()).getByRole('link', { name: /auditoría/i }))
  const registros = await screen.findByRole('table', { name: 'Registros de auditoría' })
  await userEvent.selectOptions(screen.getByLabelText('Módulo'), 'Seguridad')
  await userEvent.selectOptions(screen.getByLabelText('Tipo de acción'), 'cierre_sesion')
  await userEvent.click(boton('Filtrar'))
  expect(await within(registros).findByText('Cierre por inactividad')).toBeInTheDocument()
  expect(within(registros).getAllByText('Cierre manual').length).toBeGreaterThan(0)
  await userEvent.click(boton('Limpiar filtros'))
  await userEvent.selectOptions(screen.getByLabelText('Tipo de acción'), 'calculo')
  await userEvent.click(boton('Filtrar'))
  expect((await within(registros).findAllByText('Sistema')).length).toBeGreaterThan(0)

  // 7:00 cierre manual
  await cerrarSesion(/^rosa martínez/i)
  expect(screen.getByText('Sesión cerrada correctamente.')).toBeInTheDocument()

  // 7:20 primer ingreso: la contraseña temporal obliga a cambiarla, también al "escribir la dirección"
  await iniciarSesion('ldiaz@example.com', 'Temporal123')
  expect(await screen.findByRole('heading', { name: 'Debes cambiar tu contraseña' })).toBeInTheDocument()
  recargar('/usuarios') // escribir localhost:5173/usuarios en la barra
  expect(await screen.findByRole('heading', { name: 'Debes cambiar tu contraseña' })).toBeInTheDocument()

  // 8:00 cambio obligatorio
  await userEvent.type(screen.getByLabelText('Contraseña temporal'), 'Temporal123')
  await userEvent.type(screen.getByLabelText('Nueva contraseña'), 'Demo12345')
  await userEvent.type(screen.getByLabelText('Confirmar nueva contraseña'), 'Demo12345')
  await userEvent.click(boton('Guardar y continuar'))
  expect(await screen.findByRole('heading', { name: 'Bienvenido, Laura' })).toBeInTheDocument()

  // 9:00 roles: el Analista ve dos opciones y, escribiendo la dirección, "Acceso restringido"
  expect(within(menuPrincipal()).getAllByRole('link')).toHaveLength(2)
  recargar('/usuarios')
  expect(await screen.findByRole('heading', { name: 'Acceso restringido' })).toBeInTheDocument()

  // 9:30 extracción (Laura, Analista): corte en BORRADOR con obligaciones consolidadas
  await userEvent.click(within(menuPrincipal()).getByRole('link', { name: /extracción de cartera/i }))
  expect(await screen.findByText('Corte #2 al 30/09/2026')).toBeInTheDocument()
  expect(screen.getByText('BORRADOR')).toBeInTheDocument()
  expect(await screen.findByText('TITULAR FICTICIO 01')).toBeInTheDocument()
  expect(screen.getByText('******0001')).toBeInTheDocument()

  // 10:30 fecha futura y borrador de otra fecha
  const fecha = screen.getByLabelText('Fecha de corte')
  fireEvent.change(fecha, { target: { value: '2099-01-01' } })
  await userEvent.click(boton('Iniciar extracción'))
  expect(await screen.findByText('La fecha de corte no puede ser futura.')).toBeInTheDocument()
  fireEvent.change(fecha, { target: { value: '2026-10-05' } })
  await userEvent.click(boton('Iniciar extracción'))
  expect(
    await screen.findByText('Ya existe un corte en BORRADOR con fecha 2026-09-30. Elimínelo o complételo antes de generar otro.'),
  ).toBeInTheDocument()

  // 11:30 regenerar el borrador del 30/09 con un grupo
  fireEvent.change(fecha, { target: { value: '2026-09-30' } })
  await userEvent.selectOptions(screen.getByLabelText('Grupo de conceptos de energía'), 'Energía financiada')
  await userEvent.click(boton('Iniciar extracción'))
  expect(await screen.findByText(/Corte de cartera generado correctamente/i)).toBeInTheDocument()

  // 12:30 validar y 13:30 registrar el envío
  await userEvent.click(await screen.findByRole('button', { name: 'Validar corte' }))
  expect(await screen.findByText('VALIDADO')).toBeInTheDocument()
  await userEvent.click(boton('Registrar envío a TransUnion'))
  const envio = within(screen.getByRole('dialog', { name: 'Registrar envío a TransUnion' }))
  await userEvent.click(envio.getByRole('button', { name: 'Confirmar envío' }))
  expect(await screen.findByText('ENVIADO')).toBeInTheDocument()

  // los datos creados en la demo siguen ahí tras las recargas: Laura entra con su nueva contraseña
  await cerrarSesion(/^laura díaz/i)
  await iniciarSesion('ldiaz@example.com', 'Demo12345')
  expect(await screen.findByRole('heading', { name: 'Bienvenido, Laura' })).toBeInTheDocument()
}, 120000) // recorrido largo: necesita más margen que una prueba normal

test('los datos ficticios de la demostración sobreviven a una recarga de la página', async () => {
  const { createUser } = await import('../features/users/usersService')
  const { login } = await import('../features/auth/authService')
  await login('rmartinez@example.com', 'Admin12345')
  await createUser({ nombre: 'Laura Díaz', correo: 'ldiaz@example.com', rol: 'Analista de Cartera' })

  vi.resetModules() // equivale a recargar la página: la base en memoria se vuelve a leer
  const { db } = await import('../mocks/db')
  expect(db.usuarios.map((u) => u.email)).toContain('ldiaz@example.com')
  expect(db.siguienteId).toBe(9)
})
